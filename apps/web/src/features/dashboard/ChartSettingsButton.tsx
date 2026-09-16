import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChartKind, ChartPrefs } from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import { Dialog, IconButton, SegmentedControl, Toggle } from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';

export function ChartSettingsButton() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const chartPrefs = settings.chartPrefs;

  function save(patch: Partial<ChartPrefs>) {
    void updateSettings({ chartPrefs: { ...chartPrefs, ...patch } });
  }

  const first: ChartKind = chartPrefs.order[0] ?? 'line';

  return (
    <>
      <IconButton
        variant="secondary"
        aria-label={t('dashboard.settingsButton.title')}
        onClick={() => setOpen(true)}
      >
        <Icon.SlidersHorizontal />
      </IconButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('dashboard.settingsButton.title')}
        presentation="center"
      >
        <div className="flex flex-col divide-y divide-line">
          <div className="py-3">
            <Toggle
              checked={chartPrefs.lineChart}
              onChange={(checked) => save({ lineChart: checked })}
              label={t('dashboard.settingsButton.lineChart')}
              description={t('dashboard.settingsButton.lineChartDescription')}
            />
          </div>
          <div className="py-3">
            <Toggle
              checked={chartPrefs.pieChart}
              onChange={(checked) => save({ pieChart: checked })}
              label={t('dashboard.settingsButton.pieChart')}
              description={t('dashboard.settingsButton.pieChartDescription')}
            />
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="text-[0.9375rem] font-medium">
              {t('dashboard.settingsButton.order')}
            </span>
            <SegmentedControl
              size="sm"
              label={t('dashboard.settingsButton.order')}
              value={first}
              onChange={(kind) =>
                save({ order: kind === 'line' ? ['line', 'pie'] : ['pie', 'line'] })
              }
              options={[
                { value: 'line', label: t('dashboard.settingsButton.lineShort') },
                { value: 'pie', label: t('dashboard.settingsButton.pieShort') },
              ]}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
