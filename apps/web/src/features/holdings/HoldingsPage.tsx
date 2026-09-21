import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { EPSILON } from '@crypto-tracker/shared';
import type {
  Currency,
  FxRates,
  Holding,
  Language,
  PortfolioSummary,
  Transaction,
} from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorMessage,
  ListGroup,
  ListRow,
  PageHeader,
  Panel,
  PnlText,
} from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';
import { usePortfolio } from '@/features/dashboard/queries';
import { WalletSwitcher, useSelectedWallet } from '@/features/wallets';
import { cn } from '@/lib/cn';
import {
  formatDate,
  formatFiat,
  formatMoneyUsd,
  formatPct,
  formatQuantity,
  formatRelative,
  formatSignedMoneyUsd,
  formatWholePct,
} from '@/lib/format';
import { useTransactions } from '@/features/transactions/queries';
import { formatParticipants, formatTransactionTotal } from '@/features/transactions/utils';

const NO_VALUE = '-';

interface Money {
  currency: Currency;
  fx: FxRates;
  language: Language;
}

/** One label + value cell of the detail grid. */
function Fact({
  label,
  children,
  hint,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-caption text-ink-2">{label}</dt>
      <dd className="tabular text-[0.9375rem] font-semibold break-words text-ink">{children}</dd>
      {hint ? <dd className="text-caption text-ink-3">{hint}</dd> : null}
    </div>
  );
}

function PnlValue({
  amountUsd,
  pct,
  money,
}: {
  amountUsd: number | null;
  pct?: number | null;
  money: Money;
}) {
  if (amountUsd === null) return <span className="text-ink-3">{NO_VALUE}</span>;
  return (
    <span className="flex flex-col">
      <PnlText value={amountUsd} iconSize={14}>
        {formatSignedMoneyUsd(amountUsd, money.currency, money.fx, money.language)}
      </PnlText>
      {pct === undefined || pct === null ? null : (
        <PnlText value={amountUsd} arrow={false} className="text-[0.8125rem] font-normal">
          {formatPct(pct, money.language)}
        </PnlText>
      )}
    </span>
  );
}

/** Detail grid for one holding (whole trade figures, or the owner's share of them). */
function HoldingFacts({
  holding,
  money,
  allocation,
}: {
  holding: Holding;
  money: Money;
  allocation?: boolean;
}) {
  const { t } = useTranslation();
  const { currency, fx, language } = money;
  const fiat = (usd: number | null) =>
    usd === null ? NO_VALUE : formatMoneyUsd(usd, currency, fx, language);

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
      <Fact label={t('holdings.facts.quantity')}>
        {formatQuantity(holding.quantity, language)} {holding.coinSymbol}
      </Fact>
      <Fact label={t('holdings.facts.avgCost')}>{fiat(holding.averageCostUsd)}</Fact>
      <Fact label={t('holdings.facts.price')}>{fiat(holding.currentPriceUsd)}</Fact>
      <Fact label={t('holdings.facts.value')}>{fiat(holding.currentValueUsd)}</Fact>
      <Fact label={t('holdings.facts.cost')}>{fiat(holding.investedUsd)}</Fact>
      <Fact label={t('holdings.facts.unrealized')}>
        <PnlValue
          amountUsd={holding.unrealizedPnlUsd}
          pct={holding.unrealizedPnlPct}
          money={money}
        />
      </Fact>
      <Fact label={t('holdings.facts.realized')} hint={t('holdings.facts.realizedHint')}>
        <PnlValue amountUsd={holding.realizedPnlUsd} money={money} />
      </Fact>
      {allocation ? (
        <Fact label={t('holdings.facts.allocation')}>
          {holding.allocationPct === null
            ? NO_VALUE
            : formatPct(holding.allocationPct, language, { signed: false })}
        </Fact>
      ) : null}
    </dl>
  );
}

