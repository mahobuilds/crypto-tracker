import { useTranslation } from 'react-i18next';
import {
  SHARE_PCT_MAX,
  SHARE_PCT_MIN,
  SHARE_PCT_TOTAL,
  totalSharePct,
  type Language,
  type TransactionParticipant,
} from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import { Badge, Button, IconButton, Input, Select, fieldErrorId } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatWholePct } from '@/lib/format';

export interface ParticipantsEditorProps {
  participants: TransactionParticipant[];
  onChange: (participants: TransactionParticipant[]) => void;
  language: Language;
  /** Ids of rows with a blank name, shown after a failed submit. */
  nameErrors: ReadonlySet<number>;
  /** Validation message for the whole list (sum not 100), shown after a failed submit. */
  error?: string;
  fieldId: string;
}

/** Whole-percent options from `SHARE_PCT_MIN` up to `max`, or just the current value if `max` is below it. */
function shareOptions(max: number, current: number, language: Language): SelectOption[] {
  const top = Math.max(max, current);
  const options: SelectOption[] = [];
  for (let value = SHARE_PCT_MIN; value <= top; value += 1) {
    options.push({ value: String(value), label: formatWholePct(value, language) });
  }
  return options;
}

/**
 * Editable list of people in a group transaction. Each row is a name and a whole-percent
 * share picked from a native select (a scroll wheel on phones). The share options for a row
 * are capped at what is left after every other row, and nobody can be added once the shares
 * already reach 100%.
 */
export function ParticipantsEditor({
  participants,
  onChange,
  language,
  nameErrors,
  error,
  fieldId,
}: ParticipantsEditorProps) {
  const { t } = useTranslation();
  const total = totalSharePct(participants);
  const remaining = SHARE_PCT_TOTAL - total;
  const canAdd = remaining >= SHARE_PCT_MIN;
  const complete = total === SHARE_PCT_TOTAL;

  function addPerson() {
    if (!canAdd) return;
    onChange([
      ...participants,
      { name: '', sharePct: Math.min(SHARE_PCT_MAX, remaining), isMe: false },
    ]);
  }

  function updateRow(index: number, patch: Partial<TransactionParticipant>) {
    onChange(participants.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(participants.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3" role="group" aria-labelledby={`${fieldId}-label`}>
      <div className="flex items-center justify-between gap-3">
        <span id={`${fieldId}-label`} className="text-label text-ink">
          {t('transactions.form.group.people')}
        </span>
        <Badge tone={complete ? 'gain' : remaining < 0 ? 'loss' : 'neutral'} className="tabular">
          {t('transactions.form.group.allocated', {
            total: formatWholePct(total, language),
          })}
        </Badge>
      </div>

      {participants.length === 0 ? (
        <p className="text-caption text-ink-2">{t('transactions.form.group.hint')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {participants.map((row, index) => {
            const others = total - row.sharePct;
            const max = Math.min(SHARE_PCT_MAX, SHARE_PCT_TOTAL - others);
            const nameId = `${fieldId}-name-${index}`;
            const shareId = `${fieldId}-share-${index}`;
            const nameInvalid = nameErrors.has(index);
            return (
              <li
                key={index}
                className={cn(
                  'grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-[var(--r-sm)] bg-surface-2 p-2',
                  row.isMe && 'ring-1 ring-accent/30',
                )}
              >
                {row.isMe ? (
                  <span className="flex h-12 min-w-0 items-center gap-2 px-2">
                    <Badge tone="accent">{t('transactions.form.group.you')}</Badge>
                    <span className="truncate text-base text-ink">{row.name}</span>
                  </span>
                ) : (
                  <Input
                    id={nameId}
                    aria-label={t('transactions.form.group.name')}
                    placeholder={t('transactions.form.group.namePlaceholder')}
                    autoComplete="off"
                    maxLength={100}
                    invalid={nameInvalid}
                    aria-describedby={nameInvalid ? fieldErrorId(nameId) : undefined}
                    value={row.name}
                    onChange={(event) => updateRow(index, { name: event.target.value })}
                  />
                )}
                <Select
                  id={shareId}
                  aria-label={
                    row.isMe
                      ? t('transactions.form.group.yourShare')
                      : t('transactions.form.group.share')
                  }
                  options={shareOptions(max, row.sharePct, language)}
                  value={String(row.sharePct)}
                  onChange={(event) => updateRow(index, { sharePct: Number(event.target.value) })}
                  className={cn('w-[6.5rem]', '[&>select]:tabular')}
                />
                {row.isMe ? (
                  <span className="size-9" aria-hidden="true" />
                ) : (
                  <IconButton
                    variant="danger"
                    size="sm"
                    aria-label={t('transactions.form.group.remove', { name: row.name })}
                    onClick={() => removeRow(index)}
                  >
                    <Icon.Trash size={18} />
                  </IconButton>
                )}
                {nameInvalid ? (
                  <p
                    id={fieldErrorId(nameId)}
                    role="alert"
                    className="text-caption col-span-3 flex items-center gap-1 px-1 font-medium text-loss"
                  >
                    <Icon.WarningCircle size={14} weight="fill" />
                    {t('transactions.form.errors.participantName')}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        variant="secondary"
        fullWidth
        disabled={!canAdd}
        onClick={addPerson}
        aria-describedby={canAdd ? undefined : `${fieldId}-full`}
      >
        <Icon.Plus weight="bold" />
        {t('transactions.form.group.addPerson')}
      </Button>
      {!canAdd && !error ? (
        <p id={`${fieldId}-full`} className="text-caption text-ink-2">
          {t('transactions.form.group.full')}
        </p>
      ) : null}

      {error ? (
        <p
          id={fieldErrorId(fieldId)}
          role="alert"
          className="text-caption flex items-center gap-1 font-medium text-loss"
        >
          <Icon.WarningCircle size={14} weight="fill" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
