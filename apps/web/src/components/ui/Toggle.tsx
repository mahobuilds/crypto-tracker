import { forwardRef, useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Render only the switch; the label becomes its accessible name. */
  hideLabel?: boolean;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { checked, onChange, label, description, disabled = false, className, id, hideLabel = false },
  ref,
) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const labelId = `${baseId}-label`;
  const descriptionId = `${baseId}-description`;
  return (
    <div className={cn('flex min-h-12 items-center justify-between gap-4', className)}>
      <span className={cn('flex min-w-0 flex-col', hideLabel && 'sr-only')}>
        <span id={labelId} className="text-base font-medium text-ink">
          {label}
        </span>
        {description ? (
          <span id={descriptionId} className="text-caption text-ink-2">
            {description}
          </span>
        ) : null}
      </span>
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-8 w-13 shrink-0 items-center rounded-full p-0.5 transition-colors duration-220 ease-out disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-line hover:bg-ink-3/40 dark:bg-line dark:hover:bg-ink-3/50',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block size-7 rounded-full bg-surface shadow-[0_1px_2px_rgb(27_28_31_/_0.2)] transition-transform duration-220 ease-out',
            checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
});
