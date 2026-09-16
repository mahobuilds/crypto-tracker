import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Icon } from '@/components/icons';
import { Button, EmptyState, Panel } from '@/components/ui';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Panel>
      <EmptyState
        icon={<Icon.MagnifyingGlass />}
        title={t('errors.notFound')}
        action={<Button onClick={() => void navigate('/')}>{t('common.goHome')}</Button>}
      />
    </Panel>
  );
}
