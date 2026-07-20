import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/api';
import AppShell from '../components/app/AppShell';
import { ADMIN } from '../constants/testIds';
import { Upload, RefreshCcw, FileText, Loader2, Cpu, Timer, Gauge, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { AQIBadge } from '../components/app/AQIBadge';
import { POLLUTANT_LABELS } from '../lib/aqi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FEATURE_LABEL = {
  ...POLLUTANT_LABELS,
  temperature: 'Temperature', humidity: 'Humidity',
  pressure: 'Pressure', wind_speed: 'Wind Speed',
};

export default function Admin() {
  const [datasets, setDatasets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [model, setModel] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [ds, lg, mi] = await Promise.all([
        api.get('/datasets'),
        api.get('/prediction-logs', { params: { limit: 50 }}),
        api.get('/model-info'),
      ]);
      setDatasets(ds.data.datasets || []);
      setLogs(lg.data.logs || []);
      setModel(mi.data);
    } catch (e) {
      toast.error('Failed to load admin data');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const featureImportance = useMemo(() => {
    if (!model?.feature_importance) return [];
    return Object.entries(model.feature_importance)
      .map(([k, v]) => ({ feature: FEATURE_LABEL[k] || k, value: v }))
      .sort((a, b) => b.value - a.value);
  }, [model]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success(`Uploaded ${file.name}`);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onRetrain = async () => {
    setRetraining(true);
    try {
      const r = await api.post('/retrain');
      toast.success(`Model retrained on ${r.data.rows} rows`);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Retrain failed');
    } finally { setRetraining(false); }
  };

  return (
    <AppShell onRefresh={load}>
      <div data-testid={ADMIN.root} className="space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Administration</div>
          <h2 className="font-display font-bold text-2xl text-[#0A2540]">Model & Data Management</h2>
        </div>

        {/* Model performance dashboard */}
        {model && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" data-testid={ADMIN.modelMetrics}>
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-lg p-6 card-elev">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="h-4 w-4 text-[#0A2540]" />
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Model Performance</div>
              </div>
              <div className="font-display font-bold text-xl text-[#0A2540]">{model.model}</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MetricCell icon={Gauge}    label="RMSE"       value={model.rmse ?? '—'} />
                <MetricCell icon={Gauge}    label="MAE"        value={model.mae ?? '—'} />
                <MetricCell icon={Gauge}    label="R² Score"   value={model.r2 ?? '—'} />
                <MetricCell icon={Timer}    label="Latency"    value={model.prediction_latency_ms != null ? `${model.prediction_latency_ms} ms` : '—'} />
                <MetricCell icon={FileText} label="Dataset"    value={model.dataset_size ?? '—'} />
                <MetricCell icon={Calendar} label="Trained"    value={model.trained_at ? new Date(model.trained_at).toLocaleDateString() : '—'} />
              </div>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 card-elev"
                 data-testid={ADMIN.featureImportance}>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">
                XGBoost Feature Importance
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={featureImportance} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" fontSize={11} stroke="#94A3B8"
                         tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <YAxis type="category" dataKey="feature" fontSize={11} stroke="#94A3B8" width={100} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }}
                           formatter={(v) => `${(v * 100).toFixed(1)}%`} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {featureImportance.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#0A2540' : i < 3 ? '#1E3A8A' : '#10B981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">Upload Historical AQI Dataset</div>
            <p className="text-sm text-slate-600 mb-4">
              CSV columns: <span className="font-mono">pm25, pm10, no2, so2, co, o3, nh3, temperature, humidity, pressure, wind_speed, aqi</span>
            </p>
            <input ref={fileRef} type="file" accept=".csv" onChange={onUpload}
                   data-testid={ADMIN.uploadInput}
                   className="hidden" />
            <div className="flex items-center gap-3">
              <Button data-testid={ADMIN.uploadBtn} onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="rounded-md bg-[#0A2540] hover:bg-[#1E3A8A]">
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Choose CSV
              </Button>
              <Button variant="outline" data-testid={ADMIN.retrainBtn} onClick={onRetrain}
                      disabled={retraining}
                      className="rounded-md">
                {retraining ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                Retrain XGBoost
              </Button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">Uploaded Datasets</div>
            {datasets.length === 0 ? (
              <div className="text-sm text-slate-500">No datasets uploaded yet.</div>
            ) : (
              <div data-testid={ADMIN.datasetsTable} className="space-y-2">
                {datasets.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-md border border-slate-200 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <div>
                        <div className="text-sm font-medium">{d.filename}</div>
                        <div className="text-xs text-slate-500 font-mono">{new Date(d.uploaded_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-600">{d.rows} rows</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 card-elev">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Prediction Logs</div>
            <div className="text-xs text-slate-500 font-mono">latest {logs.length}</div>
          </div>
          {logs.length === 0 ? (
            <div className="text-sm text-slate-500">No predictions logged yet. Visit the Dashboard to generate one.</div>
          ) : (
            <div data-testid={ADMIN.logsTable} className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4 font-bold">When</th>
                    <th className="py-2 pr-4 font-bold">City</th>
                    <th className="py-2 pr-4 font-bold">Predicted AQI</th>
                    <th className="py-2 pr-4 font-bold">Category</th>
                    <th className="py-2 pr-4 font-bold">Conf.</th>
                    <th className="py-2 pr-4 font-bold">PM2.5</th>
                    <th className="py-2 pr-4 font-bold">Wind</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-xs font-mono text-slate-600">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{l.city}</td>
                      <td className="py-2 pr-4 font-mono font-semibold">{l.predicted_aqi}</td>
                      <td className="py-2 pr-4"><AQIBadge aqi={l.predicted_aqi} size="sm" /></td>
                      <td className="py-2 pr-4 font-mono text-xs">{(l.confidence * 100).toFixed(0)}%</td>
                      <td className="py-2 pr-4 font-mono text-xs">{(l.input_features?.pm25 ?? 0).toFixed(1)}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{(l.input_features?.wind_speed ?? 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function MetricCell({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 bg-slate-50/60">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 font-mono font-semibold text-lg text-[#0A2540]">{value}</div>
    </div>
  );
}

