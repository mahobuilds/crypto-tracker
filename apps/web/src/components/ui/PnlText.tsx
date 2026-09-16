import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { pnlTone } from '@/lib/format';

export interface PnlTextProps {
  /** The profit/loss value that decides the color; formatting (with sign) is the caller's job. */
  value: number;
  children: ReactNode;
  className?: string;
  /** Show the up/down arrow so the direction never relies on color alone. Default true. */
  arrow?: boolean;
  /** Arrow size in px. */
  iconSize?: number;
}

const TONE_CLASSES = {
  positive: 'text-gain',
  negative: 'text-loss',
  neutral: 'text-ink-2',
} as const;

const TONE_LABEL_KEYS = {
  positive: 'common.profit',
  negative: 'common.loss',
  neutral: 'common.unchanged',
} as const;

export function PnlText({ value, children, className, arrow = true, iconSize = 16 }: PnlTextProps) {
  const { t } = useTranslation();
  const tone = pnlTone(value);
  const Arrow =
    tone === 'positive' ? Icon.ArrowUpRight : tone === 'negative' ? Icon.ArrowDownRight : null;
  return (
    <span
      aria-label={t(TONE_LABEL_KEYS[tone])}
      className={cn(
        'tabular inline-flex items-center gap-0.5 font-medium',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {arrow && Arrow ? <Arrow size={iconSize} weight="bold" className="shrink-0" /> : null}
      {children}
    </span>
  );
}
