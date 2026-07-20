"""Enforcement Intelligence — structured recommendations for city authorities.

Each recommendation carries: title, reason, priority, expected impact,
affected area. Combines AQI level + dominant pollutant + source attribution.
"""
from typing import Dict, List


PRIORITY = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def _make(title, reason, priority, impact, area, category, icon="shield-alert"):
    return {
        "title": title, "reason": reason, "priority": priority,
        "expected_impact": impact, "affected_area": area,
        "category": category, "icon": icon,
    }


def build_enforcement(aqi: int, dominant: str, pol: Dict[str, float],
                      wx: Dict[str, float], source: Dict) -> List[Dict]:
    src = source.get("dominant_source", "")
    recs: List[Dict] = []

    if aqi > 100:
        recs.append(_make(
            "Increase Traffic Enforcement",
            f"NO₂ {pol.get('no2', 0):.0f} µg/m³ and CO {pol.get('co', 0):.2f} mg/m³ are elevated.",
            "medium" if aqi <= 200 else "high",
            "Estimated 8–15% NO₂ reduction on affected corridors within 48h.",
            "Arterial roads and intersections within 5 km of hotspot",
            "traffic", icon="car",
        ))
    if aqi > 200 and (dominant in ("pm10",) or src == "Construction & Road Dust"):
        recs.append(_make(
            "Halt Non-Essential Construction",
            f"PM10 dominant ({pol.get('pm10', 0):.0f} µg/m³) with ratio suggesting coarse dust.",
            "high",
            "Cut coarse PM10 emissions by ~20% within 24h.",
            "Sites within 3 km grid cells with predicted AQI > 200",
            "construction", icon="construction",
        ))
    if aqi > 150 and (dominant == "so2" or src == "Industrial Emissions"):
        recs.append(_make(
            "Industrial Cluster Inspection",
            f"SO₂ at {pol.get('so2', 0):.0f} µg/m³ indicates fuel-burning sources.",
            "high",
            "Compliance drive can cut SO₂ 10–25% in 72h.",
            "Notified industrial estates and thermal plants downwind of hotspot",
            "industrial", icon="factory",
        ))
    if aqi > 200:
        recs.append(_make(
            "Intensify Road Cleaning & Water Sprinkling",
            "Suspended dust re-entrainment increases exponentially above 200 AQI.",
            "high",
            "Localised PM10 reduction of 10–20% for 6–12h.",
            "All ward roads with priority cells (top-3 grid AQI)",
            "sanitation", icon="droplets",
        ))
    if aqi > 200 and src == "Biomass / Waste Burning":
        recs.append(_make(
            "Control Open Garbage & Biomass Burning",
            "PM2.5, CO and NH₃ ratios match combustion of biomass/waste.",
            "critical",
            "Immediate PM2.5 reduction of 15–30% at burn sites.",
            "Peri-urban belt and municipal dump sites within 10 km",
            "burning", icon="flame",
        ))
    if wx.get("wind_speed", 3) < 1.5 and aqi > 200:
        recs.append(_make(
            "Air Quality Emergency Cell Activation",
            f"Wind {wx.get('wind_speed', 0):.1f} m/s creates stagnation; dispersion is minimal.",
            "critical",
            "Coordinated multi-agency response for 24–48h until winds pick up.",
            "Full municipal area",
            "coordination", icon="megaphone",
        ))
    if aqi > 300:
        recs.append(_make(
            "Public Health Advisory Broadcast",
            "AQI in the Very Poor / Severe range poses acute risk to sensitive groups.",
            "critical",
            "Reduces exposure incidence via SMS + media reach.",
            "City-wide via public broadcast channels",
            "advisory", icon="megaphone",
        ))
    if aqi > 350:
        recs.append(_make(
            "School Outdoor Activity Suspension",
            "Sustained AQI above 350 damages developing lungs during outdoor play.",
            "critical",
            "Prevents ~5–10% jump in paediatric respiratory admissions.",
            "All schools within the municipal boundary",
            "schools", icon="graduation-cap",
        ))

    if not recs:
        recs.append(_make(
            "Maintain Routine Monitoring",
            "AQI within Good/Satisfactory range.",
            "low", "No adverse impact expected.",
            "All monitoring stations", "routine", icon="shield-check",
        ))

    recs.sort(key=lambda r: PRIORITY.get(r["priority"], 0), reverse=True)
    return recs
