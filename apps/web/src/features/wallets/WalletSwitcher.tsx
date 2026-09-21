import { useTranslation } from 'react-i18next';
import type { Wallet } from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import { SegmentedControl, Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { WalletSelection } from './useSelectedWallet';

/** Above this many choices (including "All") the pills give way to a dropdown. */
const MAX_PILLS = 4;
const ALL = '';

export interface WalletSwitcherProps {
  wallets: Wallet[];
  value: WalletSelection;
  onChange: (value: WalletSelection) => void;
  /** Shows an accent "+" button after the control that opens the add-wallet form. */
  onAdd?: () => void;
  className?: string;
}

/** Round accent "+" that sits at the end of the pill track. */
function AddWalletButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('wallets.add')}
      title={t('wallets.add')}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent ring-1 ring-accent/15 transition-[background-color,color,transform] duration-150 ease-out select-none hover:bg-accent hover:text-accent-ink active:scale-[0.96]"
    >
      <Icon.Plus weight="bold" size={18} />
    </button>
  );
}

/**
 * "All wallets | Main | Binance" pills, or a dropdown once there are too many wallets to fit.
 * With a single wallet only the "+" button shows, since there is nothing to switch between.
 */
export function WalletSwitcher({
  wallets,
  value,
  onChange,
  onAdd,
  className,
}: WalletSwitcherProps) {
  const { t } = useTranslation();
  const options = [
    { value: ALL, label: t('wallets.switcher.all'), icon: <Icon.Wallet /> },
    ...wallets.map((wallet) => ({ value: wallet.id, label: wallet.name })),
  ];
  const selected = value ?? ALL;
  const handle = (next: string) => onChange(next === ALL ? null : next);
  const showControl = wallets.length > 1;
  const addButton = onAdd ? <AddWalletButton onClick={onAdd} /> : null;

  if (!showControl) {
    return addButton ? <div className={cn('flex items-center', className)}>{addButton}</div> : null;
  }

  if (options.length > MAX_PILLS) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Select
          aria-label={t('wallets.switcher.label')}
          className="min-w-0 flex-1 sm:max-w-xs"
          options={options.map(({ value: v, label }) => ({ value: v, label }))}
          value={selected}
          onChange={(event) => handle(event.target.value)}
        />
        {addButton}
      </div>
    );
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <div className="min-w-0 overflow-x-auto">
        <SegmentedControl
          label={t('wallets.switcher.label')}
          value={selected}
          onChange={handle}
          options={options}
        />
      </div>
      {addButton}
    </div>
  );
}
