import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { CoinSearchResponse, CoinSearchResult } from '@crypto-tracker/shared';
import { Icon } from '@/components/icons';
import { Avatar, Field, IconButton, Input, Spinner } from '@/components/ui';
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

function CoinThumb({ coin, size = 'sm' }: { coin: CoinSearchResult; size?: 'sm' | 'md' }) {
  return <Avatar label={coin.symbol} src={coin.thumb} size={size} />;
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
        <div className="flex min-h-12 items-center gap-3 rounded-[var(--r-sm)] bg-surface-2 py-1.5 ps-2 pe-1 ring-1 ring-black/5 dark:ring-white/8">
          <CoinThumb coin={value} size="md" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[0.9375rem] font-semibold">{value.name}</span>
            <span className="text-caption block text-ink-2 uppercase">{value.symbol}</span>
          </span>
          <IconButton id={`${inputId}-clear`} onClick={clear} aria-label={t('common.clear')}>
            <Icon.X />
          </IconButton>
        </div>
      </Field>
    );
  }

  return (
    <Field htmlFor={inputId} label={fieldLabel} hint={t('common.searchMinChars')}>
      <div className="relative">
        <Icon.MagnifyingGlass className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-3" />
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
            className="animate-fade absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-[var(--r-md)] bg-surface p-1.5 shadow-panel ring-1 ring-black/5 dark:ring-white/8"
          >
            {isSearching ? (
              <li className="flex items-center justify-center px-4 py-4">
                <Spinner size="sm" />
              </li>
            ) : results.length === 0 ? (
              <li className="px-4 py-4 text-center text-base text-ink-2">
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
                    'flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--r-sm)] px-3 py-2 transition-colors duration-150',
                    index === activeIndex ? 'bg-accent-soft text-ink' : 'hover:bg-surface-2',
                  )}
                >
                  <CoinThumb coin={coin} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium">{coin.name}</span>
                    <span className="text-caption block text-ink-2 uppercase">{coin.symbol}</span>
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
