import { useTranslation } from 'react-i18next';
import type { Currency, FxRates, Holding, Language } from '@crypto-tracker/shared';
import { Avatar, Badge, ListGroup, ListRow, Panel, PnlText } from '@/components/ui';
import { formatMoneyUsd, formatPct, formatQuantity, formatSignedMoneyUsd } from '@/lib/format';

export interface HoldingsTableProps {
  holdings: Holding[];
  currency: Currency;
  fx: FxRates;
  language: Language;
}

const NO_VALUE = '-';

function money(amountUsd: number | null, currency: Currency, fx: FxRates, language: Language) {
  return amountUsd === null ? NO_VALUE : formatMoneyUsd(amountUsd, currency, fx, language);
}

function PnlCell({
  holding,
  currency,
  fx,
  language,
}: {
  holding: Holding;
  currency: Currency;
  fx: FxRates;
  language: Language;
}) {
  if (holding.unrealizedPnlUsd === null || holding.unrealizedPnlPct === null) {
    return <span className="text-ink-3">{NO_VALUE}</span>;
  }
  return (
    <PnlText value={holding.unrealizedPnlUsd} iconSize={14}>
      {formatSignedMoneyUsd(holding.unrealizedPnlUsd, currency, fx, language)}
      <span className="ms-1 font-normal opacity-80">
        ({formatPct(holding.unrealizedPnlPct, language)})
      </span>
    </PnlText>
  );
}

export function HoldingsTable({ holdings, currency, fx, language }: HoldingsTableProps) {
  const { t } = useTranslation();
  const headCell = 'px-3 py-3 text-xs font-medium tracking-[0.04em] text-ink-3 uppercase';
  const cell = 'tabular px-3 py-3.5 text-[0.9375rem]';

  return (
    <Panel
      flush
      title={t('dashboard.holdings.title')}
      actions={<Badge>{t('dashboard.allocation.coins', { count: holdings.length })}</Badge>}
    >
      {/* Phone: rows */}
      <ListGroup className="md:hidden">
        {holdings.map((h) => (
          <ListRow
            key={h.coinId}
            leading={<Avatar label={h.coinSymbol} />}
            title={h.coinSymbol}
            titleAside={
              h.currentPriceUsd === null ? (
                <Badge>{t('dashboard.holdings.noPrice')}</Badge>
              ) : undefined
            }
            subtitle={`${formatQuantity(h.quantity, language)} ${h.coinSymbol} · ${t('dashboard.holdings.avgShort')} ${formatMoneyUsd(h.averageCostUsd, currency, fx, language)}`}
            trailing={money(h.currentValueUsd, currency, fx, language)}
            trailingSub={
              h.unrealizedPnlPct === null ? undefined : (
                <PnlText value={h.unrealizedPnlPct} iconSize={12} className="text-[0.8125rem]">
                  {formatPct(h.unrealizedPnlPct, language)}
                </PnlText>
              )
            }
          />
        ))}
      </ListGroup>

      {/* Laptop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-2 text-start">
              <th className={`${headCell} ps-6 text-start`}>{t('dashboard.holdings.coin')}</th>
              <th className={`${headCell} text-end`}>{t('dashboard.holdings.quantity')}</th>
              <th className={`${headCell} text-end`}>{t('dashboard.holdings.avgCost')}</th>
              <th className={`${headCell} text-end`}>{t('dashboard.holdings.price')}</th>
              <th className={`${headCell} text-end`}>{t('dashboard.holdings.value')}</th>
              <th className={`${headCell} text-end`}>{t('dashboard.holdings.pnl')}</th>
              <th className={`${headCell} pe-6 text-end`}>{t('dashboard.holdings.allocation')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {holdings.map((h) => (
              <tr key={h.coinId} className="transition-colors hover:bg-surface-2/60">
                <td className={`${cell} ps-6`}>
                  <div className="flex items-center gap-3">
                    <Avatar label={h.coinSymbol} size="sm" />
                    <span className="font-semibold">{h.coinSymbol}</span>
                    <span className="truncate text-ink-3">{h.coinName}</span>
                    {h.currentPriceUsd === null ? (
                      <Badge>{t('dashboard.holdings.noPrice')}</Badge>
                    ) : null}
                  </div>
                </td>
                <td className={`${cell} text-end`}>{formatQuantity(h.quantity, language)}</td>
                <td className={`${cell} text-end text-ink-2`}>
                  {formatMoneyUsd(h.averageCostUsd, currency, fx, language)}
                </td>
                <td className={`${cell} text-end`}>
                  {money(h.currentPriceUsd, currency, fx, language)}
                </td>
                <td className={`${cell} text-end font-semibold`}>
                  {money(h.currentValueUsd, currency, fx, language)}
                </td>
                <td className={`${cell} text-end`}>
                  <PnlCell holding={h} currency={currency} fx={fx} language={language} />
                </td>
                <td className={`${cell} pe-6 text-end text-ink-2`}>
                  {h.allocationPct === null
                    ? NO_VALUE
                    : formatPct(h.allocationPct, language, { signed: false })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
