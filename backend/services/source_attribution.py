"""Hybrid rule + heuristic pollution source attribution engine.

For MVP we score five likely source categories from pollutant ratios and
meteorological cues, then normalise into a probability distribution.
"""
from typing import Dict, List


SOURCES = [
    "Vehicular Traffic",
    "Industrial Emissions",
    "Construction & Road Dust",
    "Biomass / Waste Burning",
    "Meteorological Stagnation",
]


def _score(pol: Dict[str, float], wx: Dict[str, float]) -> Dict[str, float]:
    pm25 = max(pol.get("pm25", 0), 0.0001)
    pm10 = max(pol.get("pm10", 0), 0.0001)
    no2  = pol.get("no2", 0)
    so2  = pol.get("so2", 0)
    co   = pol.get("co", 0)
    o3   = pol.get("o3", 0)
    nh3  = pol.get("nh3", 0)
    wind = wx.get("wind_speed", 2.0)
    hum  = wx.get("humidity", 60)

    pm_ratio = pm10 / pm25  # >2.5 favours dust/construction; ~1-2 favours combustion

    # Traffic: high NO2, moderate CO, PM ratio not extreme
    traffic = (no2 * 0.9) + (co * 25) + (1 if pm_ratio < 2.3 else 0) * 8
    # Industrial: high SO2, elevated PM2.5, some NO2
    industrial = (so2 * 1.8) + (pm25 * 0.35) + (no2 * 0.25)
    # Construction / road dust: PM10 dominates, pm_ratio high
    construction = (pm10 * 0.55) + max(0, (pm_ratio - 2.0)) * 30
    # Biomass / waste burning: high PM2.5, CO, NH3, low O3
    burning = (pm25 * 0.6) + (co * 15) + (nh3 * 0.2) + (max(0, 60 - o3) * 0.3)
    # Meteorological stagnation: low wind + high humidity trapping pollutants
    stagnation = max(0, (2.0 - wind)) * 40 + max(0, (hum - 70)) * 0.8

    return {
        "Vehicular Traffic": traffic,
        "Industrial Emissions": industrial,
        "Construction & Road Dust": construction,
        "Biomass / Waste Burning": burning,
        "Meteorological Stagnation": stagnation,
    }


def _reasoning(source: str, pol: Dict[str, float], wx: Dict[str, float]) -> str:
    pm25 = pol.get("pm25", 0); pm10 = pol.get("pm10", 0)
    ratio = pm10 / max(pm25, 0.01)
    if source == "Vehicular Traffic":
        return (f"Elevated NO₂ ({pol.get('no2', 0):.0f} µg/m³) and CO "
                f"({pol.get('co', 0):.2f} mg/m³) with PM10/PM2.5 ratio {ratio:.1f} "
                "match a combustion signature typical of dense traffic corridors.")
    if source == "Industrial Emissions":
        return (f"SO₂ at {pol.get('so2', 0):.0f} µg/m³ with elevated fine PM2.5 "
                f"({pm25:.0f} µg/m³) indicates thermal-plant or refinery downwind exposure.")
    if source == "Construction & Road Dust":
        return (f"Coarse dust dominates: PM10 {pm10:.0f} µg/m³, PM10/PM2.5 ratio {ratio:.1f}. "
                "Consistent with unpaved roads, C&D activity, or nearby earthworks.")
    if source == "Biomass / Waste Burning":
        return (f"High PM2.5 ({pm25:.0f} µg/m³), CO ({pol.get('co', 0):.2f} mg/m³) and "
                f"NH₃ ({pol.get('nh3', 0):.0f} µg/m³) with suppressed O₃ suggest "
                "smouldering biomass or municipal waste burning.")
    return (f"Wind speed only {wx.get('wind_speed', 0):.1f} m/s with humidity "
            f"{wx.get('humidity', 0):.0f}% — pollutants are trapping in a shallow "
            "boundary layer rather than dispersing.")


def attribute(pollutants: Dict[str, float], weather: Dict[str, float]) -> Dict:
    scores = _score(pollutants, weather)
    total = sum(scores.values()) or 1.0
    dist = [{"source": k, "score": round(v, 2),
             "probability": round(v / total, 3)} for k, v in scores.items()]
    dist.sort(key=lambda x: x["probability"], reverse=True)
    dominant = dist[0]
    return {
        "dominant_source": dominant["source"],
        "confidence": dominant["probability"],
        "reasoning": _reasoning(dominant["source"], pollutants, weather),
        "distribution": dist,
    }
