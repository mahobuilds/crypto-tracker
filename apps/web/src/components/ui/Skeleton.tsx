import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Rounded-full for avatars and pills. */
  round?: boolean;
}

/** Shimmer block shaped like the content it stands in for. Pages use these instead of spinners. */
export function Skeleton({ className, round = false, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-skeleton bg-surface-2',
        round ? 'rounded-full' : 'rounded-[var(--r-sm)]',
        className,
      )}
      {...rest}
    />
  );
}
