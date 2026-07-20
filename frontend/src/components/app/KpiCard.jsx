import React from 'react';

export default function KpiCard({ label, value, unit, icon: Icon, hint, accent, className = '', testId }) {
  return (
    <div data-testid={testId}
         className={`bg-white border border-slate-200 rounded-lg p-5 card-elev card-hover ${className}`}>
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</div>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <div className="font-mono font-bold text-3xl text-[#0A2540] leading-none">{value}</div>
        {unit && <div className="text-xs text-slate-500 font-mono">{unit}</div>}
      </div>
      {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
      {accent}
    </div>
  );
}
