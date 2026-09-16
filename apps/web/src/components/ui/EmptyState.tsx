import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-1 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent [&>svg]:size-7">
          {icon}
        </div>
      ) : null}
      <h3 className="text-h2">{title}</h3>
      {description ? <p className="max-w-[32ch] text-base text-ink-2">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
