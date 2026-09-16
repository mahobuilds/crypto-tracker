import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChartKind, ChartPrefs } from '@crypto-tracker/shared';
import { ChartIcon, ChevronIcon } from '@/components/icons';
import { Button, Dialog, Toggle } from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';

const CHART_LABEL_KEYS: Record<ChartKind, string> = {
  line: 'dashboard.settingsButton.lineChart',
  pie: 'dashboard.settingsButton.pieChart',
};

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const moved = items[index];
  if (moved === undefined) return items;
  const next = [...items];
  next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

export function ChartSettingsButton() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const [open, setOpen] = useState(false);

  const chartPrefs = settings.chartPrefs;

  function save(patch: Partial<ChartPrefs>) {
    void updateSettings({ chartPrefs: { ...chartPrefs, ...patch } });
  }

  function toggleKind(kind: ChartKind, enabled: boolean) {
    if (kind === 'line') save({ lineChart: enabled });
    else save({ pieChart: enabled });
  }

  function reorder(index: number, direction: -1 | 1) {
    save({ order: moveItem(chartPrefs.order, index, direction) });
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <ChartIcon className="size-5" />
        {t('dashboard.settingsButton.label')}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('dashboard.settingsButton.title')}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <Toggle
              checked={chartPrefs.lineChart}
              onChange={(checked) => toggleKind('line', checked)}
              label={t('dashboard.settingsButton.lineChart')}
              description={t('dashboard.settingsButton.lineChartDescription')}
            />
            <Toggle
              checked={chartPrefs.pieChart}
              onChange={(checked) => toggleKind('pie', checked)}
              label={t('dashboard.settingsButton.pieChart')}
              description={t('dashboard.settingsButton.pieChartDescription')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-base font-medium">{t('dashboard.settingsButton.order')}</span>
            <ul className="flex flex-col gap-2">
              {chartPrefs.order.map((kind, index) => (
                <li
                  key={kind}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
                >
                  <span className="text-base">{t(CHART_LABEL_KEYS[kind])}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => reorder(index, -1)}
                      aria-label={t('dashboard.settingsButton.moveUp')}
                      className="touch-target inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ChevronIcon className="size-5 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      disabled={index === chartPrefs.order.length - 1}
                      onClick={() => reorder(index, 1)}
                      aria-label={t('dashboard.settingsButton.moveDown')}
                      className="touch-target inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ChevronIcon className="size-5 rotate-90" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Dialog>
    </>
  );
}
