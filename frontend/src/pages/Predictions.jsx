import React, { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import AppShell from '../components/app/AppShell';
import { PRED } from '../constants/testIds';
import { AQIBadge } from '../components/app/AQIBadge';
import { categoryFor } from '../lib/aqi';
import { Skeleton } from '../components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Line, ComposedChart } from 'recharts';
import { TrendingUp, Clock, Target, Gauge } from 'lucide-react';

const HORIZONS = [
  { key: 'h24', hours: 24, label: '24 Hours', icon: Clock,      test: PRED.h24Card },
  { key: 'h48', hours: 48, label: '48 Hours', icon: TrendingUp, test: PRED.h48Card },
  { key: 'h72', hours: 72, label: '72 Hours', icon: Target,     test: PRED.h72Card },
];

export default function Predictions() {
  const { location, refreshTick } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/forecast', { params: { lat: location.lat, lon: location.lon }});
      setData(r.data);
    } finally { setLoading(false); }
  }, [location]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const timeline = (data?.timeline || []).map((t) => ({
    ...t,
    label: `+${t.hour}h`,
    ci_low: Math.max(0, t.aqi - Math.round((1 - t.confidence) * 40)),
    ci_high: Math.min(500, t.aqi + Math.round((1 - t.confidence) * 40)),
  }));

  return (
    <AppShell onRefresh={load}>
      <div data-testid={PRED.root} className="space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Hyperlocal ML Forecast</div>
          <h2 className="font-display font-bold text-2xl text-[#0A2540]">
            24 · 48 · 72 Hour AQI Forecast · {location.city}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            XGBoost regressor forecasting AQI with confidence-decayed prediction bands.
          </p>
        </div>

        {loading || !data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
            </div>
            <Skeleton className="h-96 rounded-lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {HORIZONS.map(({ key, hours, label, icon: Icon, test }) => {
                const f = data[key] || {};
                return (
                  <div key={key} data-testid={test}
                       className="bg-white border border-slate-200 rounded-lg p-6 card-elev card-hover">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-[#0A2540]" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Forecast</div>
                          <div className="text-sm font-semibold text-[#0A2540]">{label}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {(f.confidence * 100).toFixed(0)}% conf.
                      </span>
                    </div>
                    <div className="mt-5 flex items-baseline gap-2">
                      <div className="font-mono font-bold text-4xl text-[#0A2540]">{f.predicted_aqi}</div>
                      <span className="text-xs text-slate-500 font-mono">AQI</span>
                    </div>
                    <div className="mt-2"><AQIBadge aqi={f.predicted_aqi} size="sm" /></div>
                    <div className="mt-4 text-xs text-slate-600 space-y-1 font-mono">
                      <div>Peak {f.peak_aqi} @ +{f.peak_hour}h</div>
                      <div>Avg over horizon: {f.avg_aqi}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main 72h chart with confidence band */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev" data-testid={PRED.forecastChart}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">72-hour hourly forecast</div>
                <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                  <Gauge className="h-3 w-3" /> Shaded band = confidence interval
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={timeline}>
                  <defs>
                    <linearGradient id="predArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#0A2540" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0A2540" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" fontSize={10} stroke="#94A3B8"
                         interval={5} tick={{ fontFamily: 'IBM Plex Mono' }} />
                  <YAxis fontSize={11} stroke="#94A3B8"
                         domain={[0, (dataMax) => Math.max(300, Math.ceil(dataMax * 1.1))]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <ReferenceLine y={100} stroke="#FBBF24" strokeDasharray="3 3" label={{ value: 'Sat', fontSize: 10, position: 'insideTopRight' }} />
                  <ReferenceLine y={200} stroke="#F97316" strokeDasharray="3 3" label={{ value: 'Mod', fontSize: 10, position: 'insideTopRight' }} />
                  <ReferenceLine y={300} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Poor', fontSize: 10, position: 'insideTopRight' }} />
                  <ReferenceLine x="+24h" stroke="#0A2540" strokeDasharray="4 4" />
                  <ReferenceLine x="+48h" stroke="#0A2540" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="ci_high" stroke="none" fill="#0A2540" fillOpacity={0.08} />
                  <Area type="monotone" dataKey="ci_low"  stroke="none" fill="#ffffff" fillOpacity={1} />
                  <Line type="monotone" dataKey="aqi" stroke="#0A2540" strokeWidth={2} dot={false} name="Predicted AQI" />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Hourly timeline table */}
            <div data-testid={PRED.timelineTable}
                 className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Forecast Timeline</div>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-24 gap-2"
                   style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))' }}>
                {timeline.map((f) => (
                  <div key={f.hour}
                       className="rounded-md border border-slate-200 p-2 text-center card-hover"
                       title={`Confidence ${(f.confidence * 100).toFixed(0)}%`}>
                    <div className="text-[10px] text-slate-500 font-mono">{f.label}</div>
                    <div className="mt-1 font-mono font-bold text-sm"
                         style={{ color: categoryFor(f.aqi).hex }}>
                      {f.aqi}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                      {(f.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
