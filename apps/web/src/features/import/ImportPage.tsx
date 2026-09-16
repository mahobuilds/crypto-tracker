import { Fragment, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  CSV_COLUMNS,
  parseTransactionsCsv,
  type ImportRequest,
  type ImportResponse,
} from '@crypto-tracker/shared';
import { useSettings } from '@/app/settings/SettingsProvider';
import { Icon } from '@/components/icons';
import {
  Badge,
  Button,
  EmptyState,
  ErrorMessage,
  Field,
  PageHeader,
  Panel,
  Textarea,
  useToast,
} from '@/components/ui';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { queryClient } from '@/lib/query';
import { PreviewTable } from './PreviewTable';

const MAX_BYTES = 1024 * 1024;

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

export function ImportPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
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
      toast.success(t('import.successMessage', { count: data.importedCount }));
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) setPastedText('');
    setLocalError(null);
  }

  function handlePasteChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setPastedText(event.target.value);
    if (event.target.value !== '') {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setLocalError(null);
  }

  function handleStartOver() {
    setFile(null);
    setPastedText('');
    setShowPaste(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      if (file.size > MAX_BYTES) return setLocalError(t('import.errors.tooLarge'));
      text = await file.text();
    } else {
      text = pastedText;
    }

    if (text.trim() === '') return setLocalError(t('import.errors.empty'));
    if (byteLength(text) > MAX_BYTES) return setLocalError(t('import.errors.tooLarge'));

    const localResult = parseTransactionsCsv(text, { defaultCurrency: settings.baseCurrency });
    if (localResult.headerErrors.length > 0) {
      return setLocalError(localResult.headerErrors.join('; '));
    }
    previewMutation.mutate(text);
  }

  const hasSource = file !== null || pastedText.trim() !== '';
  const step = committedResult ? 3 : previewResult ? 2 : 1;

  return (
    <>
      <PageHeader
        title={t('import.title')}
        subtitle={t('import.subtitle')}
        actions={
          <Button
            variant="secondary"
            onClick={() => window.open('/sample-transactions.csv', '_blank')}
          >
            <Icon.FileCsv />
            {t('import.downloadSample')}
          </Button>
        }
      />

      <p className="text-caption -mt-3 text-ink-3">
        {t('import.stepOf', { step, total: 3 })} {'·'} {t(`import.stepName.${step}`)}
      </p>

      {step === 1 ? (
        <Panel title={t('import.step1Title')} className="animate-rise">
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              {CSV_COLUMNS.map((column) => (
                <Fragment key={column}>
                  <dt className="font-mono font-semibold text-ink">{column}</dt>
                  <dd className="text-ink-2">{t(`import.columns.${column}`)}</dd>
                </Fragment>
              ))}
            </dl>

            <label
              htmlFor="import-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--r-md)] border-2 border-dashed border-line px-4 py-8 text-center transition-colors hover:border-accent/40 hover:bg-accent-soft/30"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon.Upload size={24} />
              </span>
              <span className="text-[0.9375rem] font-semibold">{t('import.dropzoneTitle')}</span>
              <span className="text-caption text-ink-2">
                {file
                  ? t('import.dropzoneSelected', { name: file.name })
                  : t('import.dropzoneHint')}
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

            {showPaste || pastedText ? (
              <Field htmlFor="import-paste" label={t('import.pasteLabel')}>
                <Textarea
                  id="import-paste"
                  value={pastedText}
                  onChange={handlePasteChange}
                  rows={5}
                  placeholder={t('import.pastePlaceholder')}
                  className="font-mono text-sm"
                />
              </Field>
            ) : (
              <button
                type="button"
                onClick={() => setShowPaste(true)}
                className="text-label inline-flex h-9 w-fit items-center gap-1 rounded-full px-2 text-accent hover:bg-accent-soft"
              >
                <Icon.Plus size={14} weight="bold" />
                {t('import.pasteInstead')}
              </button>
            )}

            {localError ? <ErrorMessage message={localError} /> : null}
            {previewMutation.isError ? (
              <ErrorMessage
                message={errorMessage(previewMutation.error, t('errors.generic'))}
                onRetry={handlePreview}
              />
            ) : null}

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handlePreview}
                loading={previewMutation.isPending}
                disabled={!hasSource || previewMutation.isPending}
                trailingIcon={
                  <Icon.CaretRight size={16} weight="bold" className="rtl:-scale-x-100" />
                }
                className="w-full sm:w-auto"
              >
                {t('import.previewButton')}
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      {step === 2 && previewResult ? (
        <Panel
          flush
          title={t('import.step2Title')}
          className="animate-rise"
          actions={
            <div className="flex gap-2">
              <Badge tone="gain" icon={<Icon.Check weight="bold" />}>
                {t('import.validCount', { count: previewResult.validCount })}
              </Badge>
              {previewResult.errorCount > 0 ? (
                <Badge tone="loss" icon={<Icon.WarningCircle weight="fill" />}>
                  {t('import.errorCount', { count: previewResult.errorCount })}
                </Badge>
              ) : null}
            </div>
          }
        >
          <PreviewTable rows={previewResult.rows} language={settings.language} />

          <div className="flex flex-col gap-3 p-5 md:p-6">
            {commitMutation.isError ? (
              <ErrorMessage message={errorMessage(commitMutation.error, t('errors.generic'))} />
            ) : null}
            {previewResult.errorCount > 0 ? (
              <p className="text-caption text-ink-2">{t('import.fixErrorsHint')}</p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="lg" onClick={handleStartOver}>
                {t('import.startOver')}
              </Button>
              <Button
                size="lg"
                onClick={() => commitMutation.mutate()}
                loading={commitMutation.isPending}
                disabled={previewResult.errorCount > 0 || commitMutation.isPending}
                trailingIcon={<Icon.Check size={16} weight="bold" />}
              >
                {t('import.commitButton', { count: previewResult.validCount })}
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      {step === 3 && committedResult ? (
        <Panel tone="gain" className="animate-rise">
          <EmptyState
            icon={<Icon.Check weight="bold" />}
            title={t('import.successTitle')}
            description={t('import.successMessage', { count: committedResult.importedCount })}
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => void navigate('/transactions')}>
                  {t('import.viewTransactions')}
                </Button>
                <Button variant="secondary" onClick={handleStartOver}>
                  {t('import.importMore')}
                </Button>
              </div>
            }
          />
        </Panel>
      ) : null}
    </>
  );
}
