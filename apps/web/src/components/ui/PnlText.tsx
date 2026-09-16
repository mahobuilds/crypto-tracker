import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { pnlTone } from '@/lib/format';

export interface PnlTextProps {
  /** The profit/loss value that decides the color; formatting (with sign) is the caller's job. */
  value: number;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES = {
  positive: 'text-green-700 dark:text-green-400',
  negative: 'text-red-700 dark:text-red-400',
  neutral: 'text-slate-700 dark:text-slate-300',
} as const;

const TONE_LABEL_KEYS = {
  positive: 'common.profit',
  negative: 'common.loss',
  neutral: 'common.unchanged',
} as const;

export function PnlText({ value, children, className }: PnlTextProps) {
  const { t } = useTranslation();
  const tone = pnlTone(value);
  return (
    <span
      aria-label={t(TONE_LABEL_KEYS[tone])}
      className={cn('font-semibold', TONE_CLASSES[tone], className)}
    >
      {children}
    </span>
  );
}
