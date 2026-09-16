import { useTranslation } from 'react-i18next';
import type { Currency, FxRates, Language, PnlByMethod } from '@crypto-tracker/shared';
import { Badge, Panel, PnlText, StatCard } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatMoneyUsd, formatPct, formatSignedMoneyUsd } from '@/lib/format';

export interface PnlMethodsProps {
  average: PnlByMethod;
  fifo: PnlByMethod;
  currency: Currency;
  fx: FxRates;
  language: Language;
}

type MethodKey = 'average' | 'fifo';

function toneOf(value: number | null): 'default' | 'gain' | 'loss' {
  if (value === null || value === 0) return 'default';
  return value > 0 ? 'gain' : 'loss';
}

function MethodCard({
  method,
  data,
  currency,
  fx,
  language,
}: {
  method: MethodKey;
  data: PnlByMethod;
  currency: Currency;
  fx: FxRates;
  language: Language;
}) {
  const { t } = useTranslation();
  const money = (v: number) => formatSignedMoneyUsd(v, currency, fx, language);

  return (
    <div
      className={cn(
        'flex flex-col gap-5 rounded-[var(--r-md)] bg-surface-2 p-4 md:p-5',
        method === 'average' && 'ring-1 ring-accent/20',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] font-semibold">
            {t(`dashboard.methods.${method}.title`)}
          </h3>
          <p className="text-caption text-ink-2">{t(`dashboard.methods.${method}.description`)}</p>
        </div>
        {method === 'average' ? (
          <Badge tone="accent" className="shrink-0">
            {t('dashboard.methods.default')}
          </Badge>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label={t('dashboard.methods.realized')}
          tone={toneOf(data.realizedPnlUsd)}
          value={money(data.realizedPnlUsd)}
        />
        <StatCard
          label={t('dashboard.methods.unrealized')}
          tone={toneOf(data.unrealizedPnlUsd)}
          value={data.unrealizedPnlUsd === null ? '-' : money(data.unrealizedPnlUsd)}
          delta={
            data.unrealizedPnlPct === null ? undefined : (
              <PnlText value={data.unrealizedPnlPct} iconSize={14}>
                {formatPct(data.unrealizedPnlPct, language)}
              </PnlText>
            )
          }
        />
      </div>
      <div className="text-caption flex items-center justify-between gap-3 border-t border-line pt-3 text-ink-2">
        <span>{t('dashboard.methods.costBasis')}</span>
        <span className="tabular font-medium text-ink">
          {formatMoneyUsd(data.investedUsd, currency, fx, language)}
        </span>
      </div>
    </div>
  );
}

/** Compact "FIFO +$1,234.00 (+3.2%)" line for the hero stat cards. */
export function MethodLine({
  label,
  value,
  pct,
  currency,
  fx,
  language,
}: {
  label: string;
  value: number | null;
  pct: number | null;
  currency: Currency;
  fx: FxRates;
  language: Language;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span className="rounded-full bg-surface-2 px-1.5 py-px text-[0.6875rem] font-semibold tracking-[0.04em] text-ink-3 uppercase">
        {label}
      </span>
      {value === null ? (
        <span>-</span>
      ) : (
        <PnlText value={value} iconSize={12} className="text-[0.8125rem]">
          {formatSignedMoneyUsd(value, currency, fx, language)}
          {pct === null ? null : (
            <span className="ms-1 font-normal opacity-80">({formatPct(pct, language)})</span>
          )}
        </PnlText>
      )}
    </span>
  );
}

/** The same trades valued by average cost and by FIFO, side by side. */
export function PnlMethods({ average, fifo, currency, fx, language }: PnlMethodsProps) {
  const { t } = useTranslation();
  return (
    <Panel title={t('dashboard.methods.title')} subtitle={t('dashboard.methods.subtitle')}>
      <div className="grid gap-4 md:grid-cols-2">
        <MethodCard
          method="average"
          data={average}
          currency={currency}
          fx={fx}
          language={language}
        />
        <MethodCard method="fifo" data={fifo} currency={currency} fx={fx} language={language} />
      </div>
    </Panel>
  );
}
