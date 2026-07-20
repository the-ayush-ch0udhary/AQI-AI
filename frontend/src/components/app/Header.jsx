import React, { useState } from 'react';
import { MapPin, Locate, ChevronDown, RefreshCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NAV } from '../../constants/testIds';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';

export default function Header({ onRefresh }) {
  const { cities, location, setLocation, detectLocation, geoStatus } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Government of India · CPCB Compliant</div>
          <h1 className="font-display font-bold text-lg text-[#0A2540] leading-tight">Air Quality Command Center</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={detectLocation}
                data-testid={NAV.useLocationBtn}
                className="rounded-md">
          <Locate className="h-4 w-4 mr-1.5" />
          {geoStatus === 'pending' ? 'Detecting…' : 'Use my location'}
        </Button>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button data-testid={NAV.citySelector}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white hover:border-slate-300 transition-colors">
              <MapPin className="h-4 w-4 text-[#0A2540]" />
              <span className="text-sm font-medium">{location.city}</span>
              {location.state && <span className="text-xs text-slate-500">· {location.state}</span>}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
              Indian Cities
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {cities.map((c) => (
              <DropdownMenuItem key={c.city}
                data-testid={`city-option-${c.city.toLowerCase()}`}
                onClick={() => { setLocation({ city: c.city, state: c.state, lat: c.lat, lon: c.lon }); setOpen(false); }}
                className="cursor-pointer">
                <MapPin className="h-3.5 w-3.5 mr-2 text-slate-400" />
                <span className="flex-1">{c.city}</span>
                <span className="text-xs text-slate-500">{c.state}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {onRefresh && (
          <Button variant="ghost" size="icon" onClick={onRefresh} data-testid="refresh-btn"
                  className="rounded-md">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
