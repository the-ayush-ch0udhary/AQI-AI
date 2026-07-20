import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('aqi_token'));
  const [email, setEmail] = useState(() => localStorage.getItem('aqi_email'));

  useEffect(() => {
    if (token) localStorage.setItem('aqi_token', token); else localStorage.removeItem('aqi_token');
  }, [token]);

  useEffect(() => {
    if (email) localStorage.setItem('aqi_email', email); else localStorage.removeItem('aqi_email');
  }, [email]);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    setToken(r.data.access_token);
    setEmail(r.data.email);
    return r.data;
  };
  const logout = () => { setToken(null); setEmail(null); };

  return (
    <AuthContext.Provider value={{ token, email, login, logout, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
