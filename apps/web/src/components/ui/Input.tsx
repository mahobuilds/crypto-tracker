import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Shared control chrome: 48 px, small radius, hairline ring, accent focus ring. */
export const inputClasses =
  'h-12 w-full rounded-[var(--r-sm)] bg-surface px-4 text-base text-ink ring-1 ring-line outline-none transition-[box-shadow,background-color] duration-150 ease-out placeholder:text-ink-3 hover:ring-ink-3/60 focus:ring-2 focus:ring-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-2 aria-invalid:ring-loss aria-invalid:focus:ring-loss';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

function isNumeric(type: string | undefined, inputMode: string | undefined): boolean {
  return type === 'number' || inputMode === 'decimal' || inputMode === 'numeric';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, type, inputMode, ...rest },
  ref,
) {
  const numeric = isNumeric(type, inputMode);
  return (
    <input
      ref={ref}
      type={type}
      inputMode={inputMode ?? (type === 'number' ? 'decimal' : undefined)}
      aria-invalid={invalid || undefined}
      className={cn(inputClasses, numeric && 'tabular text-end', className)}
      {...rest}
    />
  );
});
