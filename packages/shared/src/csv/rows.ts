import { CURRENCIES, TRANSACTION_TYPES, type Currency, type TransactionType } from '../constants';
import { parseCsv } from './parse';

export const CSV_COLUMNS = [
  'date',
  'type',
  'coin',
  'quantity',
  'price',
  'currency',
  'fee',
  'note',
] as const;

export interface CsvRowValues {
  /** ISO 8601, normalized with `new Date(...).toISOString()`. */
  occurredAt: string;
  type: TransactionType;
  /** Ticker or CoinGecko id as typed, trimmed; the API resolves it. */
  coin: string;
  quantity: number;
  pricePerUnit: number;
  currency: Currency;
  fee: number;
  note: string | null;
}

export interface CsvRowResult {
  /** 1-based line number in the file (the header is line 1). */
  line: number;
  values: CsvRowValues | null;
  errors: string[];
}

export interface CsvParseResult {
  headerErrors: string[];
  rows: CsvRowResult[];
}

const REQUIRED_COLUMNS = ['date', 'type', 'coin', 'quantity', 'price'] as const;
type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];
type OptionalColumn = 'currency' | 'fee' | 'note';
type KnownColumn = RequiredColumn | OptionalColumn;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_SPACE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const DATE_ISO_WITH_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

function parseOccurredAt(raw: string): string | null {
  const value = raw.trim();
  if (DATE_ONLY.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (DATE_TIME_SPACE.test(value)) {
    const date = new Date(`${value.replace(' ', 'T')}:00Z`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (DATE_ISO_WITH_TIME.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

// Thousands separators only ever reach here inside a quoted field (the
// tokenizer already used unquoted commas to split fields), so they are safe
// to strip before parsing a plain decimal number.
function parseNumber(raw: string): number | null {
  const value = raw.trim().replace(/,/g, '');
  if (value === '' || !/^-?\d+(\.\d+)?$/.test(value)) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parses CSV text into transaction rows, validating every column.
 * Returns one result per data row (or `headerErrors` if required columns
 * are missing, in which case `rows` is empty).
 */
export function parseTransactionsCsv(
  text: string,
  options: { defaultCurrency: Currency },
): CsvParseResult {
  const records = parseCsv(text);
  const [headerRecord, ...dataRecords] = records;

  if (!headerRecord || headerRecord.length === 0) {
    return {
      headerErrors: REQUIRED_COLUMNS.map((column) => `missing required column "${column}"`),
      rows: [],
    };
  }

  const header = headerRecord.map((cell) => cell.trim().toLowerCase());
  const columnIndex = new Map<KnownColumn, number>();
  for (const [index, name] of header.entries()) {
    if (
      (CSV_COLUMNS as readonly string[]).includes(name) &&
      !columnIndex.has(name as KnownColumn)
    ) {
      columnIndex.set(name as KnownColumn, index);
    }
  }

  const headerErrors: string[] = [];
  for (const column of REQUIRED_COLUMNS) {
    if (!columnIndex.has(column)) {
      headerErrors.push(`missing required column "${column}"`);
    }
  }

  if (headerErrors.length > 0) {
    return { headerErrors, rows: [] };
  }

  const rows: CsvRowResult[] = [];

  for (const [recordIndex, record] of dataRecords.entries()) {
    const line = recordIndex + 2;
    if (record.length === 0) continue;

    const errors: string[] = [];
    const cell = (column: KnownColumn): string => {
      const index = columnIndex.get(column);
      return index === undefined ? '' : (record[index] ?? '');
    };

    const dateRaw = cell('date');
    const occurredAt = parseOccurredAt(dateRaw);
    if (occurredAt === null) {
      errors.push(`date must be an ISO 8601 date or "YYYY-MM-DD HH:mm", got "${dateRaw.trim()}"`);
    }

    const typeRaw = cell('type').trim();
    const typeLower = typeRaw.toLowerCase();
    const type = (TRANSACTION_TYPES as readonly string[]).includes(typeLower)
      ? (typeLower as TransactionType)
      : null;
    if (type === null) {
      errors.push(`type must be one of ${TRANSACTION_TYPES.join(', ')}, got "${typeRaw}"`);
    }

    const coinRaw = cell('coin').trim();
    let coin: string | null = null;
    if (coinRaw === '') {
      errors.push('coin must not be empty');
    } else if (coinRaw.length > 100) {
      errors.push(`coin must be at most 100 characters, got "${coinRaw}"`);
    } else {
      coin = coinRaw;
    }

    const quantityRaw = cell('quantity');
    const quantity = parseNumber(quantityRaw);
    if (quantity === null || quantity <= 0) {
      errors.push(`quantity must be a number greater than 0, got "${quantityRaw.trim()}"`);
    }

    const priceRaw = cell('price');
    const price = parseNumber(priceRaw);
    if (price === null || price < 0) {
      errors.push(`price must be a number greater than or equal to 0, got "${priceRaw.trim()}"`);
    }

    const currencyRaw = columnIndex.has('currency') ? cell('currency').trim() : '';
    let currency: Currency = options.defaultCurrency;
    if (currencyRaw !== '') {
      const currencyUpper = currencyRaw.toUpperCase();
      if ((CURRENCIES as readonly string[]).includes(currencyUpper)) {
        currency = currencyUpper as Currency;
      } else {
        errors.push(`currency must be one of ${CURRENCIES.join(', ')}, got "${currencyRaw}"`);
      }
    }

    const feeRaw = columnIndex.has('fee') ? cell('fee').trim() : '';
    let fee = 0;
    if (feeRaw !== '') {
      const parsedFee = parseNumber(feeRaw);
      if (parsedFee === null || parsedFee < 0) {
        errors.push(`fee must be a number greater than or equal to 0, got "${feeRaw}"`);
      } else {
        fee = parsedFee;
      }
    }

    const noteRaw = columnIndex.has('note') ? cell('note').trim() : '';
    let note: string | null = null;
    if (noteRaw !== '') {
      if (noteRaw.length > 500) {
        errors.push(`note must be at most 500 characters, got "${noteRaw.slice(0, 20)}..."`);
      } else {
        note = noteRaw;
      }
    }

    if (errors.length > 0) {
      rows.push({ line, values: null, errors });
      continue;
    }

    rows.push({
      line,
      values: {
        occurredAt: occurredAt as string,
        type: type as TransactionType,
        coin: coin as string,
        quantity: quantity as number,
        pricePerUnit: price as number,
        currency,
        fee,
        note,
      },
      errors: [],
    });
  }

  return { headerErrors: [], rows };
}
