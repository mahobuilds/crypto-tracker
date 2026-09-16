import { useState } from 'react';
import { cn } from '@/lib/cn';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** Text used for the monogram fallback (first character) and the alt text. */
  label: string;
  /** Image URL (coin thumb, Google avatar). Falls back to the monogram on error. */
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-7 text-[11px]',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
};

/** Circular coin/user avatar: image when available, else a letter monogram on the accent tint. */
export function Avatar({ label, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft font-semibold text-accent uppercase select-none',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={label}
          className="size-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{label.trim().charAt(0) || '?'}</span>
      )}
    </span>
  );
}
