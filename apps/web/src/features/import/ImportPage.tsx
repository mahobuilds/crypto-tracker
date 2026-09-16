import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  CSV_COLUMNS,
  parseTransactionsCsv,
  type ImportRequest,
  type ImportResponse,
} from '@crypto-tracker/shared';
import { useSettings } from '@/app/settings/SettingsProvider';
import { UploadIcon } from '@/components/icons';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  ErrorMessage,
  Field,
  PageHeader,
  Textarea,
} from '@/components/ui';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { queryClient } from '@/lib/query';
import { PreviewTable } from './PreviewTable';

const MAX_BYTES = 1024 * 1024;

const SECONDARY_LINK_CLASSES =
  'touch-target inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';

const PRIMARY_LINK_CLASSES =
  'touch-target inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-indigo-700';

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

export function ImportPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState('');
  const [previewResult, setPreviewResult] = useState<ImportResponse | null>(null);
  const [committedResult, setCommittedResult] = useState<ImportResponse | null>(null);

  const previewMutation = useMutation({
    mutationFn: (csv: string) =>
      apiFetch<ImportResponse>('/api/transactions/import', {
        method: 'POST',
        json: { csv, mode: 'preview' } satisfies ImportRequest,
      }),
    onSuccess: (data, csv) => {
      setCsvText(csv);
      setPreviewResult(data);
    },
  });

  const commitMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportResponse>('/api/transactions/import', {
        method: 'POST',
        json: { csv: csvText, mode: 'commit' } satisfies ImportRequest,
      }),
    onSuccess: (data) => {
      setCommittedResult(data);
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      setPastedText('');
    }
    setLocalError(null);
  }

  function handlePasteChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setPastedText(event.target.value);
    if (event.target.value !== '') {
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setLocalError(null);
  }

  function handleStartOver() {
    setFile(null);
    setPastedText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setLocalError(null);
    setCsvText('');
    setPreviewResult(null);
    setCommittedResult(null);
    previewMutation.reset();
    commitMutation.reset();
  }

  async function handlePreview() {
    setLocalError(null);
    setPreviewResult(null);
    previewMutation.reset();

    let text: string;
    if (file) {
      if (file.size > MAX_BYTES) {
        setLocalError(t('import.errors.tooLarge'));
        return;
      }
      text = await file.text();
    } else {
      text = pastedText;
    }

    if (text.trim() === '') {
      setLocalError(t('import.errors.empty'));
      return;
    }

    if (byteLength(text) > MAX_BYTES) {
      setLocalError(t('import.errors.tooLarge'));
      return;
    }

    const localResult = parseTransactionsCsv(text, { defaultCurrency: settings.baseCurrency });
    if (localResult.headerErrors.length > 0) {
      setLocalError(localResult.headerErrors.join('; '));
      return;
    }

    previewMutation.mutate(text);
  }

  const hasSource = file !== null || pastedText.trim() !== '';

  return (
    <>
      <PageHeader
        title={t('import.title')}
        subtitle={t('import.subtitle')}
        actions={
          <a href="/sample-transactions.csv" download className={SECONDARY_LINK_CLASSES}>
            {t('import.downloadSample')}
          </a>
        }
      />

      {!committedResult ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('import.step1Title')}</CardTitle>
          </CardHeader>

          <p className="text-base font-medium text-slate-800 dark:text-slate-200">
            {t('import.columnsIntro')}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            {CSV_COLUMNS.map((column) => (
              <li key={column}>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {column}
                </span>{' '}
                — {t(`import.columns.${column}`)}
              </li>
            ))}
          </ul>

          <label
            htmlFor="import-file"
            className="touch-target mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <UploadIcon className="size-8 text-indigo-600 dark:text-indigo-400" />
            <span className="text-base font-semibold">{t('import.dropzoneTitle')}</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {file ? t('import.dropzoneSelected', { name: file.name }) : t('import.dropzoneHint')}
            </span>
            <input
              ref={fileInputRef}
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          <Field htmlFor="import-paste" label={t('import.pasteLabel')} className="mt-5">
            <Textarea
              id="import-paste"
              value={pastedText}
              onChange={handlePasteChange}
              rows={6}
              placeholder={t('import.pastePlaceholder')}
            />
          </Field>

          {localError ? <ErrorMessage className="mt-4" message={localError} /> : null}
          {previewMutation.isError ? (
            <ErrorMessage
              className="mt-4"
              message={errorMessage(previewMutation.error, t('errors.generic'))}
              onRetry={handlePreview}
            />
          ) : null}

          <Button
            className="mt-5"
            onClick={handlePreview}
            loading={previewMutation.isPending}
            disabled={!hasSource || previewMutation.isPending}
          >
            {t('import.previewButton')}
          </Button>
        </Card>
      ) : null}

      {previewResult && !committedResult ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('import.step2Title')}</CardTitle>
          </CardHeader>
          <p className="text-base text-slate-600 dark:text-slate-400">
            {t('import.summary', {
              valid: previewResult.validCount,
              errors: previewResult.errorCount,
            })}
          </p>

          <div className="mt-4">
            <PreviewTable rows={previewResult.rows} language={settings.language} />
          </div>

          {commitMutation.isError ? (
            <ErrorMessage
              className="mt-4"
              message={errorMessage(commitMutation.error, t('errors.generic'))}
            />
          ) : null}

          {previewResult.errorCount > 0 ? (
            <p className="mt-4 text-sm text-red-700 dark:text-red-400">
              {t('import.fixErrorsHint')}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => commitMutation.mutate()}
              loading={commitMutation.isPending}
              disabled={previewResult.errorCount > 0 || commitMutation.isPending}
            >
              {t('import.commitButton', { count: previewResult.validCount })}
            </Button>
            <Button variant="secondary" onClick={handleStartOver}>
              {t('import.startOver')}
            </Button>
          </div>
        </Card>
      ) : null}

      {committedResult ? (
        <Card className={cn('mt-6')}>
          <CardHeader>
            <CardTitle>{t('import.successTitle')}</CardTitle>
          </CardHeader>
          <p className="text-base text-slate-600 dark:text-slate-400">
            {t('import.successMessage', { count: committedResult.importedCount })}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link to="/transactions" className={PRIMARY_LINK_CLASSES}>
              {t('import.viewTransactions')}
            </Link>
            <Button variant="secondary" onClick={handleStartOver}>
              {t('import.startOver')}
            </Button>
          </div>
        </Card>
      ) : null}
    </>
  );
}
