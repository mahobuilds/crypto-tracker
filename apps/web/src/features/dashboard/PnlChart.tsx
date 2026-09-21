import { useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  FxRates,
  HistoryRange,
  PortfolioSnapshot,
  PortfolioView,
} from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import {
  ListGroup,
  ListRow,
  Panel,
  PnlText,
  SegmentedControl,
  Skeleton,
  StatCard,
} from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';
import {
  formatDate,
  formatDateTime,
  formatMoneyCompact,
  formatPct,
  formatSignedMoneyUsd,
} from '@/lib/format';
import { usePortfolio, usePortfolioHistory } from './queries';

type PnlMode = 'usd' | 'pct';

const RANGES: readonly HistoryRange[] = ['24h', '7d', '30d', '90d', '1y', 'all'];
const RANGE_STORAGE_KEY = 'crypto-tracker.dashboard.pnlRange';
const MODE_STORAGE_KEY = 'crypto-tracker.dashboard.pnlMode';

interface PnlPoint {
  takenAt: string;
  time: number;
  pnlUsd: number;
  pnlPct: number;
}

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable; the control still works for this visit.
  }
}

/**
 * Snapshot points for the chosen view. Owner's-share figures are null on snapshots taken
 * before group trades existed; those fall back to the whole-portfolio figures, which were
 * identical at the time.
 */
function toPoints(points: PortfolioSnapshot[], view: PortfolioView): PnlPoint[] {
  return points.map((p) => {
    const total = view === 'mine' ? (p.ownTotalValueUsd ?? p.totalValueUsd) : p.totalValueUsd;
    const invested = view === 'mine' ? (p.ownInvestedUsd ?? p.investedUsd) : p.investedUsd;
    const pnlUsd = total - invested;
    return {
      takenAt: p.takenAt,
      time: new Date(p.takenAt).getTime(),
      pnlUsd,
      pnlPct: invested > 0 ? (pnlUsd / invested) * 100 : 0,
    };
  });
}

/** Where the zero line sits inside the value domain, as a 0..1 gradient offset (0 = top). */
function zeroOffset(min: number, max: number): number {
  if (max <= 0) return 0;
  if (min >= 0) return 1;
  return max / (max - min);
}

interface ChartBodyProps {
  points: PnlPoint[];
  mode: PnlMode;
  fx: FxRates;
}

