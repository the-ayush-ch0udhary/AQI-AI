import React, { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import AppShell from '../components/app/AppShell';
import { ANALYTICS } from '../constants/testIds';
import { AQI_CATEGORIES, POLLUTANT_LABELS } from '../lib/aqi';
import { Skeleton } from '../components/ui/skeleton';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

function fmtHour(iso) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}h`;
}

export default function Analytics() {
  const { location, refreshTick } = useApp();
  const [data, setData] = useState(null);
  const [hist, setHist] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, h] = await Promise.all([
        api.get('/analytics', { params: { lat: location.lat, lon: location.lon, city: location.city }}),
        api.get('/historical', { params: { lat: location.lat, lon: location.lon }}),
      ]);
      setData(a.data);
      setHist(h.data);
    } finally { setLoading(false); }
  }, [location]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const trend = (data?.trend || []).map((t) => ({ ...t, ts: fmtHour(t.timestamp) }));
  const catDist = data ? Object.entries(data.category_distribution).map(([k, v]) => ({ name: k, value: v })) : [];
  const pollutantAvg = data ? Object.entries(data.pollutant_avg).map(([k, v]) => ({ pollutant: POLLUTANT_LABELS[k] || k, value: v })) : [];
  const comparison = data ? [...data.city_comparison].sort((a, b) => b.aqi - a.aqi) : [];

  return (
    <AppShell onRefresh={load}>
      <div data-testid={ANALYTICS.root} className="space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Analytics</div>
          <h2 className="font-display font-bold text-2xl text-[#0A2540]">7-Day Trends · {location.city}</h2>
        </div>

        {loading || !data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev" data-testid={ANALYTICS.trendChart}>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">AQI Trend · Last 7 days</div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0A2540" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0A2540" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="ts" fontSize={11} stroke="#94A3B8" interval="preserveStartEnd" />
                  <YAxis fontSize={11} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Area type="monotone" dataKey="aqi" stroke="#0A2540" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev" data-testid={ANALYTICS.pollutantChart}>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Pollutant Averages (7d)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pollutantAvg}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="pollutant" fontSize={11} stroke="#94A3B8" />
                    <YAxis fontSize={11} stroke="#94A3B8" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev" data-testid={ANALYTICS.distributionChart}>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Category Distribution</div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={catDist} dataKey="value" nameKey="name" cx="50%" cy="50%"
                         innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {catDist.map((d) => {
                        const c = AQI_CATEGORIES.find((x) => x.name === d.name);
                        return <Cell key={d.name} fill={c ? c.hex : '#94A3B8'} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev" data-testid={ANALYTICS.comparisonChart}>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">City Comparison · Current AQI</div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={comparison} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" fontSize={11} stroke="#94A3B8" />
                  <YAxis type="category" dataKey="city" fontSize={11} stroke="#94A3B8" width={90} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Bar dataKey="aqi" radius={[0, 4, 4, 0]}>
                    {comparison.map((c) => {
                      const cat = AQI_CATEGORIES.find((x) => x.name === c.category);
                      return <Cell key={c.city} fill={cat ? cat.hex : '#0A2540'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Weather correlation: PM2.5 vs Wind */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Pollutant Trend · PM2.5 vs PM10</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="ts" fontSize={11} stroke="#94A3B8" interval="preserveStartEnd" />
                  <YAxis fontSize={11} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="pm25" stroke="#EF4444" strokeWidth={2} dot={false} name="PM2.5" />
                  <Line type="monotone" dataKey="pm10" stroke="#F97316" strokeWidth={2} dot={false} name="PM10" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Historical Intelligence */}
            {hist && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev" data-testid={ANALYTICS.weeklyChart}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Weekly Trend</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={hist.weekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="label" fontSize={10} stroke="#94A3B8" />
                      <YAxis fontSize={11} stroke="#94A3B8" />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                      <Bar dataKey="aqi" radius={[4, 4, 0, 0]}>
                        {hist.weekly.map((d, i) => <Cell key={i} fill={AQI_CATEGORIES.find((c) => d.aqi>=c.min && d.aqi<=c.max)?.hex || '#94A3B8'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev" data-testid={ANALYTICS.monthlyChart}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Monthly Trend · 30 days</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={hist.monthly}>
                      <defs>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="label" fontSize={10} stroke="#94A3B8" interval={3} />
                      <YAxis fontSize={11} stroke="#94A3B8" />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                      <Area type="monotone" dataKey="aqi" stroke="#10B981" strokeWidth={2} fill="url(#g2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev" data-testid={ANALYTICS.seasonalChart}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Seasonal Average AQI</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={hist.seasonal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="season" fontSize={11} stroke="#94A3B8" />
                      <YAxis fontSize={11} stroke="#94A3B8" />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                      <Bar dataKey="aqi" radius={[4, 4, 0, 0]}>
                        {hist.seasonal.map((d, i) => <Cell key={i} fill={AQI_CATEGORIES.find((c) => d.aqi>=c.min && d.aqi<=c.max)?.hex || '#94A3B8'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-[10px] text-slate-500">
                    Observed where samples exist; falls back to CPCB baselines for unsampled seasons.
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev" data-testid={ANALYTICS.yearlyChart}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Yearly Comparison</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={hist.yearly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="year" fontSize={11} stroke="#94A3B8" />
                      <YAxis fontSize={11} stroke="#94A3B8" />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                      <Line type="monotone" dataKey="avg_aqi" stroke="#0A2540" strokeWidth={2}
                            dot={{ fill: '#0A2540', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 card-elev"
                     data-testid={ANALYTICS.correlationList}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Weather & Pollutant Correlations</div>
                  <ul className="space-y-3">
                    {hist.correlations.map((c, i) => (
                      <li key={i} className="flex items-start gap-4 rounded-md border border-slate-200 p-3">
                        <div className="min-w-[110px] text-sm font-semibold text-[#0A2540]">{c.pair}</div>
                        <div className={`font-mono text-sm px-2 py-0.5 rounded-md border ${Math.abs(c.r) > 0.6 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                          r = {c.r}
                        </div>
                        <div className="text-xs text-slate-600 leading-relaxed flex-1">{c.interpretation}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
