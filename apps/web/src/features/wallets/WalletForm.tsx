import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SHARE_PCT_TOTAL,
  WALLET_NAME_MAX,
  totalSharePct,
  walletInputSchema,
  type TransactionParticipant,
  type TransactionScope,
  type Wallet,
} from '@crypto-tracker/shared';
import {
  Button,
  Dialog,
  ErrorMessage,
  Field,
  Input,
  SegmentedControl,
  useToast,
} from '@/components/ui';
import { Icon } from '@/components/icons';
import { useSettings } from '@/app/settings/SettingsProvider';
import { ApiRequestError } from '@/lib/api';
import { ParticipantsEditor } from './ParticipantsEditor';
import { useCreateWallet, useUpdateWallet } from './queries';

export interface WalletFormProps {
  open: boolean;
  /** Wallet being edited; null creates a new one. */
  wallet: Wallet | null;
  onClose: () => void;
  onSaved?: (wallet: Wallet) => void;
}

const FORM_ID = 'wallet-form';
const NAME_ID = 'wallet-form-name';
const PARTICIPANTS_ID = 'wallet-form-participants';

/** Default owner share when a group is started: the rest goes to the friends added after. */
const DEFAULT_OWNER_SHARE_PCT = 50;

function ownerRow(ownerName: string): TransactionParticipant {
  return { name: ownerName, sharePct: DEFAULT_OWNER_SHARE_PCT, isMe: true };
}

/** Makes sure a group list starts with exactly one owner row (older data may lack it). */
function withOwner(
  participants: readonly TransactionParticipant[],
  ownerName: string,
): TransactionParticipant[] {
  const owner = participants.find((participant) => participant.isMe);
  const others = participants.filter((participant) => !participant.isMe);
  return [owner ?? { ...ownerRow(ownerName), sharePct: 1 }, ...others];
}

function initialParticipants(wallet: Wallet | null, ownerName: string): TransactionParticipant[] {
  if (wallet?.scope !== 'group') return [];
  return withOwner(
    wallet.participants.map((participant) => ({ ...participant })),
    ownerName,
  );
}

export function WalletForm({ open, wallet, onClose, onSaved }: WalletFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { settings, user } = useSettings();
  const createWallet = useCreateWallet();
  const updateWallet = useUpdateWallet();
  const isSaving = createWallet.isPending || updateWallet.isPending;

  const [name, setName] = useState(wallet?.name ?? '');
  const [scope, setScope] = useState<TransactionScope>(wallet?.scope ?? 'personal');
  const [participants, setParticipants] = useState<TransactionParticipant[]>(() =>
    initialParticipants(wallet, user.name),
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [participantsError, setParticipantsError] = useState<string | undefined>(undefined);
  const [participantNameErrors, setParticipantNameErrors] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(wallet?.name ?? '');
    setScope(wallet?.scope ?? 'personal');
    setParticipants(initialParticipants(wallet, user.name));
    setNameError(null);
    setParticipantsError(undefined);
    setParticipantNameErrors(new Set());
    setServerError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wallet]);

  const isGroup = scope === 'group';
  const groupComplete = !isGroup || totalSharePct(participants) === SHARE_PCT_TOTAL;
  // Editing the split of a wallet that already holds trades re-splits them too: say so.
  const splitChanged =
    wallet !== null &&
    wallet.transactionCount > 0 &&
    (scope !== wallet.scope ||
      (isGroup &&
        JSON.stringify(participants) !== JSON.stringify(initialParticipants(wallet, user.name))));

  function changeScope(next: TransactionScope) {
    setScope(next);
    if (next === 'group' && participants.length === 0) setParticipants([ownerRow(user.name)]);
  }

  function updateParticipants(next: TransactionParticipant[]) {
    setParticipants(next);
    setParticipantNameErrors(new Set());
    setParticipantsError(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const trimmed = isGroup
      ? participants.map((participant) => ({
          name: participant.name.trim(),
          sharePct: participant.sharePct,
          isMe: participant.isMe,
        }))
      : [];
    const blankNames = new Set<number>();
    trimmed.forEach((participant, index) => {
      if (participant.name === '') blankNames.add(index);
    });

    const result = walletInputSchema.safeParse({ name, scope, participants: trimmed });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const participantsIssue = flat.participants !== undefined || blankNames.size > 0;
      setNameError(flat.name ? t('wallets.form.errors.name', { max: WALLET_NAME_MAX }) : null);
      setParticipantNameErrors(blankNames);
      setParticipantsError(
        participantsIssue
          ? blankNames.size > 0
            ? t('wallets.form.errors.participantName')
            : t('wallets.form.errors.participantsTotal', { total: SHARE_PCT_TOTAL })
          : undefined,
      );
      return;
    }
    setNameError(null);
    setParticipantsError(undefined);
    setParticipantNameErrors(new Set());

    try {
      const saved = wallet
        ? await updateWallet.mutateAsync({ id: wallet.id, input: result.data })
        : await createWallet.mutateAsync(result.data);
      toast.success(t(wallet ? 'wallets.toast.updated' : 'wallets.toast.created'));
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
      title={wallet ? t('wallets.form.editTitle') : t('wallets.form.createTitle')}
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
            disabled={!groupComplete}
            trailingIcon={<Icon.Check size={16} weight="bold" />}
          >
            {t('wallets.form.save')}
          </Button>
        </>
      }
    >
      {serverError ? <ErrorMessage message={serverError} className="mb-4" /> : null}
      <form
        id={FORM_ID}
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4 pb-1"
      >
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

        <SegmentedControl
          fullWidth
          label={t('wallets.form.kind')}
          value={scope}
          onChange={changeScope}
          options={[
            { value: 'personal', label: t('wallets.form.solo') },
            { value: 'group', label: t('wallets.form.group.tab'), icon: <Icon.UsersThree /> },
          ]}
        />

        {isGroup ? (
          <>
            <p className="text-caption text-ink-2">{t('wallets.form.splitHint')}</p>
            <ParticipantsEditor
              fieldId={PARTICIPANTS_ID}
              participants={participants}
              onChange={updateParticipants}
              language={settings.language}
              nameErrors={participantNameErrors}
              error={participantsError}
            />
          </>
        ) : null}

        {splitChanged ? (
          <p className="text-caption text-ink-2">{t('wallets.form.splitChanged')}</p>
        ) : null}
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
