import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  /** Icon rendered in its own 28 px circle flush to the end padding (the nested-CTA pattern). */
  trailingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink hover:brightness-105 active:brightness-95 disabled:opacity-50',
  secondary:
    'bg-surface-2 text-ink ring-1 ring-black/5 hover:bg-line/70 active:bg-line dark:ring-white/8 dark:hover:bg-line/60 disabled:opacity-50',
  danger:
    'bg-loss-soft text-loss hover:bg-loss hover:text-white active:brightness-95 disabled:opacity-50',
  ghost: 'bg-transparent text-ink hover:bg-surface-2 active:bg-line/70 disabled:opacity-50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-base',
  lg: 'h-13 px-6 text-base',
};

const TRAILING_CIRCLE_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-white/15 dark:bg-black/10',
  secondary: 'bg-black/5 dark:bg-white/10',
  danger: 'bg-loss/10',
  ghost: 'bg-black/5 dark:bg-white/10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    trailingIcon,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,filter,transform,opacity] duration-150 ease-out select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        trailingIcon ? 'pe-2' : null,
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      <span className={cn('inline-flex items-center justify-center gap-2', loading && 'invisible')}>
        {children}
      </span>
      {trailingIcon ? (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-transform duration-150 ease-out group-hover/button:translate-x-0.5 rtl:group-hover/button:-translate-x-0.5',
            TRAILING_CIRCLE_CLASSES[variant],
            loading && 'invisible',
          )}
        >
          {trailingIcon}
        </span>
      ) : null}
      {loading ? (
        <span className="absolute inset-0 inline-flex items-center justify-center">
          <Spinner size="sm" className="text-current" />
        </span>
      ) : null}
    </button>
  );
});