function ChartBody({ points, mode, fx }: ChartBodyProps) {
  const { settings } = useSettings();
  const { language, baseCurrency } = settings;
  const gradientId = useId();
  const key: keyof PnlPoint = mode === 'usd' ? 'pnlUsd' : 'pnlPct';

  const domain = useMemo(() => {
    const values = points.map((p) => p[key]);
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    const pad = (max - min || 1) * 0.08;
    min -= pad;
    max += pad;
    return { min, max };
  }, [points, key]);

  const split = zeroOffset(domain.min, domain.max);
  const spanMs = (points[points.length - 1]?.time ?? 0) - (points[0]?.time ?? 0);
  const showTime = spanMs <= 3 * 24 * 60 * 60 * 1000;

  const formatValue = (v: number) =>
    mode === 'usd' ? formatSignedMoneyUsd(v, baseCurrency, fx, language) : formatPct(v, language);
  const formatTick = (v: number) =>
    mode === 'usd'
      ? formatMoneyCompact(v, baseCurrency, fx, language)
      : formatPct(v, language, { signed: true });

  return (
    <div className="h-60 w-full md:h-72" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor="var(--gain)" stopOpacity={0.24} />
              <stop offset={split} stopColor="var(--gain)" stopOpacity={0.02} />
              <stop offset={split} stopColor="var(--loss)" stopOpacity={0.02} />
              <stop offset={1} stopColor="var(--loss)" stopOpacity={0.24} />
            </linearGradient>
            <linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="0" y2="1">
              <stop offset={split} stopColor="var(--gain)" />
              <stop offset={split} stopColor="var(--loss)" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeOpacity={0.7} />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            scale="time"
            tickLine={false}
            axisLine={false}
            minTickGap={48}
            tick={{ fill: 'var(--ink-3)', fontSize: 11 }}
            tickFormatter={(value: number) =>
              showTime
                ? new Date(value).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : formatDate(new Date(value).toISOString(), language)
            }
          />
          <YAxis
            domain={[domain.min, domain.max]}
            tickLine={false}
            axisLine={false}
            width={64}
            tickCount={5}
            tick={{ fill: 'var(--ink-3)', fontSize: 11 }}
            tickFormatter={formatTick}
          />
          <ReferenceLine y={0} stroke="var(--ink-3)" strokeWidth={1} />
          <Tooltip
            cursor={{ stroke: 'var(--ink-3)', strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as PnlPoint | undefined;
              if (!active || !point) return null;
              return (
                <div className="rounded-[var(--r-sm)] bg-ink px-3 py-2 text-bg shadow-panel">
                  <div className="text-[11px] opacity-70">
                    {formatDateTime(point.takenAt, language)}
                  </div>
                  <div className="tabular text-[13px] font-semibold">
                    {formatSignedMoneyUsd(point.pnlUsd, baseCurrency, fx, language)}
                    <span className="ms-1.5 font-medium opacity-80">
                      ({formatPct(point.pnlPct, language)})
                    </span>
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey={key}
            stroke={`url(#${gradientId}-line)`}
            strokeWidth={2}
            fill={`url(#${gradientId}-fill)`}
            isAnimationActive={false}
            activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2, fill: 'var(--ink)' }}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <span className="sr-only">{points.map((p) => formatValue(p[key])).join(', ')}</span>
    </div>
  );
}

export interface PnlChartProps {
  view?: PortfolioView;
  /** One wallet's series, or null for the whole portfolio. */
  walletId?: string | null;
}

export function PnlChart({ view = 'whole', walletId = null }: PnlChartProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { language, baseCurrency } = settings;
  const [range, setRange] = useState<HistoryRange>(() =>
    readStored(RANGE_STORAGE_KEY, RANGES, '30d'),
  );
  const [mode, setMode] = useState<PnlMode>(() =>
    readStored(MODE_STORAGE_KEY, ['usd', 'pct'] as const, 'usd'),
  );
  const [showTable, setShowTable] = useState(false);
  const history = usePortfolioHistory(range, walletId);

  useEffect(() => store(RANGE_STORAGE_KEY, range), [range]);
  useEffect(() => store(MODE_STORAGE_KEY, mode), [mode]);

  const points = useMemo(() => toPoints(history.data?.points ?? [], view), [history.data, view]);
  const first = points[0];
  const last = points[points.length - 1];

  const rangeControl = (
    <SegmentedControl
      size="sm"
      label={t('dashboard.chart.rangeLabel')}
      value={range}
      onChange={setRange}
      options={RANGES.map((r) => ({ value: r, label: t(`dashboard.chart.range.${r}`) }))}
    />
  );
  const modeControl = (
    <SegmentedControl
      size="sm"
      label={t('dashboard.pnl.modeLabel')}
      value={mode}
      onChange={setMode}
      options={[
        { value: 'usd', label: t('dashboard.pnl.modeMoney', { currency: baseCurrency }) },
        { value: 'pct', label: '%' },
      ]}
    />
  );

  return (
    <PnlChartFrame
      controls={
        <>
          {modeControl}
          <div className="hidden md:block">{rangeControl}</div>
        </>
      }
    >
      {history.isPending ? (
        <div className="flex flex-col gap-4">
          <StatCard.Skeleton />
          <Skeleton className="h-60 w-full md:h-72" />
        </div>
      ) : history.isError ? (
        <p className="text-base text-ink-2">{t('errors.generic')}</p>
      ) : points.length < 2 || !first || !last ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon.Clock size={28} />
          </span>
          <p className="max-w-[34ch] text-base text-ink-2">{t('dashboard.pnl.notEnoughHistory')}</p>
        </div>
      ) : (
        <PnlChartContent
          points={points}
          first={first}
          last={last}
          mode={mode}
          range={range}
          rangeControl={<div className="md:hidden">{rangeControl}</div>}
          showTable={showTable}
          onToggleTable={() => setShowTable((v) => !v)}
          view={view}
          walletId={walletId}
        />
      )}
    </PnlChartFrame>
  );
}

