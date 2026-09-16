import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type IconButtonVariant = 'ghost' | 'secondary' | 'danger';
export type IconButtonSize = 'sm' | 'md';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: the icon carries no text, so the button needs an accessible name. */
  'aria-label': string;
  variant?: IconButtonVariant;
  /** `md` is the 44 px default; `sm` is 36 px for dense rows (still inside a 44 px hit area). */
  size?: IconButtonSize;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink active:bg-line/70',
  secondary:
    'bg-surface-2 text-ink ring-1 ring-black/5 hover:bg-line/70 active:bg-line dark:ring-white/8',
  danger: 'text-loss hover:bg-loss-soft active:bg-loss-soft',
};

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  md: 'size-11',
  sm: 'size-9',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', className, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 ease-out select-none active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        // Keep a 44 px hit area even for the small size.
        size === 'sm' && 'after:absolute after:-inset-1 after:rounded-full after:content-[""]',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
