"""Static list of major Indian cities used by the platform."""

INDIAN_CITIES = [
    {"city": "Delhi",       "state": "Delhi",           "lat": 28.6139, "lon": 77.2090},
    {"city": "Mumbai",      "state": "Maharashtra",     "lat": 19.0760, "lon": 72.8777},
    {"city": "Bengaluru",   "state": "Karnataka",       "lat": 12.9716, "lon": 77.5946},
    {"city": "Chennai",     "state": "Tamil Nadu",      "lat": 13.0827, "lon": 80.2707},
    {"city": "Kolkata",     "state": "West Bengal",     "lat": 22.5726, "lon": 88.3639},
    {"city": "Hyderabad",   "state": "Telangana",       "lat": 17.3850, "lon": 78.4867},
    {"city": "Pune",        "state": "Maharashtra",     "lat": 18.5204, "lon": 73.8567},
    {"city": "Ahmedabad",   "state": "Gujarat",         "lat": 23.0225, "lon": 72.5714},
    {"city": "Lucknow",     "state": "Uttar Pradesh",   "lat": 26.8467, "lon": 80.9462},
    {"city": "Jaipur",      "state": "Rajasthan",       "lat": 26.9124, "lon": 75.7873},
    {"city": "Kanpur",      "state": "Uttar Pradesh",   "lat": 26.4499, "lon": 80.3319},
    {"city": "Patna",       "state": "Bihar",           "lat": 25.5941, "lon": 85.1376},
]


def get_city(name: str) -> dict | None:
    for c in INDIAN_CITIES:
        if c["city"].lower() == name.lower():
            return c
    return None
