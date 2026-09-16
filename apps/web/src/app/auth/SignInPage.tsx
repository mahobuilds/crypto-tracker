import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@crypto-tracker/shared';
import type { Language } from '@crypto-tracker/shared';
import { GoogleIcon } from '@/components/icons';
import { Button, Card, ErrorMessage } from '@/components/ui';
import { applyLanguage, isLanguage } from '@/i18n';
import { cn } from '@/lib/cn';
import { storeLanguage } from '@/lib/language-storage';
import { signInWithGoogle } from './client';

const LANGUAGE_LABEL_KEYS: Record<Language, string> = {
  en: 'common.english',
  ar: 'common.arabic',
};

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
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <Card className="flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
        <img src="/icons/icon.svg" alt="" width={80} height={80} className="size-20 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('auth.title')}</h1>
          <p className="text-base text-slate-600 dark:text-slate-400">{t('auth.subtitle')}</p>
        </div>
        <Button size="lg" fullWidth loading={submitting} onClick={() => void handleSignIn()}>
          <GoogleIcon className="size-6 shrink-0 rounded-full bg-white p-0.5" />
          {t('auth.continueWithGoogle')}
        </Button>
        {failed ? <ErrorMessage className="w-full" message={t('auth.signInFailed')} /> : null}
        <div
          role="group"
          aria-label={t('common.language')}
          className="flex w-full justify-center gap-2 border-t border-slate-200 pt-6 dark:border-slate-800"
        >
          {LANGUAGES.map((language) => {
            const active = language === currentLanguage;
            return (
              <button
                key={language}
                type="button"
                lang={language}
                aria-pressed={active}
                onClick={() => chooseLanguage(language)}
                className={cn(
                  'touch-target rounded-xl px-4 py-2 text-base font-medium transition-colors',
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {t(LANGUAGE_LABEL_KEYS[language], { lng: language })}
              </button>
            );
          })}
        </div>
      </Card>
    </main>
  );
}
