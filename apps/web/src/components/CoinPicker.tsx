import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { CoinSearchResponse, CoinSearchResult } from '@crypto-tracker/shared';
import { CloseIcon, CoinIcon, SearchIcon } from '@/components/icons';
import { Field, Input, Spinner } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query';

export interface CoinPickerProps {
  value: CoinSearchResult | null;
  onChange: (coin: CoinSearchResult | null) => void;
  label?: string;
  autoFocus?: boolean;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const EMPTY_RESULTS: CoinSearchResult[] = [];

function CoinThumb({ coin }: { coin: CoinSearchResult }) {
  if (coin.thumb) {
    return <img src={coin.thumb} alt="" className="size-8 shrink-0 rounded-full" />;
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-300">
      <CoinIcon className="size-5" />
    </span>
  );
}

export function CoinPicker({ value, onChange, label, autoFocus = false }: CoinPickerProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const listId = `${inputId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const canSearch = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const search = useQuery({
    queryKey: queryKeys.coinSearch(debouncedQuery),
    queryFn: () =>
      apiFetch<CoinSearchResponse>(`/api/coins/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: canSearch,
    staleTime: 5 * 60 * 1000,
  });

  const results = canSearch && search.data ? search.data.results : EMPTY_RESULTS;
  const isSearching = canSearch && (search.isPending || debouncedQuery !== trimmed);
  const showList = open && trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  function select(coin: CoinSearchResult) {
    onChange(coin);
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (!showList) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) {
        setActiveIndex((index) => (index - 1 + results.length) % results.length);
      }
    } else if (event.key === 'Enter') {
      const coin = results[activeIndex];
      if (coin) {
        event.preventDefault();
        select(coin);
      }
    }
  }

  const fieldLabel = label ?? t('common.search');

  if (value) {
    return (
      <Field htmlFor={`${inputId}-clear`} label={fieldLabel}>
        <div className="touch-target flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
          <CoinThumb coin={value} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold">{value.name}</span>
            <span className="block text-sm text-slate-600 uppercase dark:text-slate-400">
              {value.symbol}
            </span>
          </span>
          <button
            id={`${inputId}-clear`}
            type="button"
            onClick={clear}
            aria-label={t('common.clear')}
            className="touch-target inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
      </Field>
    );
  }

  return (
    <Field htmlFor={inputId} label={fieldLabel} hint={t('common.searchMinChars')}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
        <Input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder={t('common.search')}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          className="ps-11"
        />
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {isSearching ? (
              <li className="flex items-center justify-center px-4 py-4">
                <Spinner size="sm" />
              </li>
            ) : results.length === 0 ? (
              <li className="px-4 py-4 text-center text-base text-slate-600 dark:text-slate-400">
                {t('common.noResults')}
              </li>
            ) : (
              results.map((coin, index) => (
                <li
                  key={coin.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(coin)}
                  className={cn(
                    'touch-target flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2',
                    index === activeIndex
                      ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  <CoinThumb coin={coin} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">{coin.name}</span>
                    <span className="block text-sm text-slate-600 uppercase dark:text-slate-400">
                      {coin.symbol}
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
