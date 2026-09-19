import type {
  AlertDirection,
  ChartKind,
  Currency,
  Language,
  PortfolioView,
  Theme,
  TransactionScope,
  TransactionType,
} from './constants';

export interface ChartPrefs {
  lineChart: boolean;
  pieChart: boolean;
  order: ChartKind[];
}

export interface Settings {
  language: Language;
  baseCurrency: Currency;
  largeText: boolean;
  theme: Theme;
  alertsEnabled: boolean;
  chartPrefs: ChartPrefs;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  baseCurrency: 'USD',
  largeText: false,
  theme: 'system',
  alertsEnabled: false,
  chartPrefs: { lineChart: true, pieChart: true, order: ['line', 'pie'] },
};

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/** Response of `GET /api/me`. */
export interface MeResponse {
  user: CurrentUser;
  settings: Settings;
}

/**
 * One person in a group transaction and their share of it, in whole percent (1-99).
 * Exactly one participant per group trade is the account owner (`isMe`).
 */
export interface TransactionParticipant {
  name: string;
  sharePct: number;
  isMe: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Personal trades have no participants; group trades list them, shares summing to 100. */
  scope: TransactionScope;
  participants: TransactionParticipant[];
  /** CoinGecko id, e.g. "bitcoin". */
  coinId: string;
  /** Upper-case ticker, e.g. "BTC". */
  coinSymbol: string;
  /** Display name, e.g. "Bitcoin". */
  coinName: string;
  quantity: number;
  /** Price per unit in `currency`, as entered. */
  pricePerUnit: number;
  currency: Currency;
  /** Price per unit converted to USD at entry time. */
  pricePerUnitUsd: number;
  /** Fee in `currency`, as entered. */
  fee: number;
  feeUsd: number;
  /** ISO 8601 timestamp of the trade. */
  occurredAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body of `POST /api/transactions` and `PUT /api/transactions/:id`. */
export interface TransactionInput {
  type: TransactionType;
  scope: TransactionScope;
  participants: TransactionParticipant[];
  coinId: string;
  coinSymbol: string;
  coinName: string;
  quantity: number;
  pricePerUnit: number;
  currency: Currency;
  fee: number;
  occurredAt: string;
  note: string | null;
}

/** Response of `GET /api/transactions`. */
export interface TransactionListResponse {
  transactions: Transaction[];
}

export interface PriceQuote {
  coinId: string;
  usd: number;
  eur: number;
  sar: number;
  try: number;
  /** 24 hour change in percent, e.g. -2.5 */
  change24hPct: number;
  updatedAt: string;
}

/** Response of `GET /api/prices?ids=a,b`. Missing coins are simply absent. */
export interface PricesResponse {
  prices: Record<string, PriceQuote>;
  updatedAt: string | null;
}

export interface FxRates {
  base: 'USD';
  /** Units of each currency per 1 USD. `USD` is always 1. */
  rates: Record<Currency, number>;
  updatedAt: string;
}

export interface CoinSearchResult {
  id: string;
  symbol: string;
  name: string;
  thumb: string | null;
}

/** Response of `GET /api/coins/search?q=`. */
export interface CoinSearchResponse {
  results: CoinSearchResult[];
}

export interface Holding {
  coinId: string;
  coinSymbol: string;
  coinName: string;
  quantity: number;
  averageCostUsd: number;
  /** quantity * averageCostUsd */
  investedUsd: number;
  /** Realized P/L from this coin's sells so far (average-cost method). */
  realizedPnlUsd: number;
  currentPriceUsd: number | null;
  currentValueUsd: number | null;
  unrealizedPnlUsd: number | null;
  unrealizedPnlPct: number | null;
  allocationPct: number | null;
}

/** Profit/loss figures under one cost-basis method. */
export interface PnlByMethod {
  realizedPnlUsd: number;
  /** Cost basis of what is still held. */
  investedUsd: number;
  /** Over priced holdings only; null when nothing is priced. */
  unrealizedPnlUsd: number | null;
  unrealizedPnlPct: number | null;
}

/** Response of `GET /api/portfolio?view=`. Top-level figures use the average-cost method. */
export interface PortfolioSummary {
  /** `whole` counts group trades in full; `mine` scales them to the owner's share. */
  view: PortfolioView;
  /** True when at least one group transaction exists, so the view toggle is worth showing. */
  hasGroupTransactions: boolean;
  totalValueUsd: number;
  investedUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  realizedPnlUsd: number;
  /** The same trades valued two ways, shown side by side on the dashboard. */
  methods: {
    average: PnlByMethod;
    fifo: PnlByMethod;
  };
  holdings: Holding[];
  fx: FxRates;
  pricesUpdatedAt: string | null;
}

export interface PortfolioSnapshot {
  takenAt: string;
  totalValueUsd: number;
  investedUsd: number;
  /** Owner's-share figures; null for snapshots taken before group trades existed. */
  ownTotalValueUsd: number | null;
  ownInvestedUsd: number | null;
}

export type HistoryRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

/** Response of `GET /api/portfolio/history?range=`. */
export interface PortfolioHistoryResponse {
  range: HistoryRange;
  points: PortfolioSnapshot[];
}

export interface Alert {
  id: string;
  coinId: string;
  coinSymbol: string;
  coinName: string;
  targetPriceUsd: number;
  direction: AlertDirection;
  enabled: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

/** Body of `POST /api/alerts` and `PUT /api/alerts/:id`. */
export interface AlertInput {
  coinId: string;
  coinSymbol: string;
  coinName: string;
  targetPriceUsd: number;
  direction: AlertDirection;
  enabled: boolean;
}

/** Response of `GET /api/alerts`. */
export interface AlertListResponse {
  alerts: Alert[];
}

/** Body of `POST /api/push/subscribe` (the browser `PushSubscription.toJSON()` shape). */
export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Response of `GET /api/push/vapid-public-key`. */
export interface VapidPublicKeyResponse {
  publicKey: string;
}

/** One parsed CSV row after validation. */
export interface ImportRowResult {
  /** 1-based line number in the uploaded file (header is line 1). */
  line: number;
  input: TransactionInput | null;
  errors: string[];
}

/** Body of `POST /api/transactions/import`. */
export interface ImportRequest {
  csv: string;
  mode: 'preview' | 'commit';
}

/** Response of `POST /api/transactions/import`. */
export interface ImportResponse {
  mode: 'preview' | 'commit';
  rows: ImportRowResult[];
  validCount: number;
  errorCount: number;
  /** Number of transactions written. Always 0 in preview mode. */
  importedCount: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
