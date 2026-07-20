"""Ward / grid-level AQI predictions around a chosen city center.

To stay within OpenWeather rate limits we fetch the city-center pollution
once, then apply a smooth deterministic spatial variation (based on grid
coordinates + wind bias) and re-predict per cell using the XGBoost model.
This keeps values realistic yet distinctly localised on the map.
"""
import math
from typing import Dict, List

try:
    from ml import predictor
    from services.aqi_calc import compute_aqi, aqi_category
except ImportError:
    from backend.ml import predictor
    from backend.services.aqi_calc import compute_aqi, aqi_category


def _cell_variation(i: int, j: int, size: int, wind_dir_deg: float) -> tuple[float, float]:
    """Return (pollutant_scale, wind_shift) for grid cell (i,j)."""
    # Base checkerboard-like variation using sin waves + wind direction gradient
    theta = math.radians(wind_dir_deg or 0)
    # Downwind cells get higher pollutants
    cx, cy = (size - 1) / 2, (size - 1) / 2
    dx, dy = i - cx, j - cy
    # Project onto wind vector (downwind positive)
    downwind = dx * math.cos(theta) + dy * math.sin(theta)
    base = 1.0 + 0.06 * math.sin(i * 1.7) + 0.05 * math.cos(j * 1.3)
    scale = base * (1 + 0.08 * downwind / max(1, size // 2))
    return max(0.55, min(1.6, scale)), downwind


def make_grid(lat: float, lon: float, pollutants: Dict[str, float],
              weather: Dict[str, float], size: int = 5,
              span_deg: float = 0.35) -> Dict:
    """Return a size x size grid of predictions around (lat, lon).

    span_deg is the total lat/lon span of the grid (~0.35 ≈ 40 km).
    """
    size = max(3, min(9, size))
    step = span_deg / (size - 1)
    lat0 = lat - span_deg / 2
    lon0 = lon - span_deg / 2
    wind_dir = weather.get("wind_direction", 0)

    cells: List[Dict] = []
    for i in range(size):
        for j in range(size):
            lat_c = lat0 + i * step
            lon_c = lon0 + j * step
            scale, downwind = _cell_variation(i, j, size, wind_dir)
            pol_c = {k: v * scale for k, v in pollutants.items()}
            feats = {**pol_c, **weather}
            pred_aqi, conf = predictor.predict_aqi(feats)
            current_aqi, dom = compute_aqi(pol_c)
            cells.append({
                "i": i, "j": j,
                "lat": round(lat_c, 5),
                "lon": round(lon_c, 5),
                "current_aqi": current_aqi,
                "predicted_aqi": pred_aqi,
                "category": aqi_category(current_aqi),
                "predicted_category": aqi_category(pred_aqi),
                "dominant_pollutant": dom,
                "confidence": conf,
                "pollutants": {k: round(v, 2) for k, v in pol_c.items()},
                "downwind_offset": round(downwind, 2),
            })
    # Identify top-3 priority cells (highest predicted AQI)
    priority = sorted(cells, key=lambda c: c["predicted_aqi"], reverse=True)[:3]
    for p in priority:
        p["priority"] = True

    return {
        "center": {"lat": lat, "lon": lon},
        "size": size,
        "span_deg": span_deg,
        "cells": cells,
        "priority_ids": [f"{p['i']}-{p['j']}" for p in priority],
    }
