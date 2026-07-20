"""API routes for the Urban Air Quality Intelligence Platform."""
import os
import io
import asyncio
import time
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional
import pandas as pd

from db import db
from models import (LoginRequest, LoginResponse, DashboardResponse,
                    WeatherData, AirQuality, Pollutants, Location,
                    PredictionLog, UploadedDataset, Station)
from services import openweather as ow
from services.aqi_calc import compute_aqi, aqi_category, health_risk
from services.cities import INDIAN_CITIES, get_city
from services.recommendations import generate_recommendations, build_alerts
from services.auth import create_token, require_admin
from services import forecast as forecast_svc
from services import source_attribution as sa
from services import grid as grid_svc
from services import enforcement as enf
from services import health_advisory as hadv
from services import historical as hist_svc
from ml import predictor

router = APIRouter(prefix="/api")

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

print("ADMIN_EMAIL =", ADMIN_EMAIL)
print("ADMIN_PASSWORD =", ADMIN_PASSWORD)

# ---------- Auth ----------
@router.post("/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    if req.email.strip().lower() != ADMIN_EMAIL.lower() or req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(req.email)
    return LoginResponse(access_token=token, email=req.email)


@router.get("/auth/me")
async def me(email: str = Depends(require_admin)):
    return {"email": email}


# ---------- Cities ----------
@router.get("/cities")
async def list_cities():
    return {"cities": INDIAN_CITIES}


@router.get("/geocode")
async def geocode(city: Optional[str] = None,
                  lat: Optional[float] = None,
                  lon: Optional[float] = None):
    if city:
        got = await ow.forward_geocode(city)
        if not got:
            raise HTTPException(404, "City not found")
        return got
    if lat is not None and lon is not None:
        info = await ow.reverse_geocode(lat, lon)
        return {**info, "lat": lat, "lon": lon}
    raise HTTPException(400, "Provide city or lat/lon")


# ---------- Weather / AQ ----------
@router.get("/current-weather")
async def current_weather(lat: float, lon: float):
    return await ow.fetch_weather(lat, lon)


@router.get("/current-air-quality")
async def current_air_quality(lat: float, lon: float):
    pol = await ow.fetch_air_pollution(lat, lon)
    aqi, dom = compute_aqi(pol)
    return {
        "aqi": aqi,
        "category": aqi_category(aqi),
        "dominant_pollutant": dom,
        "pollutants": pol,
        "station": "OpenWeather Air Pollution API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------- Dashboard (composite) ----------
async def _log_prediction(city: str, lat: float, lon: float, features: dict,
                          predicted: int, category: str, confidence: float):
    log = PredictionLog(city=city, latitude=lat, longitude=lon,
                        input_features={k: float(features.get(k, 0)) for k in predictor.feature_names()},
                        predicted_aqi=predicted, predicted_category=category,
                        confidence=confidence)
    await db.prediction_logs.insert_one(log.model_dump())


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(lat: float, lon: float, city: Optional[str] = None,
                    state: Optional[str] = None):
    weather_task = ow.fetch_weather(lat, lon)
    pol_task = ow.fetch_air_pollution(lat, lon)
    loc_task = ow.reverse_geocode(lat, lon) if not city else asyncio.sleep(0, result={"city": city, "state": state, "country": "India"})
    weather, pol, loc_info = await asyncio.gather(weather_task, pol_task, loc_task)

    aqi, dom = compute_aqi(pol)
    features = {**pol, **weather}
    predicted, confidence = predictor.predict_aqi(features)
    if predicted <= 0:
        # Model missing – fallback: current AQI
        predicted = aqi
        confidence = 0.5

    resolved_city = city or loc_info.get("city", "Unknown")
    recs = generate_recommendations(max(aqi, predicted), dom, pol, weather)
    alerts = build_alerts(aqi, predicted, resolved_city)

    # SIH: source attribution + health advisory + 24/48/72h forecast summary
    attribution = sa.attribute(pol, weather)
    advisory = hadv.advisory_for(max(aqi, predicted))
    fc = forecast_svc.horizon_forecasts({**pol, **weather})
    forecast_summary = {k: v for k, v in fc.items() if k in ("h24", "h48", "h72")}
    # Extra alerts driven by forecast horizon
    if fc["h24"]["peak_aqi"] > aqi + 40:
        alerts.append({
            "level": "warning",
            "title": "24h AQI Spike Forecast",
            "message": f"Model expects a peak of {fc['h24']['peak_aqi']} AQI in the next 24h in {resolved_city}.",
        })
    if fc["h72"]["predicted_aqi"] > 300:
        alerts.append({
            "level": "critical",
            "title": "72h Very Poor Forecast",
            "message": f"{resolved_city} 72h forecast in the {fc['h72']['predicted_category']} category.",
        })

    # Persist history
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.aqi_history.insert_one({
        "city": resolved_city, "lat": lat, "lon": lon,
        "aqi": aqi, "category": aqi_category(aqi),
        "dominant": dom, "pollutants": pol, "timestamp": now_iso,
    })
    await db.weather_history.insert_one({
        "city": resolved_city, "lat": lat, "lon": lon,
        **weather, "timestamp": now_iso,
    })
    await _log_prediction(resolved_city, lat, lon, features, predicted,
                          aqi_category(predicted), confidence)

    return DashboardResponse(
        location=Location(city=resolved_city, state=loc_info.get("state") or state,
                          country=loc_info.get("country", "India"),
                          latitude=lat, longitude=lon),
        weather=WeatherData(**weather),
        air_quality=AirQuality(aqi=aqi, category=aqi_category(aqi),
                               dominant_pollutant=dom,
                               pollutants=Pollutants(**pol),
                               timestamp=now_iso),
        predicted_aqi=predicted,
        predicted_category=aqi_category(predicted),
        prediction_confidence=confidence,
        health_risk=health_risk(max(aqi, predicted)),
        recommendations=recs,
        alerts=alerts,
        source_attribution=attribution,
        health_advisory=advisory,
        forecast_summary=forecast_summary,
    )


# ---------- Predict endpoint ----------
@router.post("/predict")
async def predict(payload: dict):
    """Predict AQI given features. Accepts partial features (missing = 0).
    Payload keys: pm25, pm10, no2, so2, co, o3, nh3, temperature, humidity,
    pressure, wind_speed.
    """
    features = {k: float(payload.get(k, 0.0)) for k in predictor.feature_names()}
    aqi, conf = predictor.predict_aqi(features)
    return {"predicted_aqi": aqi, "predicted_category": aqi_category(aqi),
            "confidence": conf, "features": features}


# ---------- Map ----------
@router.get("/map")
async def map_data():
    """Return current AQI for every tracked Indian city (parallel fetch)."""
    async def one(c):
        try:
            pol = await ow.fetch_air_pollution(c["lat"], c["lon"])
            aqi, dom = compute_aqi(pol)
            return {
                "id": c["city"].lower(),
                "name": c["city"],
                "state": c["state"],
                "city": c["city"],
                "latitude": c["lat"],
                "longitude": c["lon"],
                "aqi": aqi,
                "category": aqi_category(aqi),
                "dominant_pollutant": dom,
                "pollutants": pol,
            }
        except Exception:
            return None

    results = await asyncio.gather(*[one(c) for c in INDIAN_CITIES])
    stations = [r for r in results if r]
    hotspots = [s for s in stations if s["aqi"] > 200]
    return {"stations": stations, "hotspots": hotspots}


# ---------- Hotspots ----------
@router.get("/hotspots")
async def hotspots():
    data = await map_data()
    return {"hotspots": data["hotspots"]}


# ---------- Analytics ----------
@router.get("/analytics")
async def analytics(lat: float, lon: float, city: Optional[str] = None):
    """Return 7-day AQI history from OpenWeather, plus category & pollutant distribution."""
    end = int(time.time())
    start = end - 7 * 24 * 3600
    hist = await ow.fetch_air_pollution_history(lat, lon, start, end)

    trend = []
    pollutant_avg = {"pm25": 0.0, "pm10": 0.0, "no2": 0.0, "so2": 0.0,
                     "co": 0.0, "o3": 0.0, "nh3": 0.0}
    category_counts = {"Good": 0, "Satisfactory": 0, "Moderate": 0,
                       "Poor": 0, "Very Poor": 0, "Severe": 0}
    n = 0
    for item in hist:
        comp = item.get("components", {})
        pol = {
            "pm25": comp.get("pm2_5", 0), "pm10": comp.get("pm10", 0),
            "no2": comp.get("no2", 0), "so2": comp.get("so2", 0),
            "co": comp.get("co", 0) / 1000.0, "o3": comp.get("o3", 0),
            "nh3": comp.get("nh3", 0),
        }
        aqi, _ = compute_aqi(pol)
        ts = datetime.fromtimestamp(item.get("dt", end), tz=timezone.utc).isoformat()
        trend.append({"timestamp": ts, "aqi": aqi, **pol})
        for k in pollutant_avg:
            pollutant_avg[k] += pol[k]
        category_counts[aqi_category(aqi)] += 1
        n += 1
    if n > 0:
        for k in pollutant_avg:
            pollutant_avg[k] = round(pollutant_avg[k] / n, 2)

    # City comparison via /map
    map_res = await map_data()
    comparison = [{"city": s["name"], "aqi": s["aqi"], "category": s["category"]}
                  for s in map_res["stations"]]

    return {
        "trend": trend,
        "pollutant_avg": pollutant_avg,
        "category_distribution": category_counts,
        "city_comparison": comparison,
    }


# ---------- Recommendations (standalone) ----------
@router.get("/recommendations")
async def recommendations(lat: float, lon: float):
    weather = await ow.fetch_weather(lat, lon)
    pol = await ow.fetch_air_pollution(lat, lon)
    aqi, dom = compute_aqi(pol)
    return {"aqi": aqi, "recommendations": generate_recommendations(aqi, dom, pol, weather)}


# ---------- Admin ----------
@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), _: str = Depends(require_admin)):
    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(400, f"Invalid CSV: {e}")
    rows = len(df)
    ds = UploadedDataset(filename=file.filename or "upload.csv", rows=rows)
    doc = ds.model_dump()
    doc["columns"] = list(df.columns)
    # Store as records for retraining if columns match
    doc["preview"] = df.head(5).to_dict(orient="records")
    await db.uploaded_datasets.insert_one(doc)
    # Optionally cache the full dataframe on disk for retraining
    save_path = f"/app/datasets/{ds.id}.csv"
    with open(save_path, "wb") as f:
        f.write(raw)
    return {"id": ds.id, "filename": ds.filename, "rows": rows, "columns": doc["columns"]}