function PnlChartFrame({ controls, children }: { controls: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Panel
      title={t('dashboard.pnl.title')}
      subtitle={t('dashboard.pnl.subtitle')}
      actions={<div className="flex flex-wrap items-center gap-2">{controls}</div>}
    >
      {children}
    </Panel>
  );
}

interface PnlChartContentProps {
  points: PnlPoint[];
  first: PnlPoint;
  last: PnlPoint;
  mode: PnlMode;
  range: HistoryRange;
  rangeControl: ReactNode;
  showTable: boolean;
  onToggleTable: () => void;
  view: PortfolioView;
  walletId: string | null;
}

function PnlChartContent({
  points,
  first,
  last,
  mode,
  range,
  rangeControl,
  showTable,
  onToggleTable,
  view,
  walletId,
}: PnlChartContentProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { language, baseCurrency } = settings;
  const fx = useFxFromPortfolio(view, walletId);

  const currentValue =
    mode === 'usd'
      ? formatSignedMoneyUsd(last.pnlUsd, baseCurrency, fx, language)
      : formatPct(last.pnlPct, language);
  const secondary =
    mode === 'usd'
      ? formatPct(last.pnlPct, language)
      : formatSignedMoneyUsd(last.pnlUsd, baseCurrency, fx, language);
  const changeUsd = last.pnlUsd - first.pnlUsd;
  const tone = last.pnlUsd > 0 ? 'gain' : last.pnlUsd < 0 ? 'loss' : 'default';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <StatCard
          label={t(`dashboard.pnl.rangeTitle.${range}`)}
          value={currentValue}
          tone={tone}
          delta={
            <PnlText value={last.pnlUsd} iconSize={14}>
              {secondary}
            </PnlText>
          }
          hint={t('dashboard.pnl.sinceStart', {
            change: formatSignedMoneyUsd(changeUsd, baseCurrency, fx, language),
            date: formatDate(first.takenAt, language),
          })}
        />
        {rangeControl}
      </div>
      <ChartBody points={points} mode={mode} fx={fx} />
      <div>
        <button
          type="button"
          onClick={onToggleTable}
          aria-expanded={showTable}
          className="text-label inline-flex h-9 items-center gap-1 rounded-full px-2 text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <Icon.CaretRight
            size={14}
            className={`transition-transform duration-150 rtl:-scale-x-100 ${showTable ? 'rotate-90 rtl:rotate-90' : ''}`}
          />
          {showTable ? t('dashboard.pnl.hideTable') : t('dashboard.pnl.showTable')}
        </button>
        {showTable ? (
          <div className="mt-2 max-h-72 overflow-y-auto rounded-[var(--r-sm)] bg-surface-2 ring-1 ring-black/5 dark:ring-white/8">
            <ListGroup>
              {[...points].reverse().map((p) => (
                <ListRow
                  key={p.takenAt}
                  className="min-h-11"
                  title={
                    <span className="text-caption font-medium text-ink-2">
                      {formatDateTime(p.takenAt, language)}
                    </span>
                  }
                  trailing={
                    <PnlText value={p.pnlUsd} iconSize={12} className="text-[0.8125rem]">
                      {formatSignedMoneyUsd(p.pnlUsd, baseCurrency, fx, language)}
                    </PnlText>
                  }
                  trailingSub={formatPct(p.pnlPct, language)}
                />
              ))}
            </ListGroup>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** FX rates travel with the portfolio summary; fall back to USD identity until it loads. */
function useFxFromPortfolio(view: PortfolioView, walletId: string | null): FxRates {
  const portfolio = usePortfolio(view, walletId);
  return (
    portfolio.data?.fx ?? {
      base: 'USD',
      rates: { USD: 1, EUR: 1, SAR: 1, TRY: 1 },
      updatedAt: '',
    }
  );
}
