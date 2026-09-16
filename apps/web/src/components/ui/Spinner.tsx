import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'size-4 border-2',
  md: 'size-6 border-[3px]',
  lg: 'size-10 border-4',
};

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

/** Inline activity indicator for buttons and small inline waits. Pages use `Skeleton`. */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  const { t } = useTranslation();
  return (
    <span
      role="status"
      aria-label={t('common.loading')}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-e-transparent text-accent',
        SIZE_CLASSES[size],
        className,
      )}
    />
  );
}
