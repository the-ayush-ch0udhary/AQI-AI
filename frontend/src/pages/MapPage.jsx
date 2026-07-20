import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import AppShell from '../components/app/AppShell';
import { AQIBadge } from '../components/app/AQIBadge';
import { categoryFor, POLLUTANT_LABELS } from '../lib/aqi';
import { MAP, DASH } from '../constants/testIds';
import { Skeleton } from '../components/ui/skeleton';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function HeatLayer({ points, enabled }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (enabled && points.length > 0) {
      layerRef.current = L.heatLayer(points, {
        radius: 55, blur: 40, maxZoom: 8, minOpacity: 0.4,
        gradient: { 0.1: '#10B981', 0.3: '#FBBF24', 0.5: '#F97316',
                    0.7: '#EF4444', 0.85: '#A855F7', 1.0: '#881337' },
      }).addTo(map);
    }
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [enabled, points, map]);

  return null;
}

export default function MapPage() {
  const { location, refreshTick } = useApp();
  const [data, setData] = useState(null);
  const [grid, setGrid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [heatmap, setHeatmap] = useState(true);
  const [showGrid, setShowGrid] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [mapRes, gridRes] = await Promise.all([
        api.get('/map'),
        api.get('/grid-forecast', { params: { lat: location.lat, lon: location.lon, size: 5 }}),
      ]);
      setData(mapRes.data);
      setGrid(gridRes.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [location, refreshTick]);

  const heatPoints = (data?.stations || []).map((s) => [s.latitude, s.longitude, Math.min(1, s.aqi / 500)]);

  return (
    <AppShell onRefresh={load}>
      <div data-testid={MAP.root} className="space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Geospatial View</div>
            <h2 className="font-display font-bold text-2xl text-[#0A2540]">India — Pollution Hotspots</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="heat" className="text-xs uppercase tracking-wider font-bold text-slate-500">Heatmap</Label>
              <Switch id="heat" data-testid={MAP.heatmapToggle} checked={heatmap} onCheckedChange={setHeatmap} />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="grid" className="text-xs uppercase tracking-wider font-bold text-slate-500">Ward Grid</Label>
              <Switch id="grid" data-testid={MAP.gridToggle} checked={showGrid} onCheckedChange={setShowGrid} />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 card-elev">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold">CPCB Scale:</span>
            {[
              { name: 'Good', hex: '#10B981', r: '0-50' },
              { name: 'Satisfactory', hex: '#FBBF24', r: '51-100' },
              { name: 'Moderate', hex: '#F97316', r: '101-200' },
              { name: 'Poor', hex: '#EF4444', r: '201-300' },
              { name: 'Very Poor', hex: '#A855F7', r: '301-400' },
              { name: 'Severe', hex: '#881337', r: '401+' },
            ].map((l) => (
              <div key={l.name} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: l.hex }} />
                <span className="text-xs text-slate-700">{l.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{l.r}</span>
              </div>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <Skeleton className="w-full h-[560px] rounded-lg" />
        ) : (
          <div data-testid={MAP.container} className="rounded-lg overflow-hidden border border-slate-200 card-elev">
            <MapContainer center={[22.5, 79]} zoom={5} scrollWheelZoom style={{ height: 560, width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <HeatLayer points={heatPoints} enabled={heatmap} />
              {showGrid && grid?.cells?.map((c) => {
                const step = (grid.span_deg || 0.35) / ((grid.size || 5) - 1);
                const bounds = [
                  [c.lat - step/2, c.lon - step/2],
                  [c.lat + step/2, c.lon + step/2],
                ];
                const hex = categoryFor(c.predicted_aqi).hex;
                return (
                  <Rectangle key={`${c.i}-${c.j}`} bounds={bounds}
                             pathOptions={{ color: c.priority ? '#0A2540' : hex,
                                            weight: c.priority ? 2 : 0.6,
                                            fillColor: hex, fillOpacity: 0.35 }}>
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-display font-bold text-sm">Grid Cell {c.i}-{c.j}</div>
                        <div className="text-xs text-slate-500">
                          {c.lat.toFixed(3)}, {c.lon.toFixed(3)}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">{c.predicted_aqi}</span>
                          <AQIBadge aqi={c.predicted_aqi} size="sm" />
                        </div>
                        <div className="mt-1 text-xs">
                          <span className="text-slate-500">Current AQI:</span>{' '}
                          <span className="font-mono">{c.current_aqi}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500">Dominant:</span>{' '}
                          <span className="font-mono">{POLLUTANT_LABELS[c.dominant_pollutant] || c.dominant_pollutant}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500">Confidence:</span>{' '}
                          <span className="font-mono">{(c.confidence * 100).toFixed(0)}%</span>
                        </div>
                        {c.priority && (
                          <div className="mt-2 inline-flex text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#0A2540] text-white">
                            Priority Intervention
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Rectangle>
                );
              })}
              {data.stations.map((s) => (
                <CircleMarker key={s.id} center={[s.latitude, s.longitude]}
                  radius={12}
                  pathOptions={{
                    color: 'white', weight: 2,
                    fillColor: categoryFor(s.aqi).hex, fillOpacity: 0.95,
                  }}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="font-display font-bold text-sm">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.state}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{s.aqi}</span>
                        <AQIBadge aqi={s.aqi} size="sm" />
                      </div>
                      <div className="mt-2 text-xs">
                        <span className="text-slate-500">Dominant:</span>{' '}
                        <span className="font-mono">{POLLUTANT_LABELS[s.dominant_pollutant] || s.dominant_pollutant}</span>
                      </div>
                      <div className="mt-1 text-xs">
                        <span className="text-slate-500">PM2.5:</span>{' '}
                        <span className="font-mono">{(s.pollutants.pm25 || 0).toFixed(1)} µg/m³</span>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* Hotspot list */}
        {data && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Pollution Hotspots (AQI > 200)</div>
              <div className="text-xs text-slate-500 font-mono">{data.hotspots.length} cities</div>
            </div>
            {data.hotspots.length === 0 ? (
              <div className="text-sm text-slate-500">No hotspots detected across monitored cities.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.hotspots.map((h) => (
                  <div key={h.id} className={`rounded-md border p-3 ${categoryFor(h.aqi).soft}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-display font-semibold text-sm">{h.name}</div>
                      <AQIBadge aqi={h.aqi} size="sm" />
                    </div>
                    <div className="text-xs mt-1 opacity-80">{h.state}</div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-mono font-bold text-xl">{h.aqi}</span>
                      <span className="text-[10px] font-mono">AQI</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
