import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** `positive` / `negative` / `info` are kept as aliases of `gain` / `loss` / `accent`. */
export type BadgeTone =
  'neutral' | 'gain' | 'loss' | 'warn' | 'accent' | 'positive' | 'negative' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  gain: 'bg-gain-soft text-gain',
  loss: 'bg-loss-soft text-loss',
  warn: 'bg-warn-soft text-warn',
  accent: 'bg-accent-soft text-accent',
  positive: 'bg-gain-soft text-gain',
  negative: 'bg-loss-soft text-loss',
  info: 'bg-accent-soft text-accent',
};

export function Badge({ tone = 'neutral', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {icon ? <span className="-ms-0.5 inline-flex [&>svg]:size-3.5">{icon}</span> : null}
      {children}
    </span>
  );
}
