# 🌍 Urban AQI Intelligence Platform

An AI-powered Urban Air Quality Intelligence Platform built to monitor, analyze, and predict air quality using machine learning and real-time weather & pollution data.

## 📌 Features

- 📍 Real-time Air Quality Monitoring
- 🤖 XGBoost-based AQI Prediction
- 📈 AQI Forecast (24h, 48h, 72h)
- 🗺️ Interactive Map Visualization
- 📊 Analytics Dashboard
- 🌆 Multi-City Air Quality Comparison
- 🩺 Health Advisory based on AQI
- 🚨 Pollution Hotspot Detection
- 👨‍💼 Admin Panel
- 📂 Dataset Upload & Model Retraining

---

## 🛠 Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Leaflet Maps
- Recharts

### Backend
- FastAPI
- Python
- MongoDB

### Machine Learning
- XGBoost Regressor
- Scikit-Learn
- Pandas
- NumPy

### APIs
- OpenWeather API

---

## 📂 Project Structure

```
AQI-AI-main/
│
├── backend/
│   ├── ml/
│   ├── services/
│   ├── routes.py
│   ├── server.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── models/
│   ├── xgboost_model.joblib
│   └── model_meta.json
│
├── datasets/
│
└── README.md
```

---

# ⚙ Installation

## 1. Clone Repository

```bash
git clone https://github.com/USERNAME/AQI-AI.git

cd AQI-AI-main
```

---

## 2. Backend Setup

```bash
cd backend

python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the backend folder.

Example:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=aqi_ai

JWT_SECRET=your_secret_key

ADMIN_EMAIL=admin@aqi.gov
ADMIN_PASSWORD=admin123

OPENWEATHER_API_KEY=YOUR_API_KEY
```

Run backend

```bash
python -m uvicorn server:app --reload
```

Backend runs at

```
http://localhost:8000
```

---

## 3. Frontend Setup

```bash
cd frontend

npm install
```

Run

```bash
npm start
```

Frontend runs at

```
http://localhost:3000
```

---

# 🤖 Train the Model

Run

```bash
cd backend

python -m ml.train
```

This generates

```
models/xgboost_model.joblib
models/model_meta.json
```

---

# 📊 Model Information

Algorithm:

- XGBoost Regressor

Features

- PM2.5
- PM10
- NO₂
- SO₂
- CO
- O₃
- NH₃
- Temperature
- Humidity
- Pressure
- Wind Speed

Target

- AQI Prediction

---

# 📷 Screens

- Dashboard
- Map
- Analytics
- Predictions
- Multi-City
- Admin Panel

(Add screenshots here)

---

# Future Enhancements

- Deep Learning Models
- Satellite Data Integration
- Mobile Application
- User Authentication
- Government Reporting Portal
- PDF Report Generation
- IoT Sensor Integration

---

# Contributors
- Ayush Kumar Choudhary
- Soumya
- Shashwat Awasthi
- Hritam Samanta
---

# License

This project is developed for educational and hackathon purposes.
