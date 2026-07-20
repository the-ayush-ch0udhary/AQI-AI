import React, { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import AppShell from '../components/app/AppShell';
import KpiCard from '../components/app/KpiCard';
import { AQIBadge } from '../components/app/AQIBadge';
import { categoryFor, POLLUTANT_LABELS, POLLUTANT_UNITS } from '../lib/aqi';
import { DASH } from '../constants/testIds';
import {
  Activity, Wind, Thermometer, Droplets, Gauge, Cloud,
  ShieldAlert, Car, Construction, Factory, Sun, Megaphone, GraduationCap,
  AlertOctagon, CloudOff, CloudFog, ShieldCheck, TrendingUp, Compass, Layers, Users, WifiOff,
} from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const ICON_MAP = {
  'car': Car, 'construction': Construction, 'factory': Factory,
  'droplets': Droplets, 'megaphone': Megaphone, 'graduation-cap': GraduationCap,
  'alert-octagon': AlertOctagon, 'sun': Sun, 'wind': Wind,
  'cloud-off': CloudOff, 'cloud-fog': CloudFog, 'shield-check': ShieldCheck,
};

const SEVERITY_BG = {
  low: 'aqi-good-soft', medium: 'aqi-satisfactory-soft',
  high: 'aqi-poor-soft', critical: 'aqi-severe-soft',
};

const TIER_BG = {
  safe: 'aqi-good-soft', acceptable: 'aqi-satisfactory-soft',
  caution: 'aqi-moderate-soft', restrict: 'aqi-poor-soft',
  avoid: 'aqi-very-poor-soft', emergency: 'aqi-severe-soft',
};

const ALERT_BG = {
  info: 'bg-slate-50 border-slate-200 text-slate-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  critical: 'bg-red-50 border-red-200 text-red-900',
};

export default function Dashboard() {
  const { location, refreshTick } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/dashboard', {
        params: { lat: location.lat, lon: location.lon, city: location.city, state: location.state },
      });
      setData(r.data);
    } catch (e) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => { load(); }, [load, refreshTick]);

  return (
    <AppShell onRefresh={load}>
      <div data-testid={DASH.root} className="space-y-6">
        {/* Page header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Live Snapshot</div>
            <h2 className="font-display font-bold text-2xl text-[#0A2540]">{location.city}{location.state ? `, ${location.state}` : ''}</h2>
          </div>
          {data && (
            <div className="flex items-center gap-2">
              {data._stale && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
                  <WifiOff className="h-3 w-3" /> Cached
                </span>
              )}
              <AQIBadge aqi={data.air_quality.aqi} size="lg" />
              <div className="text-xs text-slate-500 font-mono">
                {new Date(data.air_quality.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {loading || !data ? (
          <SkeletonGrid />
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard testId={DASH.currentAqiCard}
                label="Current AQI" value={data.air_quality.aqi} unit="CPCB"
                icon={Activity}
                accent={<div className="mt-3"><AQIBadge aqi={data.air_quality.aqi} size="sm" /></div>}
              />
              <KpiCard testId={DASH.predictedAqiCard}
                label="Predicted AQI · 24h" value={data.predicted_aqi} unit="XGBoost"
                icon={TrendingUp}
                accent={
                  <div className="mt-3 flex items-center gap-2">
                    <AQIBadge aqi={data.predicted_aqi} size="sm" />
                    <span className="text-[10px] font-mono text-slate-500">
                      {(data.prediction_confidence * 100).toFixed(0)}% conf.
                    </span>
                  </div>
                }
              />
              <KpiCard testId={DASH.dominantCard}
                label="Dominant Pollutant"
                value={POLLUTANT_LABELS[data.air_quality.dominant_pollutant] || data.air_quality.dominant_pollutant}
                icon={Wind}
                hint={`${(data.air_quality.pollutants[data.air_quality.dominant_pollutant] ?? 0).toFixed(1)} ${POLLUTANT_UNITS[data.air_quality.dominant_pollutant] || ''}`}
              />
              <KpiCard testId={DASH.weatherCard}
                label="Temperature" value={data.weather.temperature.toFixed(1)} unit="°C"
                icon={Thermometer}
                hint={data.weather.description ? data.weather.description.replace(/^./, c => c.toUpperCase()) : ''}
              />
            </div>

            {/* 2nd row: Weather grid + Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 card-elev">
                <div className="flex items-center justify-between mb-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Environmental Readings</div>
                  <div className="text-xs text-slate-500 font-mono">OpenWeather · Live</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MiniStat icon={Droplets} label="Humidity" value={`${data.weather.humidity.toFixed(0)}%`} />
                  <MiniStat icon={Wind}     label="Wind"     value={`${data.weather.wind_speed.toFixed(1)} m/s`} />
                  <MiniStat icon={Gauge}    label="Pressure" value={`${data.weather.pressure.toFixed(0)} hPa`} />
                  <MiniStat icon={Cloud}    label="Clouds"   value={`${data.weather.clouds.toFixed(0)}%`} />
                  <MiniStat icon={Compass}  label="Wind Dir" value={`${data.weather.wind_direction.toFixed(0)}°`} />
                  <MiniStat icon={Sun}      label="Visibility" value={`${(data.weather.visibility/1000).toFixed(1)} km`} />
                  <MiniStat icon={Droplets} label="Rain 1h"  value={`${data.weather.rain.toFixed(1)} mm`} />
                  <MiniStat icon={Activity} label="Category" value={data.air_quality.category} mono={false} />
                </div>
              </div>

              <div data-testid={DASH.healthRiskCard}
                   className={`rounded-lg p-6 border card-elev ${categoryFor(data.air_quality.aqi).soft}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-4 w-4" />
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em]">Health Risk</div>
                </div>
                <div className="font-display font-bold text-lg leading-tight">{data.air_quality.category}</div>
                <p className="mt-2 text-sm leading-relaxed">{data.health_risk}</p>
              </div>
            </div>

            {/* Pollutants grid */}
            <div data-testid={DASH.pollutantsGrid} className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Pollutant Concentrations</div>
                <div className="text-xs text-slate-500 font-mono">CPCB sub-indices</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {Object.entries(data.air_quality.pollutants).map(([k, v]) => (
                  <div key={k}
                       className={`rounded-md border p-3 ${k === data.air_quality.dominant_pollutant ? 'border-[#0A2540] bg-slate-50' : 'border-slate-200'}`}>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{POLLUTANT_LABELS[k]}</div>
                    <div className="font-mono font-semibold text-lg text-[#0A2540] mt-1">{(v ?? 0).toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{POLLUTANT_UNITS[k]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Forecast summary + Source attribution */}
            {data.forecast_summary && (
              <div data-testid={DASH.forecastMini}
                   className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {['h24', 'h48', 'h72'].map((k) => {
                  const f = data.forecast_summary[k];
                  if (!f) return null;
                  return (
                    <div key={k} className="bg-white border border-slate-200 rounded-lg p-5 card-elev">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                          Forecast · {f.horizon_hours}h
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {(f.confidence * 100).toFixed(0)}% conf.
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <div className="font-mono font-bold text-3xl text-[#0A2540]">{f.predicted_aqi}</div>
                        <AQIBadge aqi={f.predicted_aqi} size="sm" />
                      </div>
                      <div className="mt-2 text-xs text-slate-500 font-mono">
                        Peak {f.peak_aqi} @ +{f.peak_hour}h · Avg {f.avg_aqi}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Source attribution + Advisory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {data.source_attribution && (
                <div data-testid={DASH.sourceCard}
                     className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                      Pollution Source Attribution
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {(data.source_attribution.confidence * 100).toFixed(0)}% conf.
                    </span>
                  </div>
                  <div className="font-display font-bold text-lg text-[#0A2540]">
                    {data.source_attribution.dominant_source}
                  </div>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                    {data.source_attribution.reasoning}
                  </p>
                  <div className="mt-4 space-y-2">
                    {data.source_attribution.distribution.map((s) => (
                      <div key={s.source} className="flex items-center gap-3">
                        <div className="text-xs text-slate-600 w-44 truncate">{s.source}</div>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full"
                               style={{ width: `${s.probability * 100}%`,
                                        background: s.source === data.source_attribution.dominant_source ? '#0A2540' : '#94A3B8' }} />
                        </div>
                        <div className="text-xs font-mono w-12 text-right">
                          {(s.probability * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.health_advisory && (
                <div data-testid={DASH.advisoryCard}
                     className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-[#0A2540]" />
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                      Citizen Health Advisory
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {data.health_advisory.map((a) => (
                      <li key={a.group}
                          className={`rounded-md border p-3 ${TIER_BG[a.tier] || 'aqi-good-soft'}`}>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{a.group}</div>
                          <span className="text-[10px] uppercase tracking-wider font-bold">
                            {a.tier_label}
                          </span>
                        </div>
                        <p className="text-xs mt-1 leading-relaxed">{a.advice}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 card-elev">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Administrative Recommendations</div>
                  <div className="text-xs text-slate-500 font-mono">{data.recommendations.length} actions</div>
                </div>
                <div className="space-y-3">
                  {data.recommendations.map((r, i) => {
                    const Icon = ICON_MAP[r.icon] || ShieldAlert;
                    return (
                      <div key={i} data-testid={`${DASH.recCard}-${i}`}
                           className={`rounded-md border p-4 flex gap-3 ${SEVERITY_BG[r.severity] || 'aqi-good-soft'}`}>
                        <div className="mt-0.5"><Icon className="h-4 w-4" /></div>
                        <div className="flex-1">
                          <div className="font-display font-semibold text-sm">{r.title}</div>
                          <div className="text-xs mt-1 leading-relaxed">{r.description}</div>
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.15em] font-bold self-start">
                          {r.severity}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Recent Alerts</div>
                </div>
                <ul data-testid={DASH.alertsList} className="space-y-3">
                  {data.alerts.map((a, i) => (
                    <li key={i} className={`rounded-md border p-3 ${ALERT_BG[a.level] || ALERT_BG.info}`}>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm">{a.title}</div>
                        <span className="text-[10px] uppercase tracking-wider font-bold">{a.level}</span>
                      </div>
                      <p className="text-xs mt-1">{a.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function MiniStat({ icon: Icon, label, value, mono = true }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-[#0A2540]" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
        <div className={`${mono ? 'font-mono' : 'font-display'} font-semibold text-sm text-[#0A2540]`}>{value}</div>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Skeleton className="h-56 rounded-lg lg:col-span-2" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}
