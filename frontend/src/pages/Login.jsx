import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Wind, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AUTH } from '../constants/testIds';
import { toast } from 'sonner';

const LOGIN_BG = 'https://images.unsplash.com/photo-1765189920740-da7a29e6f03b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGJsdWUlMjBnb3Zlcm5tZW50JTIwYnVpbGRpbmclMjBhcmNoaXRlY3R1cmV8ZW58MHx8fHwxNzg0NTI4MDkzfDA&ixlib=rb-4.1.0&q=85';

export default function Login() {
  const { login, isAuthed } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@aqi.gov');
  const [password, setPassword] = useState('admin123');
  const [busy, setBusy] = useState(false);

  if (isAuthed) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success('Welcome back');
      nav('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Left: form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 rounded-md bg-[#0A2540] flex items-center justify-center">
              <Wind className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="font-display font-bold text-[#0A2540]">Urban AQI</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Intelligence Platform</div>
            </div>
          </div>

          <h1 className="font-display font-bold text-3xl text-[#0A2540] leading-tight">Command Center Access</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with your city administrator credentials to monitor real-time air quality.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold">Email</label>
              <input data-testid={AUTH.emailInput}
                     type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:border-transparent" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold">Password</label>
              <input data-testid={AUTH.passwordInput}
                     type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                     className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:border-transparent" />
            </div>

            <button type="submit" disabled={busy} data-testid={AUTH.submitBtn}
                    className="w-full rounded-md bg-[#0A2540] hover:bg-[#1E3A8A] text-white text-sm font-medium py-2.5 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>

            <div className="flex items-center gap-2 rounded-md bg-slate-100 border border-slate-200 px-3 py-2.5 text-xs text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Demo: <span className="font-mono">admin@aqi.gov / admin123</span>
            </div>
          </form>
        </div>
      </div>

      {/* Right: image */}
      <div className="hidden lg:block relative bg-[#0A2540] overflow-hidden">
        <img src={LOGIN_BG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0A2540] via-transparent to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-12 text-white">
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300 mb-2">Smart India Hackathon</div>
          <h2 className="font-display font-bold text-4xl leading-tight max-w-md">
            AI-powered air quality intelligence for every Indian city.
          </h2>
          <p className="mt-4 text-sm text-slate-200 max-w-md">
            Real-time monitoring, XGBoost-based AQI forecasting, and actionable recommendations for city administrators.
          </p>
        </div>
      </div>
    </div>
  );
}
