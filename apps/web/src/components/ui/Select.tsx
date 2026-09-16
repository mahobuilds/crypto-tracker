import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons';
import { inputClasses } from './Input';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, className, invalid, ...rest },
  ref,
) {
  return (
    <div className={cn('relative', className)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(inputClasses, 'appearance-none pe-11')}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-ink-2">
        <Icon.CaretDown weight="bold" size={16} />
      </span>
    </div>
  );
});
