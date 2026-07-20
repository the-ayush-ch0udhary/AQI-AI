import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Map, LineChart, Activity, Shield, LogOut, Wind, Building2 } from 'lucide-react';
import { NAV } from '../../constants/testIds';
import { useAuth } from '../../context/AuthContext';

const items = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',   testId: NAV.dashboard },
  { to: '/map',        icon: Map,             label: 'Map',         testId: NAV.map },
  { to: '/analytics',  icon: LineChart,       label: 'Analytics',   testId: NAV.analytics },
  { to: '/predictions',icon: Activity,        label: 'Predictions', testId: NAV.predictions },
  { to: '/multi-city', icon: Building2,       label: 'Multi-City',  testId: NAV.multicity },
  { to: '/admin',      icon: Shield,          label: 'Admin',       testId: NAV.admin },
];

export default function Sidebar() {
  const { logout, email } = useAuth();
  const nav = useNavigate();

  return (
    <aside data-testid={NAV.sidebar}
           className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-[#0A2540] text-white flex-col z-30">
      <div className="px-6 pt-8 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
            <Wind className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <div className="font-display font-bold text-base leading-tight">Urban AQI</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Intelligence Platform</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ to, icon: Icon, label, testId }) => (
          <NavLink key={to} to={to} end={to === '/'}
            data-testid={testId}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`
            }>
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Signed in as</div>
          <div className="text-sm font-mono text-slate-100 truncate">{email || 'Guest'}</div>
        </div>
        <button data-testid={NAV.logout}
                onClick={() => { logout(); nav('/login'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
