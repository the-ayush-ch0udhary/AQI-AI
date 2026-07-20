"""Rule-based recommendations for city authorities based on AQI + pollutant + weather."""

def generate_recommendations(aqi: int, dominant: str, pollutants: dict, weather: dict) -> list[dict]:
    recs: list[dict] = []

    if aqi <= 50:
        recs.append({"title": "Maintain Baseline Monitoring",
                     "description": "Air quality is Good. Continue routine station monitoring.",
                     "severity": "low", "icon": "shield-check"})
        return recs

    if aqi <= 100:
        recs.append({"title": "Continue Routine Monitoring",
                     "description": "Air quality is Satisfactory. Maintain hourly station polling and public dashboards.",
                     "severity": "low", "icon": "shield-check"})

    if aqi > 100:
        recs.append({"title": "Increase Traffic Monitoring",
                     "description": "Deploy traffic marshals in high-density zones. Enforce PUC checks.",
                     "severity": "medium", "icon": "car"})
    if aqi > 200:
        recs.append({"title": "Restrict Construction Activity",
                     "description": "Halt non-essential construction. Enforce dust barriers and covers.",
                     "severity": "high", "icon": "construction"})
        recs.append({"title": "Increase Water Sprinkling",
                     "description": "Deploy sprinkler tankers on arterial roads every 4 hours.",
                     "severity": "high", "icon": "droplets"})
    if aqi > 300:
        recs.append({"title": "Industrial Inspection",
                     "description": "Dispatch pollution control teams to industrial clusters.",
                     "severity": "critical", "icon": "factory"})
        recs.append({"title": "Issue Public Health Advisory",
                     "description": "Advise sensitive groups to remain indoors. Broadcast via SMS/media.",
                     "severity": "critical", "icon": "megaphone"})
    if aqi > 400:
        recs.append({"title": "School Precaution Order",
                     "description": "Recommend suspension of outdoor activities in schools.",
                     "severity": "critical", "icon": "graduation-cap"})
        recs.append({"title": "Outdoor Activity Warning",
                     "description": "Cancel all public outdoor events. Enforce odd-even scheme.",
                     "severity": "critical", "icon": "alert-octagon"})

    # Dominant-pollutant specific
    if dominant in ("pm25", "pm10") and aqi > 150:
        recs.append({"title": "PM Source Control",
                     "description": f"Dominant pollutant is {dominant.upper()}. Target biomass burning and road dust.",
                     "severity": "high", "icon": "wind"})
    if dominant == "no2" and aqi > 150:
        recs.append({"title": "Vehicular Emission Drive",
                     "description": "NO2 elevated. Intensify BS-VI compliance and diesel vehicle checks.",
                     "severity": "high", "icon": "car"})
    if dominant == "so2" and aqi > 150:
        recs.append({"title": "Industrial SO2 Audit",
                     "description": "SO2 elevated. Audit thermal plants and metal refineries.",
                     "severity": "high", "icon": "factory"})
    if dominant == "o3" and aqi > 150:
        recs.append({"title": "Ozone Alert",
                     "description": "Ground-level ozone high. Advise midday outdoor activity avoidance.",
                     "severity": "medium", "icon": "sun"})

    # Weather-based
    if weather.get("wind_speed", 0) < 1.5 and aqi > 200:
        recs.append({"title": "Stagnation Alert",
                     "description": "Low wind speed traps pollutants. Increase all mitigation frequency.",
                     "severity": "high", "icon": "cloud-off"})
    if weather.get("humidity", 0) > 80 and aqi > 200:
        recs.append({"title": "Fog-Smog Watch",
                     "description": "High humidity + pollution risk of smog. Alert traffic control.",
                     "severity": "high", "icon": "cloud-fog"})

    return recs


def build_alerts(aqi: int, predicted_aqi: int, city: str) -> list[dict]:
    alerts = []
    if predicted_aqi > aqi + 30:
        alerts.append({
            "level": "warning",
            "title": "Deteriorating Trend",
            "message": f"AQI in {city} predicted to rise from {aqi} to {predicted_aqi} in the next 24h.",
        })
    if aqi > 300:
        alerts.append({
            "level": "critical",
            "title": "Severe Air Quality",
            "message": f"{city} AQI is {aqi} — in the {('Very Poor' if aqi <=400 else 'Severe')} range.",
        })
    if aqi <= 50:
        alerts.append({
            "level": "info",
            "title": "Air Quality Good",
            "message": f"{city} is in the Good category. No action required.",
        })
    if not alerts:
        alerts.append({
            "level": "info",
            "title": "Monitoring Active",
            "message": f"Live sensors for {city} operational. Data refreshed every 10 min.",
        })
    return alerts
