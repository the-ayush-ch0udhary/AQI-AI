import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import AppShell from '../components/app/AppShell';
import { useApp } from '../context/AppContext';
import { MULTI } from '../constants/testIds';
import { AQIBadge } from '../components/app/AQIBadge';
import { categoryFor, POLLUTANT_LABELS } from '../lib/aqi';
import { Skeleton } from '../components/ui/skeleton';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Users, TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';

const DEFAULT_SELECTION = ['Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru'];

export default function MultiCity() {
  const { cities, refreshTick } = useApp();
  const [selected, setSelected] = useState(DEFAULT_SELECTION);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/multi-city', { params: { cities: selected.join(',') }});
      setData(r.data);
    } finally { setLoading(false); }
  }, [selected]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const toggle = (name) => {
    setSelected((s) => s.includes(name) ? s.filter((x) => x !== name) : [...s, name]);
  };

  const rows = data?.cities || [];
  const chartData = useMemo(() => rows.map((r) => ({ ...r, delta: r.predicted_aqi - r.aqi })), [rows]);

  return (
    <AppShell onRefresh={load}>
      <div data-testid={MULTI.root} className="space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Comparative Intelligence</div>
          <h2 className="font-display font-bold text-2xl text-[#0A2540]">Multi-City AQI Comparison</h2>
          <p className="text-sm text-slate-600 mt-1">Live AQI, forecast and dominant pollutant across selected Indian metros.</p>
        </div>

        {/* Selector */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 card-elev">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">Select cities</div>
          <div className="flex flex-wrap gap-3">
            {cities.map((c) => {
              const on = selected.includes(c.city);
              return (
                <label key={c.city}
                       className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer text-sm transition-colors ${on ? 'bg-[#0A2540] border-[#0A2540] text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                  <Checkbox checked={on} onCheckedChange={() => toggle(c.city)}
                            data-testid={`multicity-toggle-${c.city.toLowerCase()}`}
                            className={on ? 'border-white data-[state=checked]:bg-white data-[state=checked]:text-[#0A2540]' : ''} />
                  {c.city}
                </label>
              );
            })}
          </div>
        </div>

        {loading || !data ? (
          <div className="space-y-4">
            <Skeleton className="h-72 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : (
          <>
            {/* Ranking bar chart */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev" data-testid={MULTI.rankChart}>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Ranking (higher = worse)</div>
              <ResponsiveContainer width="100%" height={Math.max(240, rows.length * 42)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" fontSize={11} stroke="#94A3B8" />
                  <YAxis type="category" dataKey="city" fontSize={12} stroke="#94A3B8" width={100} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Bar dataKey="aqi" radius={[0, 4, 4, 0]} name="Current AQI">
                    {chartData.map((c) => <Cell key={c.city} fill={categoryFor(c.aqi).hex} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison table */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">
                Detailed Comparison
              </div>
              <div className="overflow-x-auto">
                <table data-testid={MULTI.compareTable} className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-4 font-bold">Rank</th>
                      <th className="py-2 pr-4 font-bold">City</th>
                      <th className="py-2 pr-4 font-bold">Current AQI</th>
                      <th className="py-2 pr-4 font-bold">Category</th>
                      <th className="py-2 pr-4 font-bold">Forecast 24h</th>
                      <th className="py-2 pr-4 font-bold">Δ</th>
                      <th className="py-2 pr-4 font-bold">Dominant</th>
                      <th className="py-2 pr-4 font-bold">Wind</th>
                      <th className="py-2 pr-4 font-bold">Temp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const delta = r.predicted_aqi - r.aqi;
                      const Arrow = delta > 5 ? ArrowUp : delta < -5 ? ArrowDown : Minus;
                      const arrowCls = delta > 5 ? 'text-red-600' : delta < -5 ? 'text-emerald-600' : 'text-slate-400';
                      return (
                        <tr key={r.city} className="border-b border-slate-100">
                          <td className="py-2 pr-4 font-mono">{r.rank}</td>
                          <td className="py-2 pr-4 font-medium">
                            {r.city}
                            <span className="text-xs text-slate-500 ml-2">{r.state}</span>
                          </td>
                          <td className="py-2 pr-4 font-mono font-semibold">{r.aqi}</td>
                          <td className="py-2 pr-4"><AQIBadge aqi={r.aqi} size="sm" /></td>
                          <td className="py-2 pr-4 font-mono">{r.predicted_aqi}</td>
                          <td className={`py-2 pr-4 font-mono ${arrowCls} inline-flex items-center gap-1`}>
                            <Arrow className="h-3 w-3" />
                            {Math.abs(delta)}
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs">{POLLUTANT_LABELS[r.dominant_pollutant] || r.dominant_pollutant}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{(r.weather?.wind_speed ?? 0).toFixed(1)} m/s</td>
                          <td className="py-2 pr-4 font-mono text-xs">{(r.weather?.temperature ?? 0).toFixed(1)}°C</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Current vs Forecast line */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Current vs Forecast (24h)</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="city" fontSize={11} stroke="#94A3B8" />
                  <YAxis fontSize={11} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="aqi" stroke="#0A2540" strokeWidth={2} name="Current" />
                  <Line type="monotone" dataKey="predicted_aqi" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" name="Forecast 24h" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
