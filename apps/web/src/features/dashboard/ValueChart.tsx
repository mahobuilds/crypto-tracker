import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryRange } from '@crypto-tracker/shared';
import type { Currency, FxRates, Language } from '@crypto-tracker/shared';
import { Card, CardHeader, CardTitle, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { formatMoneyCompact } from './chartFormat';
import { usePortfolioHistory } from './queries';

const RANGES: HistoryRange[] = ['24h', '7d', '30d', '90d', '1y', 'all'];
const DEFAULT_RANGE: HistoryRange = '30d';
const VALUE_COLOR = '#4f46e5';
const INVESTED_COLOR = '#94a3b8';

export interface ValueChartProps {
  currency: Currency;
  fx: FxRates;
  language: Language;
}

interface ChartPoint {
  takenAt: string;
  valueUsd: number;
  investedUsd: number;
}

export function ValueChart({ currency, fx, language }: ValueChartProps) {
  const { t } = useTranslation();
  const [range, setRange] = useState<HistoryRange>(DEFAULT_RANGE);
  const history = usePortfolioHistory(range);

  const points: ChartPoint[] = (history.data?.points ?? []).map((point) => ({
    takenAt: point.takenAt,
    valueUsd: point.totalValueUsd,
    investedUsd: point.investedUsd,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.chart.value')}</CardTitle>
        <div
          role="group"
          aria-label={t('dashboard.chart.rangeLabel')}
          className="flex flex-wrap gap-1"
        >
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === range}
              onClick={() => setRange(option)}
              className={cn(
                'touch-target rounded-xl px-3 py-1.5 text-sm font-semibold',
                option === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
              )}
            >
              {t(`dashboard.chart.range.${option}`)}
            </button>
          ))}
        </div>
      </CardHeader>

      {history.isPending ? (
        <div className="flex h-60 items-center justify-center md:h-80">
          <Spinner />
        </div>
      ) : points.length < 2 ? (
        <p className="flex h-60 items-center justify-center text-center text-base text-slate-600 md:h-80 dark:text-slate-400">
          {t('dashboard.chart.notEnoughHistory')}
        </p>
      ) : (
        <div className="h-60 text-slate-600 md:h-80 dark:text-slate-400">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-slate-200 dark:stroke-slate-800"
              />
              <XAxis
                dataKey="takenAt"
                tickFormatter={(value: string) => formatDate(value, language)}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                stroke="currentColor"
              />
              <YAxis
                tickFormatter={(value: number) => formatMoneyCompact(value, currency, fx, language)}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                stroke="currentColor"
                width={64}
              />
              <Tooltip
                labelFormatter={(label) =>
                  typeof label === 'string' ? formatDate(label, language) : label
                }
                formatter={(value, name) => [
                  typeof value === 'number'
                    ? formatMoneyCompact(value, currency, fx, language)
                    : String(value),
                  name,
                ]}
              />
              <Line
                type="monotone"
                dataKey="valueUsd"
                name={t('dashboard.chart.value')}
                stroke={VALUE_COLOR}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="investedUsd"
                name={t('dashboard.chart.investedLine')}
                stroke={INVESTED_COLOR}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
