import React from 'react';
import { categoryFor } from '../../lib/aqi';

export function AQIBadge({ aqi, showLabel = true, size = 'md', className = '' }) {
  const cat = categoryFor(aqi);
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[10px]' :
                  size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wider ${cat.cls} ${sizeCls} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {showLabel ? cat.name : aqi}
    </span>
  );
}

export function AQIDot({ aqi, size = 10 }) {
  const cat = categoryFor(aqi);
  return <span style={{ background: cat.hex, width: size, height: size }}
               className="inline-block rounded-full" />;
}
