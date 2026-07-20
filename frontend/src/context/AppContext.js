import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

const AppContext = createContext(null);

const DEFAULT_CITY = { city: 'Delhi', state: 'Delhi', lat: 28.6139, lon: 77.2090 };
const REFRESH_MS = 10 * 60 * 1000; // 10 minutes

export function AppProvider({ children }) {
  const [cities, setCities] = useState([]);
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem('aqi_location');
    return saved ? JSON.parse(saved) : DEFAULT_CITY;
  });
  const [geoStatus, setGeoStatus] = useState('idle');
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    api.get('/cities').then((r) => setCities(r.data.cities || [])).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('aqi_location', JSON.stringify(location));
  }, [location]);

  // Global auto-refresh tick — pages subscribe to `refreshTick` and re-fetch
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const forceRefresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      return;
    }
    setGeoStatus('pending');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const r = await api.get('/geocode', { params: { lat: latitude, lon: longitude } });
          setLocation({
            city: r.data.city || 'Unknown',
            state: r.data.state || null,
            lat: latitude, lon: longitude,
          });
          setGeoStatus('granted');
        } catch (_) {
          setLocation({ city: 'Detected', state: null, lat: latitude, lon: longitude });
          setGeoStatus('granted');
        }
      },
      () => setGeoStatus('denied'),
      { timeout: 8000 }
    );
  }, []);

  return (
    <AppContext.Provider value={{ cities, location, setLocation, detectLocation, geoStatus, refreshTick, forceRefresh }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
