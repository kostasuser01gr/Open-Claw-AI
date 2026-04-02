import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Calendar, Car, Clock, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AppDataState, MaintenanceRecord, Vehicle } from '@/types/domain';
import { StatCard } from './StatCard';

interface KPIModuleProps {
  vehicles: Vehicle[];
  reservations: AppDataState['reservations'];
  maintenance: MaintenanceRecord[];
}

interface ChartFrameProps {
  children: (size: { width: number; height: number }) => ReactNode;
  heightClassName: string;
  minHeight: number;
}

function ChartFrame({ children, heightClassName, minHeight }: ChartFrameProps) {
  const hasResizeObserver = typeof ResizeObserver !== 'undefined';
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(hasResizeObserver ? null : { width: 800, height: minHeight });

  useLayoutEffect(() => {
    if (!hasResizeObserver) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const syncSize = () => {
      const { width, height } = container.getBoundingClientRect();
      const nextWidth = Math.floor(width);
      const nextHeight = Math.max(Math.floor(height), minHeight);

      if (nextWidth <= 0 || nextHeight <= 0) {
        return;
      }

      setSize((current) => {
        if (current?.width === nextWidth && current.height === nextHeight) {
          return current;
        }

        return { width: nextWidth, height: nextHeight };
      });
    };

    syncSize();
    const frameId = window.requestAnimationFrame(syncSize);
    const observer = new ResizeObserver(syncSize);
    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [hasResizeObserver, minHeight]);

  return (
    <div ref={containerRef} className={`${heightClassName} min-w-0`}>
      {size ? children(size) : <div aria-hidden="true" className="h-full w-full rounded-xl border border-border/40 bg-background/20" />}
    </div>
  );
}

export function KPIModule({ vehicles, reservations, maintenance }: KPIModuleProps) {
  const chartData = [
    { name: 'Fleet', value: vehicles.length },
    { name: 'Bookings', value: reservations.length },
    { name: 'Maintenance', value: maintenance.length },
  ];

  const pieData = [
    { name: 'Available', value: vehicles.filter((vehicle) => vehicle.status === 'available').length },
    { name: 'Rented', value: vehicles.filter((vehicle) => vehicle.status === 'rented').length },
    { name: 'Maintenance', value: vehicles.filter((vehicle) => vehicle.status === 'maintenance').length },
  ];

  const avgUtilization =
    vehicles.length === 0 ? 0 : Math.round((vehicles.filter((vehicle) => vehicle.status === 'rented').length / vehicles.length) * 100);
  const avgBookingValue =
    reservations.length === 0 ? 0 : Math.round(reservations.reduce((sum, entry) => sum + entry.totalPrice, 0) / reservations.length);
  const downtime =
    vehicles.length === 0 ? 0 : Math.round((vehicles.filter((vehicle) => vehicle.status === 'maintenance').length / vehicles.length) * 100);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Avg Utilization" value={`${avgUtilization}%`} icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard title="Avg Booking Value" value={`$${avgBookingValue}`} icon={<Calendar className="w-4 h-4" />} />
        <StatCard title="Fleet Downtime" value={`${downtime}%`} icon={<Clock className="w-4 h-4" />} color="text-red-500" />
        <StatCard
          title="Active Rentals"
          value={vehicles.filter((vehicle) => vehicle.status === 'rented').length}
          icon={<Car className="w-4 h-4" />}
          color="text-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-label="Operations overview chart" className="min-w-0 p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Operations Overview</h3>
          <ChartFrame heightClassName="h-[300px]" minHeight={300}>
            {({ width, height }) => (
              <BarChart width={width} height={height} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ChartFrame>
        </section>

        <section aria-label="Fleet status mix chart" className="min-w-0 p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Fleet Status Mix</h3>
          <ChartFrame heightClassName="h-[300px]" minHeight={300}>
            {({ width, height }) => (
              <PieChart width={width} height={height}>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={Math.max(Math.min(Math.floor(width / 3), 100), 72)}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={['#f97316', '#3b82f6', '#10b981'][index % 3]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              </PieChart>
            )}
          </ChartFrame>
        </section>

        <section aria-label="Trend line chart" className="min-w-0 p-6 bg-surface/50 rounded-2xl border border-border space-y-4 lg:col-span-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Trend Line</h3>
          <ChartFrame heightClassName="h-[280px]" minHeight={280}>
            {({ width, height }) => (
              <AreaChart
                width={width}
                height={height}
                data={[
                  { name: 'Mon', revenue: avgBookingValue * 2, utilization: Math.max(avgUtilization - 8, 0) },
                  { name: 'Tue', revenue: avgBookingValue * 2.2, utilization: Math.max(avgUtilization - 4, 0) },
                  { name: 'Wed', revenue: avgBookingValue * 2.4, utilization: avgUtilization },
                  { name: 'Thu', revenue: avgBookingValue * 2.6, utilization: Math.min(avgUtilization + 6, 100) },
                  { name: 'Fri', revenue: avgBookingValue * 3, utilization: Math.min(avgUtilization + 10, 100) },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="#f9731630" />
                <Line type="monotone" dataKey="utilization" stroke="#22c55e" strokeWidth={2} />
              </AreaChart>
            )}
          </ChartFrame>
        </section>
      </div>
    </div>
  );
}
