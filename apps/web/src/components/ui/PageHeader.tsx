import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'animate-rise flex flex-wrap items-end justify-between gap-x-6 gap-y-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-h1 text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-base text-ink-2">{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto [&>button:not([aria-label])]:flex-1 sm:[&>button:not([aria-label])]:flex-none">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
