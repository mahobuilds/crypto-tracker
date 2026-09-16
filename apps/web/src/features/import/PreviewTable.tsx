import { useTranslation } from 'react-i18next';
import type { ImportRowResult, Language } from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import { Avatar, Badge, ListGroup, ListRow } from '@/components/ui';
import { formatDate, formatFiat, formatQuantity } from '@/lib/format';

export interface PreviewTableProps {
  rows: ImportRowResult[];
  language: Language;
}

function ErrorList({ errors }: { errors: string[] }) {
  return (
    <ul className="flex flex-col gap-0.5 text-caption text-loss">
      {errors.map((error, index) => (
        <li key={index} className="flex items-start gap-1">
          <Icon.WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </li>
      ))}
    </ul>
  );
}

/** One row per parsed CSV line; invalid rows are tinted and list their errors. */
export function PreviewTable({ rows, language }: PreviewTableProps) {
  const { t } = useTranslation();
  const lineBadge = (row: ImportRowResult) => (
    <span className="tabular flex size-10 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2">
      {row.line}
    </span>
  );

  return (
    <ListGroup>
      {rows.map((row) => {
        const input = row.input;
        if (!input) {
          return (
            <ListRow
              key={row.line}
              tone="loss"
              leading={lineBadge(row)}
              title={t('import.table.invalidRow')}
              multiline
              subtitle={<ErrorList errors={row.errors} />}
            />
          );
        }
        return (
          <ListRow
            key={row.line}
            leading={<Avatar label={input.coinSymbol} />}
            title={input.coinSymbol.toUpperCase()}
            titleAside={
              <Badge tone={input.type === 'buy' ? 'gain' : 'loss'}>
                {t(`import.types.${input.type}`)}
              </Badge>
            }
            subtitle={`${formatDate(input.occurredAt, language)} ${'·'} ${formatQuantity(input.quantity, language)} ${'×'} ${formatFiat(input.pricePerUnit, input.currency, language)}${input.fee > 0 ? ` ${'·'} ${t('import.table.fee')} ${formatFiat(input.fee, input.currency, language)}` : ''}`}
            trailing={formatFiat(input.quantity * input.pricePerUnit, input.currency, language)}
            trailingSub={
              <span className="tabular text-ink-3">
                {t('import.table.lineNumber', { line: row.line })}
              </span>
            }
          />
        );
      })}
    </ListGroup>
  );
}
