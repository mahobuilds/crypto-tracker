import type { ReactNode } from 'react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  secondary?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, secondary, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-1', className)}>
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {secondary ? <span className="text-base">{secondary}</span> : null}
    </Card>
  );
}
