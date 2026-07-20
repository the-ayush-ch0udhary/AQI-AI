# Urban Air Quality Intelligence Platform — PRD

## Original problem statement
Build a production-ready MVP for the Smart India Hackathon: an AI-powered
Urban Air Quality Intelligence Platform that helps city administrators
monitor, predict, and analyze air pollution using real-time environmental
data (OpenWeather + OpenAQ). ML (XGBoost) forecasts AQI; rule-based engine
generates actionable recommendations for authorities. Focus: Indian cities.

## Architecture (implemented)
- **Frontend**: React (CRA) + JavaScript + TailwindCSS + shadcn/ui +
  react-leaflet + leaflet.heat + Recharts + react-router-dom.
- **Backend**: FastAPI + XGBoost + scikit-learn + pandas + httpx +
  python-jose (JWT).
- **DB**: MongoDB.
- **ML**: XGBoost regressor trained offline; saved to
  `/app/models/xgboost_model.joblib` with metadata + feature importance in
  `/app/models/model_meta.json`; loaded at runtime.
- **APIs**: OpenWeather (weather + air pollution + forward/reverse geocoding).

## User personas
1. City administrator (primary): monitors real-time AQI, gets recommendations.
2. Data operator (admin panel): uploads historical AQI CSVs, retrains model.

## What has been implemented
### Iteration 1 (Feb 2026)
- Full backend API (12 endpoints) with OpenWeather integration.
- XGBoost model trained on 6,000 CPCB-consistent synthetic samples.
- Login page + JWT auth flow.
- Dashboard, Map (Leaflet + heatmap), Analytics, Predictions, Admin.
- 12 Indian cities preloaded.
- Rule-based recommendation engine.
- CPCB AQI calculator (sub-index method).

### Iteration 2 (SIH extension, Feb 2026)
- **Hyperlocal 24/48/72h forecasts** with confidence-decayed bands.
- **AI pollution source attribution** (5 sources, hybrid rules).
- **Ward / grid-level intelligence** — 5×5 grid overlay on Leaflet.
- **Enforcement intelligence** — structured actions (reason, priority,
  expected impact, affected area).
- **Citizen health advisory** — per-demographic guidance.
- **Historical intelligence** — weekly / monthly / seasonal / yearly +
  weather correlations.
- **Multi-city comparison** — new page + `/api/multi-city` endpoint.
- **XGBoost feature importance + model performance dashboard**
  (RMSE, MAE, R², latency, dataset size, training date).
- **Auto-refresh every 10 minutes** across all data pages.
- **Offline fallback** — axios interceptor with localStorage cache and
  stale-data badge on Dashboard.
- **/docs** — Architecture, ML pipeline, Data flow, API flow, Deployment.
- **README** — full project documentation.

## Prioritized backlog (deferred / future)
- **P1**: Real OpenAQ / CPCB SAMEER station-level feeds.
- **P1**: SMS/Email alert dispatch (Twilio/SendGrid) to actually push alerts.
- **P2**: PostgreSQL/TimescaleDB migration.
- **P2**: Multi-user roles.
- **P2**: PDF daily bulletin generation.
- **P2**: Public read-only citizen view.

## Next tasks list
1. Testing agent full validation of new SIH endpoints.
2. Any user-reported issues.
