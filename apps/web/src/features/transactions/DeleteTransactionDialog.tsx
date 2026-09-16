import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Transaction } from '@crypto-tracker/shared';
import { Button, Dialog, ErrorMessage, useToast } from '@/components/ui';
import { useSettings } from '@/app/settings/SettingsProvider';
import { formatDate, formatQuantity } from '@/lib/format';
import { useDeleteTransaction } from './queries';
import { resolveTransactionError } from './utils';

export interface DeleteTransactionDialogProps {
  transaction: Transaction | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteTransactionDialog({
  transaction,
  onClose,
  onDeleted,
}: DeleteTransactionDialogProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const deleteMutation = useDeleteTransaction();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleConfirm() {
    if (!transaction) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(transaction.id);
      toast.success(t('transactions.toast.deleted'));
      onDeleted();
    } catch (cause) {
      setError(resolveTransactionError(cause, t));
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <Dialog
      open={transaction !== null}
      onClose={handleClose}
      title={t('transactions.delete.title')}
      presentation="center"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={handleConfirm}>
            {t('common.delete')}
          </Button>
        </>
      }
    >
      {error ? <ErrorMessage message={error} className="mb-4" /> : null}
      {transaction ? (
        <p className="text-base text-ink-2">
          {t('transactions.delete.confirm', {
            coin: transaction.coinSymbol,
            quantity: formatQuantity(transaction.quantity, settings.language),
            date: formatDate(transaction.occurredAt, settings.language),
          })}
        </p>
      ) : null}
    </Dialog>
  );
}