@router.get("/datasets")
async def list_datasets(_: str = Depends(require_admin)):
    cursor = db.uploaded_datasets.find({}, {"_id": 0}).sort("uploaded_at", -1)
    return {"datasets": await cursor.to_list(200)}


@router.post("/retrain")
async def retrain(_: str = Depends(require_admin)):
    from ml.train import train, FEATURES
    # Combine any uploaded datasets that have the target column "aqi" or "target"
    extra = None
    ds_cursor = db.uploaded_datasets.find({}, {"_id": 0})
    frames = []
    async for ds in ds_cursor:
        path = f"/app/datasets/{ds['id']}.csv"
        if os.path.exists(path):
            try:
                d = pd.read_csv(path)
                if all(c in d.columns for c in FEATURES) and ("target" in d.columns or "aqi" in d.columns):
                    if "target" not in d.columns:
                        d = d.rename(columns={"aqi": "target"})
                    frames.append(d[FEATURES + ["target"]])
            except Exception:
                continue
    if frames:
        extra = pd.concat(frames, ignore_index=True)
    path, rows = train(extra_df=extra)
    predictor.reload_model()
    return {"status": "ok", "model_path": path, "rows": rows}


@router.get("/prediction-logs")
async def prediction_logs(_: str = Depends(require_admin), limit: int = 50):
    cursor = db.prediction_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return {"logs": await cursor.to_list(limit)}



