import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import { Button, ErrorMessage, Panel, SegmentedControl } from '@/components/ui';
import { applyLanguage, isLanguage } from '@/i18n';
import { storeLanguage } from '@/lib/language-storage';
import { signInWithGoogle } from './client';

export function SignInPage() {
  const { t, i18n } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const currentLanguage: Language = isLanguage(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : 'en';

  function chooseLanguage(language: Language) {
    storeLanguage(language);
    applyLanguage(language);
  }

  async function handleSignIn() {
    setSubmitting(true);
    setFailed(false);
    try {
      await signInWithGoogle();
    } catch {
      setFailed(true);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-8">
      <Panel
        className="animate-rise w-full max-w-[26rem]"
        contentClassName="flex flex-col items-center gap-5 py-4 text-center"
      >
        <span className="flex size-16 items-center justify-center rounded-[20px] bg-accent text-accent-ink">
          <Icon.ChartLineUp weight="fill" size={32} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-display">{t('auth.title')}</h1>
          <p className="text-base text-ink-2">{t('auth.subtitle')}</p>
        </div>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          loading={submitting}
          onClick={() => void handleSignIn()}
          className="mt-1"
        >
          <Icon.Google size={22} />
          {t('auth.continueWithGoogle')}
        </Button>
        {failed ? <ErrorMessage className="w-full" message={t('auth.signInFailed')} /> : null}
        <SegmentedControl
          size="sm"
          label={t('common.language')}
          value={currentLanguage}
          onChange={chooseLanguage}
          options={[
            { value: 'en', label: <span lang="en">{t('common.english', { lng: 'en' })}</span> },
            { value: 'ar', label: <span lang="ar">{t('common.arabic', { lng: 'ar' })}</span> },
          ]}
        />
      </Panel>
    </main>
  );
}
