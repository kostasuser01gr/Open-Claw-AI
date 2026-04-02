import { cn } from '@/lib/utils';

function Pulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-hover', className)} style={style} />;
}

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Pulse className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-4 w-2/3" />
          <Pulse className="h-3 w-1/3" />
        </div>
      </div>
      <Pulse className="h-20 w-full" />
      <div className="flex gap-2">
        <Pulse className="h-8 w-20 rounded-xl" />
        <Pulse className="h-8 w-16 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <Pulse className="h-5 w-40" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Pulse className="h-4 w-24" />
            <Pulse className="h-4 w-32 flex-1" />
            <Pulse className="h-4 w-20" />
            <Pulse className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <Pulse className="h-5 w-36" />
      <div className="flex items-end gap-2 h-40">
        {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
          <Pulse key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonModule() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <Pulse className="h-7 w-48" />
        <Pulse className="h-9 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 space-y-2">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-8 w-16" />
          </div>
        ))}
      </div>
      <SkeletonTable />
    </div>
  );
}
