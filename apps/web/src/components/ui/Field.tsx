import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

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
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-base font-medium text-slate-800 dark:text-slate-200">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={fieldDescriptionId(htmlFor)} className="text-sm text-slate-600 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={fieldErrorId(htmlFor)}
          role="alert"
          className="text-sm font-medium text-red-700 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
