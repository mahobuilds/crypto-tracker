import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons';
import { Button } from './Button';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onRetry, className }: ErrorMessageProps) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-[var(--r-md)] bg-loss-soft p-4 text-loss sm:flex-row sm:items-center',
        className,
      )}
    >
      <Icon.WarningCircle className="shrink-0" weight="fill" size={22} />
      <p className="flex-1 text-base font-medium">{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="self-start sm:self-auto">
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  );
}
