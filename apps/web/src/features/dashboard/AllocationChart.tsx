import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { Holding } from '@crypto-tracker/shared';
import type { Currency, FxRates, Language } from '@crypto-tracker/shared';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import { formatMoneyUsd, formatPct } from '@/lib/format';

const PALETTE = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#ec4899',
  '#64748b',
];
const OTHER_COLOR = '#94a3b8';

export interface AllocationChartProps {
  holdings: Holding[];
  currency: Currency;
  fx: FxRates;
  language: Language;
}

interface Slice {
  key: string;
  label: string;
  valueUsd: number;
  pct: number;
  color: string;
}

function buildSlices(holdings: Holding[], t: (key: string) => string): Slice[] {
  const priced = holdings.filter(
    (holding): holding is Holding & { allocationPct: number; currentValueUsd: number } =>
      holding.allocationPct !== null && holding.currentValueUsd !== null,
  );
  const shown = priced.slice(0, PALETTE.length);
  const rest = priced.slice(PALETTE.length);

  const slices: Slice[] = shown.map((holding, index) => ({
    key: holding.coinId,
    label: holding.coinSymbol,
    valueUsd: holding.currentValueUsd,
    pct: holding.allocationPct,
    color: PALETTE[index] ?? OTHER_COLOR,
  }));

  if (rest.length > 0) {
    const restValueUsd = rest.reduce((sum, holding) => sum + holding.currentValueUsd, 0);
    const restPct = rest.reduce((sum, holding) => sum + holding.allocationPct, 0);
    slices.push({
      key: 'other',
      label: t('dashboard.allocation.other'),
      valueUsd: restValueUsd,
      pct: restPct,
      color: OTHER_COLOR,
    });
  }

  return slices;
}

export function AllocationChart({ holdings, currency, fx, language }: AllocationChartProps) {
  const { t } = useTranslation();
  const slices = buildSlices(holdings, t);

  const summary = slices
    .map((slice) => `${slice.label} ${formatPct(slice.pct, language, { signed: false })}`)
    .join(', ');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.allocation.title')}</CardTitle>
      </CardHeader>
      <div className="flex flex-col items-center gap-6 md:flex-row">
        <div
          className="h-60 w-full md:h-64 md:w-1/2"
          role="img"
          aria-label={t('dashboard.allocation.summary', { summary })}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="valueUsd"
                nameKey="label"
                innerRadius="55%"
                outerRadius="90%"
                paddingAngle={2}
                stroke="none"
              >
                {slices.map((slice) => (
                  <Cell key={slice.key} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex w-full flex-col gap-2 md:w-1/2">
          {slices.map((slice) => (
            <li key={slice.key} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="min-w-0 flex-1 truncate text-base font-medium">{slice.label}</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {formatPct(slice.pct, language, { signed: false })}
              </span>
              <span className="text-sm font-semibold">
                {formatMoneyUsd(slice.valueUsd, currency, fx, language)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
