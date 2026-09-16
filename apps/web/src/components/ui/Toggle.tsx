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
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { checked, onChange, label, description, disabled = false, className, id },
  ref,
) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const labelId = `${baseId}-label`;
  const descriptionId = `${baseId}-description`;
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <span className="flex min-w-0 flex-col">
        <span id={labelId} className="text-base font-medium">
          {label}
        </span>
        {description ? (
          <span id={descriptionId} className="text-sm text-slate-600 dark:text-slate-400">
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
          'touch-target relative inline-flex w-16 shrink-0 items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block size-8 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-7 rtl:-translate-x-7' : 'translate-x-0.5 rtl:-translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
});
