import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { WALLET_NAME_MAX, walletInputSchema, type Wallet } from '@crypto-tracker/shared';
import { Button, Dialog, ErrorMessage, Field, Input, useToast } from '@/components/ui';
import { Icon } from '@/components/icons';
import { ApiRequestError } from '@/lib/api';
import { useCreateWallet, useUpdateWallet } from './queries';

export interface WalletFormProps {
  open: boolean;
  /** Wallet being renamed; null creates a new one. */
  wallet: Wallet | null;
  onClose: () => void;
  onSaved?: (wallet: Wallet) => void;
}

const FORM_ID = 'wallet-form';
const NAME_ID = 'wallet-form-name';

export function WalletForm({ open, wallet, onClose, onSaved }: WalletFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const createWallet = useCreateWallet();
  const updateWallet = useUpdateWallet();
  const isSaving = createWallet.isPending || updateWallet.isPending;

  const [name, setName] = useState(wallet?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(wallet?.name ?? '');
    setNameError(null);
    setServerError(null);
  }, [open, wallet]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const result = walletInputSchema.safeParse({ name });
    if (!result.success) {
      setNameError(t('wallets.form.errors.name', { max: WALLET_NAME_MAX }));
      return;
    }
    setNameError(null);

    try {
      const saved = wallet
        ? await updateWallet.mutateAsync({ id: wallet.id, input: result.data })
        : await createWallet.mutateAsync(result.data);
      toast.success(t(wallet ? 'wallets.toast.renamed' : 'wallets.toast.created'));
      onSaved?.(saved);
      onClose();
    } catch (cause) {
      setServerError(resolveWalletError(cause, t));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={wallet ? t('wallets.form.renameTitle') : t('wallets.form.createTitle')}
      presentation="center"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            form={FORM_ID}
            type="submit"
            size="lg"
            loading={isSaving}
            trailingIcon={<Icon.Check size={16} weight="bold" />}
          >
            {t('wallets.form.save')}
          </Button>
        </>
      }
    >
      {serverError ? <ErrorMessage message={serverError} className="mb-4" /> : null}
      <form id={FORM_ID} onSubmit={(event) => void handleSubmit(event)} className="pb-1">
        <Field
          htmlFor={NAME_ID}
          label={t('wallets.form.name')}
          hint={t('wallets.form.nameHint')}
          error={nameError}
        >
          <Input
            id={NAME_ID}
            value={name}
            maxLength={WALLET_NAME_MAX}
            autoComplete="off"
            placeholder={t('wallets.form.namePlaceholder')}
            invalid={Boolean(nameError)}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  );
}

/** Wallet errors worth showing verbatim: a taken name, a full wallet, the wallet cap. */
export function resolveWalletError(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 0) return t('errors.network');
    if (error.code === 'WALLET_NAME_TAKEN') return t('wallets.errors.nameTaken');
    if (error.code === 'WALLET_NOT_EMPTY') return t('wallets.errors.notEmpty');
    if (error.code === 'LIMIT_REACHED') return t('wallets.errors.limit');
  }
  return t('errors.generic');
}