# ==========================================================================
# SIH extensions: forecast (24/48/72h), source attribution, grid, enforcement,
# citizen health advisory, historical intelligence, multi-city, model info.
# ==========================================================================

async def _live_features(lat: float, lon: float) -> dict:
    weather, pol = await asyncio.gather(
        ow.fetch_weather(lat, lon),
        ow.fetch_air_pollution(lat, lon),
    )
    return {"weather": weather, "pollutants": pol, "features": {**pol, **weather}}


@router.get("/forecast")
async def forecast(lat: float, lon: float):
    """24 / 48 / 72 hour AQI forecast + hourly timeline."""
    live = await _live_features(lat, lon)
    fc = forecast_svc.horizon_forecasts(live["features"])
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "current_features": live["features"],
        **fc,
    }


@router.get("/source-attribution")
async def source_attribution(lat: float, lon: float):
    """AI-based pollution source attribution."""
    live = await _live_features(lat, lon)
    result = sa.attribute(live["pollutants"], live["weather"])
    aqi, dom = compute_aqi(live["pollutants"])
    return {**result, "aqi": aqi, "dominant_pollutant": dom,
            "generated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/grid-forecast")
async def grid_forecast(lat: float, lon: float, size: int = 5):
    """Ward / grid-level AQI predictions around the given center."""
    live = await _live_features(lat, lon)
    return grid_svc.make_grid(lat, lon, live["pollutants"], live["weather"], size=size)


