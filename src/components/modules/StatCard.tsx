import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
}

export function StatCard({ title, value, icon, color = 'text-orange-500' }: StatCardProps) {
  return (
    <div className="p-4 bg-surface/50 rounded-xl border border-border flex items-center gap-4">
      <div className={cn('p-2 rounded-lg bg-border/50', color)}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
