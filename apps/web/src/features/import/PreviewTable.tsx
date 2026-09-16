import { useTranslation } from 'react-i18next';
import type { ImportRowResult, Language } from '@crypto-tracker/shared';
import { Badge } from '@/components/ui';
import { formatDateTime, formatFiat, formatQuantity } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface PreviewTableProps {
  rows: ImportRowResult[];
  language: Language;
}

const EMPTY = '—';

function RowStatus({ row }: { row: ImportRowResult }) {
  const { t } = useTranslation();
  if (row.errors.length === 0) {
    return <Badge tone="positive">{t('import.table.ok')}</Badge>;
  }
  return (
    <details>
      <summary className="cursor-pointer list-none">
        <Badge tone="negative">{row.errors.length}</Badge>
      </summary>
      <ul className="mt-1 list-disc ps-5 text-sm text-red-700 dark:text-red-400">
        {row.errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </details>
  );
}

export function PreviewTable({ rows, language }: PreviewTableProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] border-collapse text-start text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-start text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <th className="px-3 py-2 text-start font-medium">{t('import.table.line')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('import.table.date')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('import.table.type')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('import.table.coin')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('import.table.quantity')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('import.table.price')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('import.table.currency')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('import.table.fee')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('import.table.note')}</th>
              <th className="px-3 py-2 text-start font-medium">
                {t('import.table.errorsHeading')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const hasError = row.errors.length > 0;
              return (
                <tr
                  key={row.line}
                  className={cn(
                    'border-b border-slate-100 dark:border-slate-800',
                    hasError && 'border-s-4 border-s-red-500',
                  )}
                >
                  <td className="px-3 py-2">{row.line}</td>
                  <td className="px-3 py-2">
                    {row.input ? formatDateTime(row.input.occurredAt, language) : EMPTY}
                  </td>
                  <td className="px-3 py-2">
                    {row.input ? t(`import.types.${row.input.type}`) : EMPTY}
                  </td>
                  <td className="px-3 py-2">
                    {row.input
                      ? `${row.input.coinSymbol.toUpperCase()} · ${row.input.coinName}`
                      : EMPTY}
                  </td>
                  <td className="px-3 py-2">
                    {row.input ? formatQuantity(row.input.quantity, language) : EMPTY}
                  </td>
                  <td className="px-3 py-2">
                    {row.input
                      ? formatFiat(row.input.pricePerUnit, row.input.currency, language)
                      : EMPTY}
                  </td>
                  <td className="px-3 py-2">{row.input ? row.input.currency : EMPTY}</td>
                  <td className="px-3 py-2">
                    {row.input ? formatFiat(row.input.fee, row.input.currency, language) : EMPTY}
                  </td>
                  <td className="max-w-48 truncate px-3 py-2">{row.input?.note ?? EMPTY}</td>
                  <td className="px-3 py-2">
                    <RowStatus row={row} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((row) => {
          const hasError = row.errors.length > 0;
          return (
            <div
              key={row.line}
              className={cn(
                'rounded-xl border border-slate-200 p-4 dark:border-slate-800',
                hasError && 'border-s-4 border-s-red-500',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">#{row.line}</span>
                <RowStatus row={row} />
              </div>
              {row.input ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-slate-500 dark:text-slate-400">{t('import.table.date')}</dt>
                  <dd>{formatDateTime(row.input.occurredAt, language)}</dd>
                  <dt className="text-slate-500 dark:text-slate-400">{t('import.table.type')}</dt>
                  <dd>{t(`import.types.${row.input.type}`)}</dd>
                  <dt className="text-slate-500 dark:text-slate-400">{t('import.table.coin')}</dt>
                  <dd>
                    {row.input.coinSymbol.toUpperCase()} · {row.input.coinName}
                  </dd>
                  <dt className="text-slate-500 dark:text-slate-400">
                    {t('import.table.quantity')}
                  </dt>
                  <dd>{formatQuantity(row.input.quantity, language)}</dd>
                  <dt className="text-slate-500 dark:text-slate-400">{t('import.table.price')}</dt>
                  <dd>{formatFiat(row.input.pricePerUnit, row.input.currency, language)}</dd>
                  <dt className="text-slate-500 dark:text-slate-400">{t('import.table.fee')}</dt>
                  <dd>{formatFiat(row.input.fee, row.input.currency, language)}</dd>
                  {row.input.note ? (
                    <>
                      <dt className="text-slate-500 dark:text-slate-400">
                        {t('import.table.note')}
                      </dt>
                      <dd className="truncate">{row.input.note}</dd>
                    </>
                  ) : null}
                </dl>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
