import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CURRENCIES,
  CURRENCY_SYMBOLS,
  type ChartKind,
  type Settings,
} from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import {
  Avatar,
  Button,
  ErrorMessage,
  ListGroup,
  ListRow,
  PageHeader,
  Panel,
  SegmentedControl,
  Select,
  Spinner,
  Toggle,
} from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';
import { signOut } from '@/app/auth/client';

function SettingRow({
  title,
  subtitle,
  control,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  control: ReactNode;
}) {
  return (
    <ListRow
      multiline
      title={title}
      subtitle={subtitle}
      actions={<div className="flex items-center ps-2">{control}</div>}
    />
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, settings, updateSettings, isSaving } = useSettings();
  const [lastPatch, setLastPatch] = useState<Partial<Settings> | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

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

  const currencyOptions = CURRENCIES.map((currency) => ({
    value: currency,
    label: `${CURRENCY_SYMBOLS[currency]} ${currency}`,
  }));

  const firstChart: ChartKind = settings.chartPrefs.order[0] ?? 'line';

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
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
        <ErrorMessage message={saveError} onRetry={() => lastPatch && void applyPatch(lastPatch)} />
      ) : null}

      <Panel flush className="animate-rise" style={{ '--i': 1 } as React.CSSProperties}>
        <ListRow
          leading={<Avatar label={user.name} src={user.image} size="lg" />}
          title={user.name}
          subtitle={user.email}
        />
      </Panel>

      <Panel
        flush
        title={t('settings.displayTitle')}
        className="animate-rise"
        style={{ '--i': 2 } as React.CSSProperties}
      >
        <ListGroup className="pb-2">
          <SettingRow
            title={t('settings.language')}
            control={
              <SegmentedControl
                size="sm"
                label={t('settings.language')}
                value={settings.language}
                onChange={(language) => void applyPatch({ language })}
                options={[
                  { value: 'en', label: <span lang="en">{t('settings.languageEnglish')}</span> },
                  { value: 'ar', label: <span lang="ar">{t('settings.languageArabic')}</span> },
                ]}
              />
            }
          />
          <SettingRow
            title={t('settings.baseCurrency')}
            subtitle={t('settings.baseCurrencyHint')}
            control={
              <Select
                aria-label={t('settings.baseCurrency')}
                options={currencyOptions}
                value={settings.baseCurrency}
                onChange={(event) =>
                  void applyPatch({ baseCurrency: event.target.value as Settings['baseCurrency'] })
                }
                className="h-10 w-28 text-sm"
              />
            }
          />
          <SettingRow
            title={t('settings.theme')}
            control={
              <SegmentedControl
                size="sm"
                label={t('settings.theme')}
                value={settings.theme}
                onChange={(theme) => void applyPatch({ theme })}
                options={[
                  {
                    value: 'light',
                    label: '',
                    icon: <Icon.Sun />,
                    'aria-label': t('settings.themeLight'),
                  },
                  {
                    value: 'dark',
                    label: '',
                    icon: <Icon.Moon />,
                    'aria-label': t('settings.themeDark'),
                  },
                  { value: 'system', label: t('settings.themeSystemShort') },
                ]}
              />
            }
          />
          <SettingRow
            title={t('settings.largeText')}
            subtitle={t('settings.largeTextHint')}
            control={
              <Toggle
                checked={settings.largeText}
                onChange={(largeText) => void applyPatch({ largeText })}
                label={t('settings.largeText')}
                hideLabel
              />
            }
          />
        </ListGroup>
      </Panel>

      <Panel
        flush
        title={t('settings.alertsTitle')}
        className="animate-rise"
        style={{ '--i': 3 } as React.CSSProperties}
      >
        <ListGroup className="pb-2">
          <SettingRow
            title={t('settings.alertsEnabled')}
            subtitle={t('settings.alertsEnabledHint')}
            control={
              <Toggle
                checked={settings.alertsEnabled}
                onChange={(alertsEnabled) => void applyPatch({ alertsEnabled })}
                label={t('settings.alertsEnabled')}
                hideLabel
              />
            }
          />
        </ListGroup>
      </Panel>

      <Panel
        flush
        title={t('settings.chartsTitle')}
        className="animate-rise"
        style={{ '--i': 4 } as React.CSSProperties}
      >
        <ListGroup className="pb-2">
          <SettingRow
            title={t('settings.chartLine')}
            control={
              <Toggle
                checked={settings.chartPrefs.lineChart}
                onChange={(lineChart) =>
                  void applyPatch({ chartPrefs: { ...settings.chartPrefs, lineChart } })
                }
                label={t('settings.chartLine')}
                hideLabel
              />
            }
          />
          <SettingRow
            title={t('settings.chartPie')}
            control={
              <Toggle
                checked={settings.chartPrefs.pieChart}
                onChange={(pieChart) =>
                  void applyPatch({ chartPrefs: { ...settings.chartPrefs, pieChart } })
                }
                label={t('settings.chartPie')}
                hideLabel
              />
            }
          />
          <SettingRow
            title={t('settings.chartsShowFirst')}
            control={
              <SegmentedControl
                size="sm"
                label={t('settings.chartsShowFirst')}
                value={firstChart}
                onChange={(kind) =>
                  void applyPatch({
                    chartPrefs: {
                      ...settings.chartPrefs,
                      order: kind === 'line' ? ['line', 'pie'] : ['pie', 'line'],
                    },
                  })
                }
                options={[
                  { value: 'line', label: t('settings.chartLineShort') },
                  { value: 'pie', label: t('settings.chartPieShort') },
                ]}
              />
            }
          />
        </ListGroup>
      </Panel>

      <div
        className="animate-rise mt-2 flex flex-col items-center gap-3"
        style={{ '--i': 5 } as React.CSSProperties}
      >
        <Button
          variant="danger"
          size="lg"
          loading={signingOut}
          onClick={() => void handleSignOut()}
          className="w-full sm:w-auto"
        >
          <Icon.SignOut className="rtl:-scale-x-100" />
          {t('settings.signOut')}
        </Button>
        <span className="text-caption text-ink-3">
          {t('common.appName')} {t('settings.version')}
        </span>
      </div>
    </div>
  );
}
