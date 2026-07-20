"""Multi-horizon AQI forecast using the existing XGBoost model.

Runs the model at t+24h, t+48h, t+72h by drifting the weather features
(diurnal + confidence decay) while keeping pollutants close to current
values. Also returns a full hourly timeline for visualization.
"""
import math
from typing import List, Dict, Tuple

try:
    from ml import predictor
    from services.aqi_calc import aqi_category
except ImportError:
    from backend.ml import predictor
    from backend.services.aqi_calc import aqi_category


def _perturb(base: dict, hour: int) -> dict:
    """Perturb features for hour t (hours from now)."""
    diurnal = math.sin((hour % 24) / 24 * 2 * math.pi)
    day_shift = hour / 24
    # Pollutants: mild persistence + gentle upward drift if wind is low
    wind_factor = max(0.4, min(1.6, 2.0 / max(0.6, base.get("wind_speed", 2.0))))
    drift_p = 1 + 0.05 * day_shift * (wind_factor - 1)
    return {
        "pm25": max(0, base.get("pm25", 0) * (1 + 0.12 * diurnal) * drift_p),
        "pm10": max(0, base.get("pm10", 0) * (1 + 0.10 * diurnal) * drift_p),
        "no2":  max(0, base.get("no2", 0)  * (1 + 0.20 * diurnal)),
        "so2":  max(0, base.get("so2", 0)),
        "co":   max(0, base.get("co", 0)   * (1 + 0.15 * diurnal)),
        "o3":   max(0, base.get("o3", 0)   * (1 - 0.25 * diurnal)),  # peaks midday
        "nh3":  max(0, base.get("nh3", 0)),
        "temperature": base.get("temperature", 25) + 4 * diurnal,
        "humidity": max(10, min(100, base.get("humidity", 60) - 12 * diurnal)),
        "pressure": base.get("pressure", 1010) + 1.5 * math.cos(day_shift * math.pi),
        "wind_speed": max(0.5, base.get("wind_speed", 2.0) + 0.8 * math.cos((hour / 24) * 2 * math.pi)),
    }


def _confidence_at(hour: int) -> float:
    # Base 0.9 at t=0, decays ~0.15 per day
    return round(max(0.35, 0.92 - 0.05 * (hour / 24)), 3)


def hourly_timeline(base: dict, hours: int = 72) -> List[Dict]:
    out = []
    for h in range(1, hours + 1):
        feats = _perturb(base, h)
        aqi, _ = predictor.predict_aqi(feats)
        
        out.append({
            "hour": h,
            "aqi": aqi,
            "category": aqi_category(aqi),
            "confidence": _confidence_at(h),
            "features": feats,
        })
        
    return out




def horizon_forecasts(base: dict) -> Dict[str, Dict]:
    """Return 24h, 48h, 72h horizon summaries + full timeline."""
    timeline = hourly_timeline(base, 72)

    def summarize(start: int, end: int) -> Dict:
        window = timeline[start:end]
        if not window:
            return {}
        peak = max(window, key=lambda x: x["aqi"])
        avg = int(round(sum(x["aqi"] for x in window) / len(window)))
        end_pt = window[-1]
        return {
            "horizon_hours": end,
            "predicted_aqi": end_pt["aqi"],
            "predicted_category": end_pt["category"],
            "confidence": end_pt["confidence"],
            "avg_aqi": avg,
            "peak_aqi": peak["aqi"],
            "peak_hour": peak["hour"],
        }

    return {
        "h24": summarize(0, 24),
        "h48": summarize(0, 48),
        "h72": summarize(0, 72),
        "timeline": timeline,
    }
