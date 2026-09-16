import { useTranslation } from 'react-i18next';
import type { Holding } from '@crypto-tracker/shared';
import type { Currency, FxRates, Language } from '@crypto-tracker/shared';
import { Badge, Card, CardHeader, CardTitle, PnlText } from '@/components/ui';
import { formatMoneyUsd, formatPct, formatQuantity } from '@/lib/format';

const EM_DASH = '—';

export interface HoldingsTableProps {
  holdings: Holding[];
  currency: Currency;
  fx: FxRates;
  language: Language;
}

interface HoldingRowProps {
  holding: Holding;
  currency: Currency;
  fx: FxRates;
  language: Language;
}

function money(amountUsd: number | null, currency: Currency, fx: FxRates, language: Language) {
  return amountUsd === null ? EM_DASH : formatMoneyUsd(amountUsd, currency, fx, language);
}

function pct(value: number | null, language: Language) {
  return value === null ? EM_DASH : formatPct(value, language);
}

function HoldingRow({ holding, currency, fx, language }: HoldingRowProps) {
  const { t } = useTranslation();
  const unpriced = holding.currentPriceUsd === null;
  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <td className="py-3 pe-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{holding.coinSymbol}</span>
          <span className="truncate text-sm text-slate-600 dark:text-slate-400">
            {holding.coinName}
          </span>
          {unpriced ? <Badge tone="neutral">{t('dashboard.holdings.noPrice')}</Badge> : null}
        </div>
      </td>
      <td className="py-3 pe-4 text-end">{formatQuantity(holding.quantity, language)}</td>
      <td className="py-3 pe-4 text-end">
        {formatMoneyUsd(holding.averageCostUsd, currency, fx, language)}
      </td>
      <td className="py-3 pe-4 text-end">
        {money(holding.currentPriceUsd, currency, fx, language)}
      </td>
      <td className="py-3 pe-4 text-end">
        {money(holding.currentValueUsd, currency, fx, language)}
      </td>
      <td className="py-3 pe-4 text-end">
        {holding.unrealizedPnlUsd === null || holding.unrealizedPnlPct === null ? (
          EM_DASH
        ) : (
          <PnlText value={holding.unrealizedPnlUsd}>
            {money(holding.unrealizedPnlUsd, currency, fx, language)} (
            {pct(holding.unrealizedPnlPct, language)})
          </PnlText>
        )}
      </td>
      <td className="py-3 text-end">{pct(holding.allocationPct, language)}</td>
    </tr>
  );
}

function HoldingCard({ holding, currency, fx, language }: HoldingRowProps) {
  const { t } = useTranslation();
  const unpriced = holding.currentPriceUsd === null;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{holding.coinSymbol}</p>
          <p className="truncate text-sm text-slate-600 dark:text-slate-400">{holding.coinName}</p>
        </div>
        {unpriced ? <Badge tone="neutral">{t('dashboard.holdings.noPrice')}</Badge> : null}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-600 dark:text-slate-400">{t('dashboard.holdings.quantity')}</dt>
          <dd className="text-base font-medium">{formatQuantity(holding.quantity, language)}</dd>
        </div>
        <div>
          <dt className="text-slate-600 dark:text-slate-400">{t('dashboard.holdings.value')}</dt>
          <dd className="text-base font-medium">
            {money(holding.currentValueUsd, currency, fx, language)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-600 dark:text-slate-400">{t('dashboard.holdings.pnl')}</dt>
          <dd className="text-base font-medium">
            {holding.unrealizedPnlUsd === null || holding.unrealizedPnlPct === null ? (
              EM_DASH
            ) : (
              <PnlText value={holding.unrealizedPnlUsd}>
                {money(holding.unrealizedPnlUsd, currency, fx, language)} (
                {pct(holding.unrealizedPnlPct, language)})
              </PnlText>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-slate-600 dark:text-slate-400">
            {t('dashboard.holdings.allocation')}
          </dt>
          <dd className="text-base font-medium">{pct(holding.allocationPct, language)}</dd>
        </div>
      </dl>
    </Card>
  );
}

export function HoldingsTable({ holdings, currency, fx, language }: HoldingsTableProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.holdings.title')}</CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-3 md:hidden">
        {holdings.map((holding) => (
          <HoldingCard
            key={holding.coinId}
            holding={holding}
            currency={currency}
            fx={fx}
            language={language}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-start text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <th className="py-2 pe-4 text-start font-medium">{t('dashboard.holdings.coin')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('dashboard.holdings.quantity')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('dashboard.holdings.avgCost')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('dashboard.holdings.price')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('dashboard.holdings.value')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('dashboard.holdings.pnl')}</th>
              <th className="py-2 text-end font-medium">{t('dashboard.holdings.allocation')}</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <HoldingRow
                key={holding.coinId}
                holding={holding}
                currency={currency}
                fx={fx}
                language={language}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
