import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Colors the label when selected (Buy = gain, Sell = loss). */
  tone?: 'default' | 'gain' | 'loss';
  'aria-label'?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

const SELECTED_TONE: Record<NonNullable<SegmentedOption<string>['tone']>, string> = {
  default: 'text-ink',
  gain: 'text-gain',
  loss: 'text-loss',
};

/**
 * Pill track with a sliding selected pill. Keyboard: arrows move the selection.
 * Used for Buy/Sell, `$`/`%`, chart ranges, above/below, theme, language.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const selected = track.querySelector<HTMLElement>('[aria-checked="true"]');
      if (!selected) return setPill(null);
      setPill({ x: selected.offsetLeft, w: selected.offsetWidth });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => observer.disconnect();
  }, [value, options.length]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((o) => o.value === value);
    if (index < 0) return;
    const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = isRtl ? 'ArrowRight' : 'ArrowLeft';
    let next = index;
    if (event.key === forward || event.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (event.key === backward || event.key === 'ArrowUp')
      next = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else return;
    event.preventDefault();
    const option = options[next];
    if (option) {
      onChange(option.value);
      event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
    }
  }

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative isolate inline-flex shrink-0 gap-0.5 rounded-full bg-surface-2 p-[3px] ring-1 ring-black/5 dark:ring-white/8',
        fullWidth && 'flex w-full',
        className,
      )}
    >
      {pill ? (
        <span
          aria-hidden="true"
          className="absolute top-[3px] bottom-[3px] left-0 -z-10 rounded-full bg-surface shadow-panel transition-[transform,width] duration-200 ease-[var(--ease-out)]"
          style={{ transform: `translateX(${pill.x - 3}px)`, width: pill.w }}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option['aria-label']}
            id={`${groupId}-${option.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-[color,transform] duration-150 ease-out select-none active:scale-[0.98]',
              size === 'sm'
                ? 'h-8 px-3 text-[0.8125rem]'
                : 'h-[calc(var(--touch-target)-6px)] px-4 text-[0.9375rem]',
              fullWidth && 'flex-1',
              selected ? SELECTED_TONE[option.tone ?? 'default'] : 'text-ink-2 hover:text-ink',
              '[&>svg]:size-4',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
