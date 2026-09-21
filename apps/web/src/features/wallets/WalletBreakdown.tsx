import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { Currency, FxRates, Language, WalletValuation } from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import { Button, ListGroup, ListRow, Panel, PnlText } from '@/components/ui';
import { formatMoneyUsd, formatPct } from '@/lib/format';
import { useWalletBreakdown } from '@/features/dashboard/queries';

export interface WalletBreakdownProps {
  currency: Currency;
  fx: FxRates;
  language: Language;
  /** Picking a row narrows the dashboard to that wallet. */
  onSelect: (walletId: string) => void;
}

/** "By wallet" panel: each wallet's worth and unrealized P/L, tap a row to focus on it. */
export function WalletBreakdown({ currency, fx, language, onSelect }: WalletBreakdownProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const breakdown = useWalletBreakdown();

  return (
    <Panel
      flush
      title={t('wallets.breakdown.title')}
      subtitle={t('wallets.breakdown.subtitle')}
      actions={
        <Button variant="ghost" size="md" onClick={() => void navigate('/wallets')}>
          {t('wallets.breakdown.manage')}
          <Icon.CaretRight size={16} className="rtl:-scale-x-100" />
        </Button>
      }
    >
      {breakdown.isPending ? (
        <ListRow.Skeleton rows={2} />
      ) : breakdown.isError ? (
        <p className="px-5 pb-5 text-base text-ink-2 md:px-6">{t('errors.generic')}</p>
      ) : (
        <ListGroup className="pb-2">
          {breakdown.data.wallets.map((wallet: WalletValuation) => (
            <ListRow
              key={wallet.walletId}
              className="border-0"
              onPress={() => onSelect(wallet.walletId)}
              leading={
                <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon.Wallet />
                </span>
              }
              title={wallet.name}
              subtitle={t('wallets.breakdown.holdings', { count: wallet.holdingsCount })}
              trailing={formatMoneyUsd(wallet.totalValueUsd, currency, fx, language)}
              trailingSub={
                wallet.investedUsd > 0 ? (
                  <PnlText value={wallet.unrealizedPnlUsd} iconSize={12}>
                    {formatPct(wallet.unrealizedPnlPct, language)}
                  </PnlText>
                ) : undefined
              }
            />
          ))}
        </ListGroup>
      )}
    </Panel>
  );
}
