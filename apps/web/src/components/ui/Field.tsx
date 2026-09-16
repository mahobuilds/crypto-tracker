import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons';

export interface FieldProps {
  /** Id of the control this field labels. */
  htmlFor: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function fieldDescriptionId(htmlFor: string): string {
  return `${htmlFor}-description`;
}

export function fieldErrorId(htmlFor: string): string {
  return `${htmlFor}-error`;
}

export function Field({ htmlFor, label, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="text-label text-ink">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={fieldDescriptionId(htmlFor)} className="text-caption text-ink-2">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={fieldErrorId(htmlFor)}
          role="alert"
          className="text-caption flex items-start gap-1.5 font-medium text-loss"
        >
          <span className="mt-px shrink-0">
            <Icon.Warning weight="bold" size={16} />
          </span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