@router.get("/enforcement")
async def enforcement(lat: float, lon: float):
    """Structured enforcement recommendations for city authorities."""
    live = await _live_features(lat, lon)
    aqi, dom = compute_aqi(live["pollutants"])
    attribution = sa.attribute(live["pollutants"], live["weather"])
    actions = enf.build_enforcement(aqi, dom, live["pollutants"], live["weather"], attribution)
    return {"aqi": aqi, "dominant_pollutant": dom, "source_attribution": attribution,
            "actions": actions}


@router.get("/health-advisory")
async def health_advisory_ep(lat: float, lon: float):
    """Citizen health advisory keyed on max(current, forecast) AQI."""
    live = await _live_features(lat, lon)
    aqi, _ = compute_aqi(live["pollutants"])
    pred, _ = predictor.predict_aqi(live["features"])
    ref = max(aqi, pred)
    return {"current_aqi": aqi, "reference_aqi": ref,
            "advisory": hadv.advisory_for(ref)}


@router.get("/historical")
async def historical(lat: float, lon: float):
    """Weekly / monthly / seasonal / yearly + weather correlations."""
    return await hist_svc.historical(lat, lon)


@router.get("/multi-city")
async def multi_city(cities: Optional[str] = None):
    """Compare multiple Indian cities. `cities` = comma-separated names; default = 5 metros."""
    default = ["Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru"]
    names = [c.strip() for c in cities.split(",")] if cities else default
    targets = [get_city(n) for n in names]
    targets = [t for t in targets if t]

    async def one(c):
        try:
            weather, pol = await asyncio.gather(
                ow.fetch_weather(c["lat"], c["lon"]),
                ow.fetch_air_pollution(c["lat"], c["lon"]),
            )
            aqi, dom = compute_aqi(pol)
            pred, conf = predictor.predict_aqi({**pol, **weather})
            return {
                "city": c["city"], "state": c["state"],
                "lat": c["lat"], "lon": c["lon"],
                "aqi": aqi, "category": aqi_category(aqi),
                "dominant_pollutant": dom,
                "predicted_aqi": pred,
                "predicted_category": aqi_category(pred),
                "confidence": conf,
                "pollutants": pol,
                "weather": {"temperature": weather["temperature"],
                            "humidity": weather["humidity"],
                            "wind_speed": weather["wind_speed"]},
            }
        except Exception:
            return None

    rows = [r for r in await asyncio.gather(*[one(c) for c in targets]) if r]
    rows.sort(key=lambda r: r["aqi"], reverse=True)
    for idx, r in enumerate(rows):
        r["rank"] = idx + 1
    return {"cities": rows}


@router.get("/model-info")
async def model_info():
    """XGBoost model metadata: metrics, feature importance, latency."""
    meta = predictor.metadata()
    meta["prediction_latency_ms"] = predictor.avg_latency_ms()
    return meta
