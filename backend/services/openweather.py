"""OpenWeather API client for weather + air pollution data."""
import os
import httpx
from typing import Optional

API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")
BASE = "https://api.openweathermap.org"

TIMEOUT = httpx.Timeout(15.0)


async def fetch_weather(lat: float, lon: float) -> dict:
    """Current weather (temperature in Celsius)."""
    url = f"{BASE}/data/2.5/weather"
    params = {"lat": lat, "lon": lon, "units": "metric", "appid": API_KEY}
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        data = r.json()
    main = data.get("main", {})
    wind = data.get("wind", {})
    weather_arr = data.get("weather", [{}])
    return {
        "temperature": main.get("temp", 25.0),
        "humidity": main.get("humidity", 60),
        "pressure": main.get("pressure", 1013),
        "wind_speed": wind.get("speed", 2.0),
        "wind_direction": wind.get("deg", 0),
        "visibility": data.get("visibility", 10000),
        "rain": (data.get("rain") or {}).get("1h", 0.0),
        "clouds": (data.get("clouds") or {}).get("all", 0),
        "description": weather_arr[0].get("description", "") if weather_arr else "",
    }


async def fetch_air_pollution(lat: float, lon: float) -> dict:
    """Current pollutant concentrations (µg/m³, CO in µg/m³)."""
    url = f"{BASE}/data/2.5/air_pollution"
    params = {"lat": lat, "lon": lon, "appid": API_KEY}
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        data = r.json()
    if not data.get("list"):
        return _empty_pollutants()
    comp = data["list"][0].get("components", {})
    # OpenWeather returns CO in µg/m³. CPCB uses mg/m³. Convert: 1 mg/m³ = 1000 µg/m³.
    return {
        "pm25": comp.get("pm2_5", 0.0),
        "pm10": comp.get("pm10", 0.0),
        "no2": comp.get("no2", 0.0),
        "so2": comp.get("so2", 0.0),
        "co": comp.get("co", 0.0) / 1000.0,
        "o3": comp.get("o3", 0.0),
        "nh3": comp.get("nh3", 0.0),
    }


async def fetch_air_pollution_history(lat: float, lon: float, start: int, end: int) -> list:
    """Historical air pollution between unix timestamps."""
    url = f"{BASE}/data/2.5/air_pollution/history"
    params = {"lat": lat, "lon": lon, "start": start, "end": end, "appid": API_KEY}
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        data = r.json()
    return data.get("list", [])


async def reverse_geocode(lat: float, lon: float) -> dict:
    """Return {city, state, country} for a lat/lon."""
    url = f"{BASE}/geo/1.0/reverse"
    params = {"lat": lat, "lon": lon, "limit": 1, "appid": API_KEY}
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        data = r.json()
    if not data:
        return {"city": "Unknown", "state": None, "country": "India"}
    d = data[0]
    return {
        "city": d.get("name", "Unknown"),
        "state": d.get("state"),
        "country": d.get("country", "IN"),
    }


async def forward_geocode(city: str) -> Optional[dict]:
    """Return {city, state, country, lat, lon} for a city name."""
    url = f"{BASE}/geo/1.0/direct"
    params = {"q": f"{city},IN", "limit": 1, "appid": API_KEY}
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        data = r.json()
    if not data:
        return None
    d = data[0]
    return {
        "city": d.get("name", city),
        "state": d.get("state"),
        "country": d.get("country", "IN"),
        "lat": d["lat"],
        "lon": d["lon"],
    }


def _empty_pollutants() -> dict:
    return {"pm25": 0.0, "pm10": 0.0, "no2": 0.0, "so2": 0.0,
            "co": 0.0, "o3": 0.0, "nh3": 0.0}
