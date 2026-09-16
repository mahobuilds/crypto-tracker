import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { Currency, FxRates, Holding, Language } from '@crypto-tracker/shared';
import { Panel } from '@/components/ui';
import { formatMoneyUsd, formatPct } from '@/lib/format';

/** Validated categorical palette (docs/DESIGN.md section 2), fixed order, never cycled. */
const PALETTE = ['#2457D6', '#0F9D7A', '#D97706', '#7C3AED', '#0891B2', '#BE185D'] as const;
const OTHER_COLOR = 'var(--ink-3)';

export interface AllocationChartProps {
  holdings: Holding[];
  currency: Currency;
  fx: FxRates;
  language: Language;
}

interface Slice {
  key: string;
  label: string;
  name: string;
  valueUsd: number;
  pct: number;
  color: string;
}

/** Colors follow the coin, never its rank: assigned once per session, in first-seen order. */
function useStableColors() {
  const map = useRef(new Map<string, string>());
  return (coinId: string): string => {
    const existing = map.current.get(coinId);
    if (existing) return existing;
    const color = PALETTE[map.current.size % PALETTE.length] ?? OTHER_COLOR;
    map.current.set(coinId, color);
    return color;
  };
}

export function AllocationChart({ holdings, currency, fx, language }: AllocationChartProps) {
  const { t } = useTranslation();
  const colorFor = useStableColors();

  const slices = useMemo<Slice[]>(() => {
    const priced = holdings.filter(
      (h): h is Holding & { allocationPct: number; currentValueUsd: number } =>
        h.allocationPct !== null && h.currentValueUsd !== null,
    );
    const shown = priced.slice(0, PALETTE.length);
    const rest = priced.slice(PALETTE.length);
    const result: Slice[] = shown.map((h) => ({
      key: h.coinId,
      label: h.coinSymbol,
      name: h.coinName,
      valueUsd: h.currentValueUsd,
      pct: h.allocationPct,
      color: colorFor(h.coinId),
    }));
    if (rest.length > 0) {
      result.push({
        key: 'other',
        label: t('dashboard.allocation.other'),
        name: t('dashboard.allocation.otherCount', { count: rest.length }),
        valueUsd: rest.reduce((sum, h) => sum + h.currentValueUsd, 0),
        pct: rest.reduce((sum, h) => sum + h.allocationPct, 0),
        color: OTHER_COLOR,
      });
    }
    return result;
  }, [holdings, colorFor, t]);

  const totalUsd = slices.reduce((sum, s) => sum + s.valueUsd, 0);
  const summary = slices
    .map((s) => `${s.label} ${formatPct(s.pct, language, { signed: false })}`)
    .join(', ');

  if (slices.length === 0) return null;

  return (
    <Panel title={t('dashboard.allocation.title')}>
      <div className="grid items-center gap-6 md:grid-cols-[14rem_1fr]">
        <div
          className="relative mx-auto h-52 w-52"
          role="img"
          aria-label={t('dashboard.allocation.summary', { summary })}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="valueUsd"
                nameKey="label"
                innerRadius="62%"
                outerRadius="100%"
                paddingAngle={1.5}
                stroke="var(--surface)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {slices.map((s) => (
                  <Cell key={s.key} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-caption text-ink-3">
              {t('dashboard.allocation.coins', { count: holdings.length })}
            </span>
            <span className="tabular text-[1.0625rem] font-semibold">
              {formatMoneyUsd(totalUsd, currency, fx, language)}
            </span>
          </div>
        </div>
        <ul className="flex flex-col gap-2.5">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-3 text-[0.9375rem]">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{s.label}</span>
                <span className="ms-1.5 text-ink-3">{s.name}</span>
              </span>
              <span className="tabular font-semibold">
                {formatPct(s.pct, language, { signed: false })}
              </span>
              <span className="tabular w-24 text-end text-ink-2">
                {formatMoneyUsd(s.valueUsd, currency, fx, language)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