/** This coin's buys and sells, newest first, with group participants where present. */
function HoldingTransactions({
  coinId,
  walletId,
  language,
}: {
  coinId: string;
  walletId: string | null;
  language: Language;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useTransactions({ coinId, walletId: walletId ?? undefined });

  if (query.isPending) return <ListRow.Skeleton rows={2} />;
  if (query.isError) {
    return <ErrorMessage message={t('errors.generic')} onRetry={() => void query.refetch()} />;
  }
  const transactions: Transaction[] = query.data.transactions;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-label text-ink">
          {t('holdings.transactions.title', { count: transactions.length })}
        </h4>
        <Button variant="ghost" size="md" onClick={() => void navigate('/transactions')}>
          {t('holdings.transactions.manage')}
          <Icon.CaretRight size={16} className="rtl:-scale-x-100" />
        </Button>
      </div>
      <div className="rounded-[var(--r-sm)] bg-surface ring-1 ring-black/5 dark:ring-white/8">
        <ListGroup>
          {transactions.map((tx) => (
            <ListRow
              key={tx.id}
              className="min-h-12"
              multiline={tx.scope === 'group'}
              title={
                <span className="text-caption font-medium text-ink-2">
                  {formatDate(tx.occurredAt, language)}
                </span>
              }
              titleAside={
                <Badge tone={tx.type === 'buy' ? 'gain' : 'loss'}>
                  {t(`transactions.type.${tx.type}`)}
                </Badge>
              }
              subtitle={
                <>
                  <span className="block truncate text-ink">
                    {formatQuantity(tx.quantity, language)} {tx.coinSymbol} {t('transactions.at')}{' '}
                    {formatFiat(tx.pricePerUnit, tx.currency, language)}
                  </span>
                  {tx.scope === 'group' ? (
                    <span className="block">
                      <Icon.UsersThree />{' '}
                      {formatParticipants(tx.participants, language, t('transactions.you'))}
                    </span>
                  ) : null}
                </>
              }
              trailing={formatTransactionTotal(tx.quantity, tx.pricePerUnit, tx.currency, language)}
            />
          ))}
        </ListGroup>
      </div>
    </div>
  );
}

interface HoldingItemProps {
  holding: Holding;
  /** The same coin valued at the owner's share only; undefined until that summary loads. */
  mine: Holding | undefined;
  /** Wallet the page is narrowed to, so the transaction list matches. */
  walletId: string | null;
  expanded: boolean;
  onToggle: () => void;
  money: Money;
}

function HoldingItem({ holding, mine, walletId, expanded, onToggle, money }: HoldingItemProps) {
  const { t } = useTranslation();
  const { currency, fx, language } = money;
  const panelId = `holding-${holding.coinId}`;
  const isShared = mine !== undefined && holding.quantity - mine.quantity > EPSILON;
  const sharePct = isShared ? (mine.quantity / holding.quantity) * 100 : 100;

  return (
    <li className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn(
          'flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start transition-[background-color,transform] duration-150 ease-out hover:bg-surface-2 active:scale-[0.995] md:gap-3.5 md:px-6',
          expanded && 'bg-surface-2',
        )}
      >
        <Avatar label={holding.coinSymbol} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] font-semibold text-ink">
            <span className="truncate">{holding.coinSymbol}</span>
            <span className="hidden truncate font-normal text-ink-2 sm:inline">
              {holding.coinName}
            </span>
            {isShared ? (
              <Badge tone="accent" icon={<Icon.UsersThree weight="bold" />}>
                {t('holdings.sharedBadge', { pct: formatWholePct(sharePct, language) })}
              </Badge>
            ) : null}
            {holding.currentPriceUsd === null ? <Badge>{t('holdings.noPrice')}</Badge> : null}
          </span>
          <span className="text-caption truncate text-ink-2">
            {formatQuantity(holding.quantity, language)} {holding.coinSymbol} ·{' '}
            {t('holdings.avgShort')}{' '}
            {formatMoneyUsd(holding.averageCostUsd, currency, fx, language)}
          </span>
        </span>
        <span className="flex max-w-[45%] shrink-0 flex-col items-end gap-0.5 text-end">
          <span className="tabular text-[0.9375rem] font-semibold whitespace-nowrap text-ink">
            {holding.currentValueUsd === null
              ? NO_VALUE
              : formatMoneyUsd(holding.currentValueUsd, currency, fx, language)}
          </span>
          {holding.unrealizedPnlPct === null ? null : (
            <PnlText value={holding.unrealizedPnlPct} iconSize={12} className="text-[0.8125rem]">
              {formatPct(holding.unrealizedPnlPct, language)}
            </PnlText>
          )}
        </span>
        <Icon.CaretDown
          size={18}
          className={cn(
            'shrink-0 text-ink-3 transition-transform duration-200 ease-[var(--ease-out)]',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <div
          id={panelId}
          className="animate-rise flex flex-col gap-6 bg-surface-2/60 px-4 pt-4 pb-5 md:px-6"
        >
          <HoldingFacts holding={holding} money={money} allocation />

          {isShared ? (
            <section className="flex flex-col gap-4 rounded-[var(--r-md)] bg-surface p-4 ring-1 ring-accent/25">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-ink">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Icon.UsersThree size={18} />
                  </span>
                  {t('holdings.share.title')}
                </h4>
                <Badge tone="accent">
                  {t('holdings.share.ofHolding', { pct: formatWholePct(sharePct, language) })}
                </Badge>
              </div>
              <p className="text-caption text-ink-2">{t('holdings.share.description')}</p>
              <HoldingFacts holding={mine} money={money} />
            </section>
          ) : null}

          <HoldingTransactions coinId={holding.coinId} walletId={walletId} language={language} />
        </div>
      ) : null}
    </li>
  );
}

