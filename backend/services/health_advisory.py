"""Citizen Health Advisory — per-demographic guidance keyed on forecast AQI."""
from typing import Dict, List

GROUPS = [
    "Children (0-12)",
    "Senior Citizens (60+)",
    "Asthma / Cardiac Patients",
    "Outdoor Workers",
    "General Public",
]


def _tier(aqi: int) -> str:
    if aqi <= 50: return "safe"
    if aqi <= 100: return "acceptable"
    if aqi <= 200: return "caution"
    if aqi <= 300: return "restrict"
    if aqi <= 400: return "avoid"
    return "emergency"


ADVICE = {
    "Children (0-12)": {
        "safe":      "Normal outdoor play. Encourage sports and activity.",
        "acceptable":"Outdoor play safe; monitor children with existing conditions.",
        "caution":   "Limit vigorous play to morning/evening; N95 optional in traffic.",
        "restrict":  "Avoid outdoor sports; move PE classes indoors.",
        "avoid":     "No outdoor activity; keep windows closed; use air purifier.",
        "emergency": "Stay indoors, N95 if you must step out; consult a paediatrician on any wheeze.",
    },
    "Senior Citizens (60+)": {
        "safe":      "Regular morning walks are fine.",
        "acceptable":"Continue routine; take longer breaks if breathless.",
        "caution":   "Shift walks indoors or to parks away from traffic.",
        "restrict":  "Stay indoors; postpone non-essential outings.",
        "avoid":     "Strict indoor stay; keep inhalers/medications close.",
        "emergency": "Do not step out; seek medical help for any chest discomfort.",
    },
    "Asthma / Cardiac Patients": {
        "safe":      "Carry rescue inhaler; no special precautions.",
        "acceptable":"Pre-medicate before exertion; monitor peak flow.",
        "caution":   "Use preventer inhaler regularly; N95 outdoors.",
        "restrict":  "Avoid outdoor exertion; escalate to physician if symptoms.",
        "avoid":     "Stay indoors with purifier; do not skip medication.",
        "emergency": "Increase medication as advised; seek ER for shortness of breath.",
    },
    "Outdoor Workers": {
        "safe":      "Normal shift.",
        "acceptable":"Hydrate and take shade breaks every hour.",
        "caution":   "Wear certified N95 masks; rotate outdoor hours.",
        "restrict":  "Split shifts; reduce continuous outdoor exposure to < 4h.",
        "avoid":     "Non-critical outdoor work should be paused.",
        "emergency": "Suspend outdoor operations; provide indoor duty or leave.",
    },
    "General Public": {
        "safe":      "Enjoy outdoor activities.",
        "acceptable":"Normal activity; sensitive individuals should watch for symptoms.",
        "caution":   "Limit prolonged outdoor exertion; prefer public transport.",
        "restrict":  "Wear N95 outdoors; keep windows closed during peak hours.",
        "avoid":     "Stay indoors; use air purifiers; N95 mandatory outdoors.",
        "emergency": "Do not step out unless essential. Report elderly / children with distress to helpline.",
    },
}


TIER_LABEL = {
    "safe": "Safe", "acceptable": "Acceptable", "caution": "Caution",
    "restrict": "Restrict", "avoid": "Avoid", "emergency": "Emergency",
}


def advisory_for(aqi: int) -> List[Dict]:
    tier = _tier(aqi)
    return [{
        "group": g,
        "tier": tier,
        "tier_label": TIER_LABEL[tier],
        "advice": ADVICE[g][tier],
    } for g in GROUPS]
