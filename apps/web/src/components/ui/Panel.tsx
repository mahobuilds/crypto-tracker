import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type PanelTone = 'default' | 'accent' | 'gain' | 'loss' | 'warn';

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** No inner padding, for tables and edge-to-edge lists. */
  flush?: boolean;
  /** Tints the outer shell only. */
  tone?: PanelTone;
  /** Classes for the inner core (the content container). `className` styles the outer shell. */
  contentClassName?: string;
  children?: ReactNode;
}

const SHELL_TONE_CLASSES: Record<PanelTone, string> = {
  default: 'bg-surface-2 ring-black/5 dark:ring-white/8',
  accent: 'bg-accent-soft ring-accent/15',
  gain: 'bg-gain-soft ring-gain/15',
  loss: 'bg-loss-soft ring-loss/15',
  warn: 'bg-warn-soft ring-warn/15',
};

/** Outer shell of the double bezel: a tray the content plate sits in. */
export const panelShellClasses = 'rounded-[var(--r-lg)] p-1.5 ring-1';

/** Inner core of the double bezel: concentric radius (outer minus the 6 px shell padding). */
export const panelCoreClasses =
  'rounded-[calc(var(--r-lg)-6px)] bg-surface text-ink shadow-panel dark:shadow-panel';

export function PanelHeader({
  title,
  subtitle,
  actions,
  className,
}: Pick<PanelProps, 'title' | 'subtitle' | 'actions' | 'className'>) {
  if (!title && !actions) return null;
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {title ? <h2 className="text-h2 text-ink">{title}</h2> : null}
        {subtitle ? <p className="text-caption mt-0.5 text-ink-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  flush = false,
  tone = 'default',
  className,
  contentClassName,
  children,
  ...rest
}: PanelProps) {
  const hasHeader = Boolean(title || actions);
  return (
    <div className={cn(panelShellClasses, SHELL_TONE_CLASSES[tone], className)} {...rest}>
      <div className={cn(panelCoreClasses, flush ? 'overflow-hidden' : 'p-5 md:p-6')}>
        {hasHeader ? (
          <PanelHeader
            title={title}
            subtitle={subtitle}
            actions={actions}
            className={flush ? 'px-5 pt-5 pb-3 md:px-6 md:pt-6' : 'mb-4'}
          />
        ) : null}
        {contentClassName ? <div className={contentClassName}>{children}</div> : children}
      </div>
    </div>
  );
}