function HoldingsSkeleton() {
  return (
    <Panel flush aria-busy="true">
      <ListRow.Skeleton rows={5} />
    </Panel>
  );
}

export function HoldingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { language, baseCurrency } = settings;
  const selected = useSelectedWallet();
  const whole = usePortfolio('whole', selected.walletId);
  const mine = usePortfolio('mine', selected.walletId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const summary: PortfolioSummary | undefined = whole.data;
  const mineByCoin = new Map<string, Holding>(
    (mine.data?.holdings ?? []).map((holding) => [holding.coinId, holding]),
  );

  const header = (
    <PageHeader
      title={
        selected.wallet ? `${t('holdings.title')} · ${selected.wallet.name}` : t('holdings.title')
      }
      subtitle={
        summary
          ? summary.pricesUpdatedAt
            ? t('holdings.subtitle', {
                count: summary.holdings.length,
                total: formatMoneyUsd(summary.totalValueUsd, baseCurrency, summary.fx, language),
                time: formatRelative(summary.pricesUpdatedAt, language),
              })
            : t('holdings.subtitleNoPrices', { count: summary.holdings.length })
          : undefined
      }
    />
  );

  return (
    <>
      {header}

      {selected.hasMultiple ? (
        <div className="animate-rise">
          <WalletSwitcher
            wallets={selected.wallets}
            value={selected.walletId}
            onChange={selected.setWalletId}
          />
        </div>
      ) : null}

      {whole.isPending ? (
        <HoldingsSkeleton />
      ) : whole.isError || !summary ? (
        <ErrorMessage message={t('errors.generic')} onRetry={() => void whole.refetch()} />
      ) : summary.holdings.length === 0 ? (
        <Panel className="animate-rise">
          <EmptyState
            icon={<Icon.Coins />}
            title={t('holdings.empty.title')}
            description={t('holdings.empty.description')}
            action={
              <Button onClick={() => void navigate('/transactions')}>
                <Icon.Plus weight="bold" />
                {t('holdings.empty.action')}
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel flush className="animate-rise" style={{ '--i': 1 } as React.CSSProperties}>
          <ul className="flex flex-col divide-y divide-line py-1">
            {summary.holdings.map((holding) => (
              <HoldingItem
                key={holding.coinId}
                holding={holding}
                mine={mine.data ? (mineByCoin.get(holding.coinId) ?? holding) : undefined}
                walletId={selected.walletId}
                expanded={expandedId === holding.coinId}
                onToggle={() =>
                  setExpandedId((current) => (current === holding.coinId ? null : holding.coinId))
                }
                money={{ currency: baseCurrency, fx: summary.fx, language }}
              />
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
