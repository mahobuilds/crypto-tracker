import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { SearchIcon } from '@/components/icons';
import { EmptyState } from '@/components/ui';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={<SearchIcon className="size-7" />}
      title={t('errors.notFound')}
      action={
        <Link
          to="/"
          className="touch-target inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-indigo-700"
        >
          {t('common.goHome')}
        </Link>
      }
    />
  );
}
