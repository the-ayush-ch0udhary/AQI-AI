import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_API_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

// Offline cache: last successful GET response per endpoint+params is stashed
// in localStorage. If a request fails (network / 5xx / timeout), we return the
// cached body with an added `_stale: true` flag so UI can indicate fallback.
const CACHE_PREFIX = 'aqi_cache__';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

function cacheKey(url, params) {
  return CACHE_PREFIX + url + '::' + JSON.stringify(params || {});
}

function readCache(url, params) {
  try {
    const raw = localStorage.getItem(cacheKey(url, params));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.t > CACHE_MAX_AGE_MS) return null;
    return obj.data;
  } catch { return null; }
}

function writeCache(url, params, data) {
  try {
    localStorage.setItem(cacheKey(url, params), JSON.stringify({ t: Date.now(), data }));
  } catch { /* quota */ }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aqi_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => {
    if ((r.config.method || 'get').toLowerCase() === 'get' && r.status < 300) {
      const url = r.config.url;
      const params = r.config.params;
      writeCache(url, params, r.data);
    }
    return r;
  },
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('aqi_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
    // Offline fallback for GETs
    const cfg = err.config || {};
    if ((cfg.method || 'get').toLowerCase() === 'get') {
      const cached = readCache(cfg.url, cfg.params);
      if (cached) {
        return Promise.resolve({
          data: { ...cached, _stale: true },
          status: 200,
          statusText: 'OK (cached)',
          config: cfg,
          headers: {},
        });
      }
    }
    return Promise.reject(err);
  }
);

export default api;
