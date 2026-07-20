from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


def _uid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class WeatherData(BaseModel):
    temperature: float
    humidity: float
    pressure: float
    wind_speed: float
    wind_direction: float
    visibility: float = 10000
    rain: float = 0.0
    clouds: float = 0.0
    description: str = ""


class Pollutants(BaseModel):
    pm25: float = 0.0
    pm10: float = 0.0
    no2: float = 0.0
    so2: float = 0.0
    co: float = 0.0
    o3: float = 0.0
    nh3: float = 0.0


class AirQuality(BaseModel):
    aqi: int
    category: str
    dominant_pollutant: str
    pollutants: Pollutants
    station: str = "OpenWeather"
    timestamp: str


class Location(BaseModel):
    city: str
    state: Optional[str] = None
    country: str = "India"
    latitude: float
    longitude: float


class DashboardResponse(BaseModel):
    location: Location
    weather: WeatherData
    air_quality: AirQuality
    predicted_aqi: int
    predicted_category: str
    prediction_confidence: float
    health_risk: str
    recommendations: List[Dict[str, str]]
    alerts: List[Dict[str, Any]]
    source_attribution: Optional[Dict[str, Any]] = None
    health_advisory: Optional[List[Dict[str, Any]]] = None
    forecast_summary: Optional[Dict[str, Any]] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


class PredictionLog(BaseModel):
    id: str = Field(default_factory=_uid)
    city: str
    latitude: float
    longitude: float
    input_features: Dict[str, float]
    predicted_aqi: int
    predicted_category: str
    confidence: float
    created_at: str = Field(default_factory=_now)


class UploadedDataset(BaseModel):
    id: str = Field(default_factory=_uid)
    filename: str
    rows: int
    uploaded_at: str = Field(default_factory=_now)


class Station(BaseModel):
    id: str
    name: str
    city: str
    latitude: float
    longitude: float
    aqi: int
    category: str
    pollutants: Pollutants
