import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CURRENCIES,
  CURRENCY_SYMBOLS,
  LANGUAGES,
  THEMES,
  type ChartKind,
  type Currency,
  type Language,
  type Settings,
  type Theme,
} from '@crypto-tracker/shared';
import {
  Button,
  Card,
  CardTitle,
  ErrorMessage,
  Field,
  PageHeader,
  Select,
  Spinner,
  Toggle,
} from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';
import { signOut } from '@/app/auth/client';

const LANGUAGE_LABEL_KEYS: Record<Language, string> = {
  en: 'settings.languageEnglish',
  ar: 'settings.languageArabic',
};

const THEME_LABEL_KEYS: Record<Theme, string> = {
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  system: 'settings.themeSystem',
};

const CHART_KIND_LABEL_KEYS: Record<ChartKind, string> = {
  line: 'settings.chartLine',
  pie: 'settings.chartPie',
};

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, settings, updateSettings, isSaving } = useSettings();
  const [lastPatch, setLastPatch] = useState<Partial<Settings> | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const applyPatch = useCallback(
    async (patch: Partial<Settings>) => {
      setLastPatch(patch);
      setSaveError(null);
      try {
        await updateSettings(patch);
      } catch {
        setSaveError(t('settings.saveFailed'));
      }
    },
    [t, updateSettings],
  );

  const retryLastPatch = useCallback(() => {
    if (lastPatch) {
      void applyPatch(lastPatch);
    }
  }, [applyPatch, lastPatch]);

  const languageOptions = LANGUAGES.map((language) => ({
    value: language,
    label: t(LANGUAGE_LABEL_KEYS[language]),
  }));

  const currencyOptions = CURRENCIES.map((currency) => ({
    value: currency,
    label: `${CURRENCY_SYMBOLS[currency]} ${currency}`,
  }));

  const themeOptions = THEMES.map((theme) => ({
    value: theme,
    label: t(THEME_LABEL_KEYS[theme]),
  }));

  const chartOrderOptions = settings.chartPrefs.order.map((kind) => ({
    value: kind,
    label: t(CHART_KIND_LABEL_KEYS[kind]),
  }));

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {t('settings.title')}
            {isSaving ? <Spinner size="sm" /> : null}
          </span>
        }
        subtitle={t('settings.subtitle')}
      />

      {saveError ? (
        <ErrorMessage className="mb-6" message={saveError} onRetry={retryLastPatch} />
      ) : null}

      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="size-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{user.name}</p>
                <p className="truncate text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
              </div>
            </div>
            <Button variant="secondary" size="lg" onClick={() => void signOut()}>
              {t('settings.signOut')}
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>{t('settings.displayTitle')}</CardTitle>
          <div className="mt-4 flex flex-col gap-5">
            <Field htmlFor="settings-language" label={t('settings.language')}>
              <Select
                id="settings-language"
                options={languageOptions}
                value={settings.language}
                onChange={(event) => void applyPatch({ language: event.target.value as Language })}
              />
            </Field>

            <Field htmlFor="settings-currency" label={t('settings.baseCurrency')}>
              <Select
                id="settings-currency"
                options={currencyOptions}
                value={settings.baseCurrency}
                onChange={(event) =>
                  void applyPatch({ baseCurrency: event.target.value as Currency })
                }
              />
            </Field>

            <Field htmlFor="settings-theme" label={t('settings.theme')}>
              <Select
                id="settings-theme"
                options={themeOptions}
                value={settings.theme}
                onChange={(event) => void applyPatch({ theme: event.target.value as Theme })}
              />
            </Field>

            <Toggle
              id="settings-large-text"
              checked={settings.largeText}
              onChange={(checked) => void applyPatch({ largeText: checked })}
              label={t('settings.largeText')}
              description={t('settings.largeTextHint')}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>{t('settings.alertsTitle')}</CardTitle>
          <div className="mt-4">
            <Toggle
              id="settings-alerts-enabled"
              checked={settings.alertsEnabled}
              onChange={(checked) => void applyPatch({ alertsEnabled: checked })}
              label={t('settings.alertsEnabled')}
              description={t('settings.alertsEnabledHint')}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>{t('settings.chartsTitle')}</CardTitle>
          <div className="mt-4 flex flex-col gap-5">
            <Toggle
              id="settings-chart-line"
              checked={settings.chartPrefs.lineChart}
              onChange={(checked) =>
                void applyPatch({
                  chartPrefs: { ...settings.chartPrefs, lineChart: checked },
                })
              }
              label={t('settings.chartLine')}
            />

            <Toggle
              id="settings-chart-pie"
              checked={settings.chartPrefs.pieChart}
              onChange={(checked) =>
                void applyPatch({
                  chartPrefs: { ...settings.chartPrefs, pieChart: checked },
                })
              }
              label={t('settings.chartPie')}
            />

            <Field htmlFor="settings-chart-order" label={t('settings.chartsShowFirst')}>
              <Select
                id="settings-chart-order"
                options={chartOrderOptions}
                value={settings.chartPrefs.order[0]}
                onChange={(event) => {
                  const first = event.target.value as ChartKind;
                  const rest = settings.chartPrefs.order.filter((kind) => kind !== first);
                  void applyPatch({
                    chartPrefs: { ...settings.chartPrefs, order: [first, ...rest] },
                  });
                }}
              />
            </Field>
          </div>
        </Card>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-500">
        {t('common.appName')} {t('settings.version')}
      </p>
    </>
  );
}
