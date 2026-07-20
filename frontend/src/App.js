import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import './App.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Analytics from './pages/Analytics';
import Predictions from './pages/Predictions';
import MultiCity from './pages/MultiCity';
import Admin from './pages/Admin';

function Protected({ children }) {
  const { isAuthed } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"           element={<Protected><Dashboard /></Protected>} />
      <Route path="/map"        element={<Protected><MapPage /></Protected>} />
      <Route path="/analytics"  element={<Protected><Analytics /></Protected>} />
      <Route path="/predictions"element={<Protected><Predictions /></Protected>} />
      <Route path="/multi-city" element={<Protected><MultiCity /></Protected>} />
      <Route path="/admin"      element={<Protected><Admin /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <AppRoutes />
            <Toaster position="bottom-right" richColors />
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
