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

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const { t } = useTranslation();
  return (
    <span
      role="status"
      aria-label={t('common.loading')}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-e-transparent text-indigo-600 dark:text-indigo-400',
        SIZE_CLASSES[size],
        className,
      )}
    />
  );
}
