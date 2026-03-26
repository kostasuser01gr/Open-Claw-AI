import React from 'react';

export interface FleetFilterOptions {
  carType: string;
  transmission: string;
  availability: string;
  maxPrice: number;
}

export function FleetFilters({ filters, setFilters }: { filters: FleetFilterOptions, setFilters: (f: FleetFilterOptions) => void }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Car Type</label>
        <select 
          value={filters.carType}
          onChange={(e) => setFilters({ ...filters, carType: e.target.value })}
          className="bg-bg border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500/50 text-text"
        >
          <option value="all">All Types</option>
          <option value="compact">Compact</option>
          <option value="economy">Economy</option>
          <option value="sedan">Sedan</option>
          <option value="suv">SUV</option>
          <option value="truck">Truck</option>
          <option value="minivan">Minivan</option>
          <option value="luxury">Luxury</option>
          <option value="sports">Sports</option>
          <option value="convertible">Convertible</option>
          <option value="electric">Electric</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Transmission</label>
        <select 
          value={filters.transmission}
          onChange={(e) => setFilters({ ...filters, transmission: e.target.value })}
          className="bg-bg border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500/50 text-text"
        >
          <option value="all">Any</option>
          <option value="automatic">Automatic</option>
          <option value="manual">Manual</option>
          <option value="cvt">CVT</option>
          <option value="dual-clutch">Dual-Clutch</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Availability</label>
        <select 
          value={filters.availability}
          onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
          className="bg-bg border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500/50 text-text"
        >
          <option value="all">Any Status</option>
          <option value="available">Available Now</option>
          <option value="rented">Currently Rented</option>
          <option value="maintenance">In Maintenance</option>
          <option value="incident">Reported Incident</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Max Price ($/day)</label>
        <div className="flex items-center gap-3">
          <input 
            type="range" 
            min="20" 
            max="2000" 
            step="10"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
            className="w-32 accent-orange-500 h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs font-mono w-12 text-orange-500 font-bold">${filters.maxPrice}</span>
        </div>
      </div>
    </>
  );
}
