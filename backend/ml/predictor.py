"""Loads the trained XGBoost model, exposes predict + metadata + latency."""
import os
import json
import joblib
import time
from pathlib import Path
from typing import Optional

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MODEL_PATH = MODEL_DIR / "xgboost_model.joblib"
META_PATH = MODEL_DIR / "model_meta.json"

_model = None
_meta: Optional[dict] = None
_latency_ms: list[float] = []
_features = ["pm25", "pm10", "no2", "so2", "co", "o3", "nh3",
             "temperature", "humidity", "pressure", "wind_speed"]

def _load():
    global _model, _meta

    print("MODEL PATH:", MODEL_PATH)
    print("MODEL EXISTS:", MODEL_PATH.exists())

    if _model is None and MODEL_PATH.exists():
        print("Loading model...")
        _model = joblib.load(MODEL_PATH)
        print("Model loaded successfully!")

    if _meta is None and META_PATH.exists():
        with open(META_PATH, "r") as f:
            _meta = json.load(f)

    return _model


def reload_model():
    global _model, _meta
    _model = None
    _meta = None
    return _load()

def predict_aqi(features: dict) -> tuple[int, float]:
    model = _load()
    if model is None:
        return 0, 0.0

    x = [[features.get(f, 0.0) for f in _features]]

    t0 = time.perf_counter()

    pred = model.predict(x)[0]

    # DEBUG
    print("=" * 60)
    print("INPUT FEATURES:", x)
    print("RAW MODEL OUTPUT:", pred)
    print("=" * 60)

    dt = (time.perf_counter() - t0) * 1000

    _latency_ms.append(dt)
    if len(_latency_ms) > 200:
        _latency_ms.pop(0)

    aqi = int(max(0, min(500, round(float(pred)))))
    confidence = 0.88 if 0 <= aqi <= 500 else 0.6
    return aqi, confidence

def feature_names():
    return list(_features)


def metadata() -> dict:
    _load()
    if _meta is None:
        return {
            "model": "XGBoost Regressor",
            "features": _features,
            "trained_at": None,
            "rmse": None, "mae": None, "r2": None,
            "dataset_size": None,
            "feature_importance": {},
        }
    return dict(_meta)


def avg_latency_ms() -> float:
    if not _latency_ms:
        return 0.0
    return round(sum(_latency_ms) / len(_latency_ms), 3)
