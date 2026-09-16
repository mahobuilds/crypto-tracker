import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from './Skeleton';

export interface ListRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Avatar or icon at the start. */
  leading?: ReactNode;
  title: ReactNode;
  /** Small element next to the title (a `Badge`). */
  titleAside?: ReactNode;
  subtitle?: ReactNode;
  /** Primary value at the end (money, price). */
  trailing?: ReactNode;
  /** Second line under the trailing value (`PnlText`, caption). */
  trailingSub?: ReactNode;
  /** Buttons after the trailing block; kept outside the press target. */
  actions?: ReactNode;
  /** Whole row is a button (hover fill, press scale). */
  onPress?: () => void;
  /** Tints the row (import errors). */
  tone?: 'default' | 'loss' | 'gain' | 'warn';
  /** Let the subtitle wrap instead of truncating (settings rows, error lists). */
  multiline?: boolean;
}

const TONE_CLASSES = {
  default: '',
  loss: 'bg-loss-soft/60',
  gain: 'bg-gain-soft/60',
  warn: 'bg-warn-soft/60',
} as const;

/**
 * 56 px+ row: leading avatar, title + subtitle, trailing value, optional actions.
 * Put rows inside `<ListGroup>` so a single hairline separates them (never two borders).
 */
const ListRowBase = forwardRef<HTMLDivElement, ListRowProps>(function ListRow(
  {
    leading,
    title,
    titleAside,
    subtitle,
    trailing,
    trailingSub,
    actions,
    onPress,
    tone = 'default',
    multiline = false,
    className,
    ...rest
  },
  ref,
) {
  const body = (
    <>
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] font-semibold text-ink">
          <span className="min-w-0 max-w-full truncate">{title}</span>
          {titleAside ? <span className="shrink-0">{titleAside}</span> : null}
        </span>
        {subtitle ? (
          <span
            className={cn(
              'text-caption text-ink-2 [&_svg]:inline [&_svg]:size-3.5 [&_svg]:align-[-2px]',
              multiline ? 'whitespace-normal' : 'truncate',
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing !== undefined || trailingSub ? (
        <span className="flex max-w-[45%] shrink-0 flex-col items-end gap-0.5 text-end">
          {trailing !== undefined ? (
            <span className="tabular text-[0.9375rem] font-semibold whitespace-nowrap text-ink">
              {trailing}
            </span>
          ) : null}
          {trailingSub ? (
            <span className="text-caption max-w-full truncate text-ink-2">{trailingSub}</span>
          ) : null}
        </span>
      ) : null}
    </>
  );

  return (
    <div
      ref={ref}
      className={cn('flex min-h-14 items-center gap-2', TONE_CLASSES[tone], className)}
      {...rest}
    >
      {onPress ? (
        <button
          type="button"
          onClick={onPress}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[var(--r-sm)] px-4 py-2.5 text-start transition-[background-color,transform] duration-150 ease-out hover:bg-surface-2 active:scale-[0.995] md:gap-3.5 md:px-6"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2.5 md:gap-3.5 md:px-6">
          {body}
        </div>
      )}
      {actions ? (
        <div className="-ms-2 flex shrink-0 items-center gap-0.5 pe-2 md:ms-0 md:pe-4">
          {actions}
        </div>
      ) : null}
    </div>
  );
});

export interface ListGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Stack of rows separated by one hairline each. */
export function ListGroup({ className, children, ...rest }: ListGroupProps) {
  return (
    <div className={cn('flex flex-col divide-y divide-line', className)} {...rest}>
      {children}
    </div>
  );
}

export interface ListLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Small uppercase group label between rows ("January 2026", "Active"). */
export function ListLabel({ className, children, ...rest }: ListLabelProps) {
  return (
    <div
      className={cn(
        'px-4 pt-4 pb-1.5 text-xs font-medium tracking-[0.06em] text-ink-3 uppercase md:px-6',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

function ListRowSkeleton({ rows = 1, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col divide-y divide-line', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-16 items-center gap-3.5 px-4 py-3 md:px-6">
          <Skeleton className="size-10" round />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const ListRow = Object.assign(ListRowBase, { Skeleton: ListRowSkeleton });
