"""Offline training script for the XGBoost AQI predictor.

Usage:  python -m backend.ml.train
Generates synthetic + CPCB-consistent samples so the model learns the AQI
formula alongside weather couplings (humidity, wind, etc.), then saves the
trained model to models/xgboost_model.joblib and metadata (metrics + feature
importance) to models/model_meta.json.
"""
import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# Make backend importable when run from repo root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from services.aqi_calc import compute_aqi  # noqa: E402
except ImportError:
    from backend.services.aqi_calc import compute_aqi  # noqa: E402

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "xgboost_model.joblib"
META_PATH = MODEL_DIR / "model_meta.json"

FEATURES = ["pm25", "pm10", "no2", "so2", "co", "o3", "nh3",
            "temperature", "humidity", "pressure", "wind_speed"]


def synth_row(rng: np.random.Generator) -> dict:
    pm25 = max(0, rng.normal(80, 60))
    pm10 = max(0, pm25 * rng.uniform(1.3, 2.2) + rng.normal(0, 10))
    no2  = max(0, rng.normal(55, 40))
    so2  = max(0, rng.normal(25, 20))
    co   = max(0, rng.normal(1.5, 1.2))
    o3   = max(0, rng.normal(70, 45))
    nh3  = max(0, rng.normal(120, 80))
    temp = rng.normal(28, 8)
    hum  = np.clip(rng.normal(60, 20), 5, 100)
    pres = rng.normal(1010, 8)
    wind = max(0, rng.normal(2.5, 1.8))
    aqi_now, _ = compute_aqi({"pm25": pm25, "pm10": pm10, "no2": no2,
                              "so2": so2, "co": co, "o3": o3, "nh3": nh3})
    delta = (60 - wind * 8) + (hum - 60) * 0.4 + rng.normal(0, 15)
    target = int(np.clip(aqi_now + delta * 0.25, 0, 500))
    return {"pm25": pm25, "pm10": pm10, "no2": no2, "so2": so2, "co": co,
            "o3": o3, "nh3": nh3, "temperature": temp, "humidity": hum,
            "pressure": pres, "wind_speed": wind, "target": target}


def train(n_samples: int = 6000, extra_df: pd.DataFrame | None = None):
    rng = np.random.default_rng(42)
    rows = [synth_row(rng) for _ in range(n_samples)]
    df = pd.DataFrame(rows)
    if extra_df is not None and len(extra_df) > 0:
        df = pd.concat([df, extra_df], ignore_index=True)

    X = df[FEATURES].values
    y = df["target"].values
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

    model = XGBRegressor(
        n_estimators=350, max_depth=6, learning_rate=0.08,
        subsample=0.85, colsample_bytree=0.85, random_state=42,
        objective="reg:squarederror", tree_method="hist",
    )
    model.fit(X_tr, y_tr)
    sample = {
    "pm25": 80,
    "pm10": 120,
    "no2": 40,
    "so2": 15,
    "co": 1.2,
    "o3": 60,
    "nh3": 20,
    "temperature": 30,
    "humidity": 65,
    "pressure": 1010,
    "wind_speed": 2.5,
}

    test = [[sample[f] for f in FEATURES]]
    print("TEST PREDICTION:", model.predict(test))

    pred = model.predict(X_te)
    rmse = float(np.sqrt(mean_squared_error(y_te, pred)))
    mae  = float(mean_absolute_error(y_te, pred))
    r2   = float(r2_score(y_te, pred))
    importances = dict(zip(FEATURES, [float(v) for v in model.feature_importances_]))
    # Normalize so they sum to 1 (already normalized by XGBoost but ensure)
    total = sum(importances.values()) or 1.0
    importances = {k: round(v / total, 4) for k, v in importances.items()}

    meta = {
        "model": "XGBoost Regressor",
        "features": FEATURES,
        "dataset_size": int(len(df)),
        "train_size": int(len(X_tr)),
        "test_size": int(len(X_te)),
        "rmse": round(rmse, 3),
        "mae": round(mae, 3),
        "r2": round(r2, 4),
        "feature_importance": importances,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "hyperparameters": {
            "n_estimators": 350, "max_depth": 6, "learning_rate": 0.08,
            "subsample": 0.85, "colsample_bytree": 0.85,
        },
    }

    
    joblib.dump(model, MODEL_PATH)
    META_PATH.write_text(json.dumps(meta, indent=2))
    print(f"Model saved to {MODEL_PATH} (rows={len(df)}) — RMSE={rmse:.2f} MAE={mae:.2f} R²={r2:.3f}")
    return str(MODEL_PATH), len(df)


if __name__ == "__main__":
    train()

