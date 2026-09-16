import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from './Skeleton';

export type StatTone = 'default' | 'gain' | 'loss';

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Secondary line under the value: a `PnlText` delta, a caption, or both. */
  delta?: ReactNode;
  hint?: ReactNode;
  /** Extra line under the delta (a second figure, e.g. the same number by another method). */
  secondary?: ReactNode;
  /** Colors the value itself (profit/loss figures). */
  tone?: StatTone;
  /** The hero figure: larger type. */
  emphasis?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<StatTone, string> = {
  default: 'text-ink',
  gain: 'text-gain',
  loss: 'text-loss',
};

/** Label over a big tabular number. Compose several inside one `Panel` for a summary row. */
export function StatCard({
  label,
  value,
  delta,
  hint,
  secondary,
  tone = 'default',
  emphasis = false,
  className,
}: StatCardProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-label text-ink-2">{label}</span>
      <span
        className={cn(
          'tabular truncate leading-[1.1] font-semibold tracking-[-0.02em]',
          emphasis ? 'text-display' : 'text-[1.5rem] md:text-[1.75rem]',
          TONE_CLASSES[tone],
        )}
      >
        {value}
      </span>
      {delta || hint ? (
        <span className="text-caption flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ink-3">
          {delta}
          {hint ? <span>{hint}</span> : null}
        </span>
      ) : null}
      {secondary ? <span className="text-caption text-ink-2">{secondary}</span> : null}
    </div>
  );
}

StatCard.Skeleton = function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
};
