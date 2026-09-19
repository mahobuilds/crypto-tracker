/**
 * Development-only fixtures so every screen can be viewed without a Google session or a
 * database. Enable with `?mock=1` (stored in localStorage), disable with `?mock=0`.
 * Everything here is tree-shaken out of production builds via `import.meta.env.DEV`.
 */
import type {
  Alert,
  AlertListResponse,
  CoinSearchResponse,
  FxRates,
  ImportResponse,
  MeResponse,
  PortfolioHistoryResponse,
  PortfolioSummary,
  PortfolioView,
  PricesResponse,
  Transaction,
  TransactionListResponse,
} from '@crypto-tracker/shared';
import { DEFAULT_SETTINGS } from '@crypto-tracker/shared';

const STORAGE_KEY = 'crypto-tracker.mock';

export function isMockEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    const param = new URLSearchParams(window.location.search).get('mock');
    if (param === '1') localStorage.setItem(STORAGE_KEY, '1');
    if (param === '0') localStorage.removeItem(STORAGE_KEY);
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export const mockUser = {
  id: 'mock-user',
  email: 'mahmoud@example.com',
  name: 'Mahmoud',
  image: null,
};

const fx: FxRates = {
  base: 'USD',
  rates: { USD: 1, EUR: 0.865688, SAR: 3.75, TRY: 48.636754 },
  updatedAt: new Date().toISOString(),
};

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const DAY = 24 * 60 * 60 * 1000;

const transactions: Transaction[] = [
  tx('t1', 'buy', 'ethereum', 'ETH', 'Ethereum', 2, 2000, 'USD', 0, iso(15 * DAY), null),
  tx(
    't2',
    'buy',
    'solana',
    'SOL',
    'Solana',
    25,
    142.1,
    'USD',
    2.5,
    iso(30 * DAY),
    'Bought the dip',
  ),
  tx('t3', 'sell', 'bitcoin', 'BTC', 'Bitcoin', 0.2, 80860.54, 'USD', 0, iso(44 * DAY), null),
  tx('t4', 'buy', 'chainlink', 'LINK', 'Chainlink', 120, 15.2, 'USD', 0, iso(55 * DAY), null),
  tx('t5', 'buy', 'bitcoin', 'BTC', 'Bitcoin', 0.5, 60000, 'USD', 10, iso(67 * DAY), 'First buy'),
  tx('t6', 'buy', 'cardano', 'ADA', 'Cardano', 3200, 0.62, 'USD', 0, iso(74 * DAY), null),
];
transactions[1]!.scope = 'group';
transactions[1]!.participants = [
  { name: mockUser.name, sharePct: 50, isMe: true },
  { name: 'Omar', sharePct: 30, isMe: false },
  { name: 'Sami', sharePct: 20, isMe: false },
];

function tx(
  id: string,
  type: Transaction['type'],
  coinId: string,
  coinSymbol: string,
  coinName: string,
  quantity: number,
  pricePerUnit: number,
  currency: Transaction['currency'],
  fee: number,
  occurredAt: string,
  note: string | null,
): Transaction {
  return {
    id,
    type,
    scope: 'personal',
    participants: [],
    coinId,
    coinSymbol,
    coinName,
    quantity,
    pricePerUnit,
    currency,
    pricePerUnitUsd: pricePerUnit,
    fee,
    feeUsd: fee,
    occurredAt,
    note,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

const PRICES_UPDATED_AT = iso(2 * 60 * 1000);

const prices: PricesResponse = {
  prices: {
    bitcoin: quote('bitcoin', 77774, 0.21),
    ethereum: quote('ethereum', 2504.84, -0.26),
    solana: quote('solana', 168.4, 1.84),
    chainlink: quote('chainlink', 21.9, -0.9),
    cardano: quote('cardano', 0.71, 2.3),
    ripple: quote('ripple', 0.5821, 2.4),
    dogecoin: quote('dogecoin', 0.1832, 3.1),
  },
  updatedAt: PRICES_UPDATED_AT,
};

function quote(coinId: string, usd: number, change24hPct: number) {
  return {
    coinId,
    usd,
    eur: usd * fx.rates.EUR,
    sar: usd * fx.rates.SAR,
    try: usd * fx.rates.TRY,
    change24hPct,
    updatedAt: PRICES_UPDATED_AT,
  };
}

const holdingsSpec = [
  ['bitcoin', 'BTC', 'Bitcoin', 0.3, 60020],
  ['ethereum', 'ETH', 'Ethereum', 2, 2000],
  ['solana', 'SOL', 'Solana', 25, 142.2],
  ['chainlink', 'LINK', 'Chainlink', 120, 15.2],
  ['cardano', 'ADA', 'Cardano', 3200, 0.62],
] as const;

function portfolio(view: PortfolioView): PortfolioSummary {
  // In mock data only the SOL buy is a group trade, at a 50% owner share.
  const ownShare = (coinId: string) => (view === 'mine' && coinId === 'solana' ? 0.5 : 1);
  const holdings = holdingsSpec.map(([coinId, coinSymbol, coinName, wholeQty, averageCostUsd]) => {
    const price = prices.prices[coinId]?.usd ?? null;
    const quantity = wholeQty * ownShare(coinId);
    const investedUsd = quantity * averageCostUsd;
    const currentValueUsd = price === null ? null : quantity * price;
    const pnl = currentValueUsd === null ? null : currentValueUsd - investedUsd;
    return {
      coinId,
      coinSymbol,
      coinName,
      quantity,
      averageCostUsd,
      investedUsd,
      realizedPnlUsd: coinId === 'bitcoin' ? 4168.11 * ownShare(coinId) : 0,
      currentPriceUsd: price,
      currentValueUsd,
      unrealizedPnlUsd: pnl,
      unrealizedPnlPct: pnl === null ? null : (pnl / investedUsd) * 100,
      allocationPct: null as number | null,
    };
  });
  const totalValueUsd = holdings.reduce((s, h) => s + (h.currentValueUsd ?? 0), 0);
  const investedUsd = holdings.reduce((s, h) => s + h.investedUsd, 0);
  for (const h of holdings) {
    h.allocationPct = h.currentValueUsd === null ? null : (h.currentValueUsd / totalValueUsd) * 100;
  }
  holdings.sort((a, b) => (b.currentValueUsd ?? 0) - (a.currentValueUsd ?? 0));
  const unrealizedPnlUsd = totalValueUsd - investedUsd;
  return {
    view,
    hasGroupTransactions: true,
    totalValueUsd,
    investedUsd,
    unrealizedPnlUsd,
    unrealizedPnlPct: (unrealizedPnlUsd / investedUsd) * 100,
    realizedPnlUsd: 4168.11,
    methods: {
      average: {
        realizedPnlUsd: 4168.11,
        investedUsd,
        unrealizedPnlUsd,
        unrealizedPnlPct: (unrealizedPnlUsd / investedUsd) * 100,
      },
      fifo: {
        realizedPnlUsd: 3912.4,
        investedUsd: investedUsd + 255.71,
        unrealizedPnlUsd: unrealizedPnlUsd - 255.71,
        unrealizedPnlPct: ((unrealizedPnlUsd - 255.71) / (investedUsd + 255.71)) * 100,
      },
    },
    holdings,
    fx,
    pricesUpdatedAt: prices.updatedAt,
  };
}

function history(range: string): PortfolioHistoryResponse {
  const spanDays = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: 120 }[range] ?? 30;
  const count = Math.min(240, spanDays <= 1 ? 24 : spanDays * 4);
  const summary = portfolio('whole');
  const mine = portfolio('mine');
  const ownRatio = mine.investedUsd / summary.investedUsd;
  const invested = summary.investedUsd;
  const finalPnl = summary.unrealizedPnlUsd;
  const points = [];
  let v = -invested * 0.06;
  for (let i = 0; i < count; i++) {
    const drift = i < count * 0.33 ? 1.4 : i < count * 0.58 ? -0.9 : 2.6;
    v +=
      (invested * drift) / count +
      Math.sin(i / 3.1) * invested * 0.006 +
      Math.cos(i / 7.3) * invested * 0.004;
    points.push(v);
  }
  const scale = finalPnl / (points[points.length - 1] || 1);
  return {
    range: range as PortfolioHistoryResponse['range'],
    points: points.map((p, i) => ({
      takenAt: iso(((count - 1 - i) / (count - 1)) * spanDays * DAY),
      investedUsd: invested,
      totalValueUsd: invested + p * scale,
      ownInvestedUsd: mine.investedUsd,
      ownTotalValueUsd: mine.investedUsd + p * scale * ownRatio,
    })),
  };
}

const alerts: Alert[] = [
  {
    id: 'a1',
    coinId: 'bitcoin',
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    targetPriceUsd: 90000,
    direction: 'above',
    enabled: true,
    triggeredAt: null,
    createdAt: iso(3 * DAY),
  },
  {
    id: 'a2',
    coinId: 'ethereum',
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    targetPriceUsd: 2200,
    direction: 'below',
    enabled: true,
    triggeredAt: null,
    createdAt: iso(5 * DAY),
  },
  {
    id: 'a3',
    coinId: 'solana',
    coinSymbol: 'SOL',
    coinName: 'Solana',
    targetPriceUsd: 160,
    direction: 'above',
    enabled: false,
    triggeredAt: iso(2 * DAY),
    createdAt: iso(9 * DAY),
  },
];

function initialLanguage(): 'en' | 'ar' {
  try {
    return new URLSearchParams(window.location.search).get('lang') === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

const me: MeResponse = {
  user: mockUser,
  settings: { ...DEFAULT_SETTINGS, alertsEnabled: true, language: initialLanguage() },
};

const coins = [
  ['bitcoin', 'BTC', 'Bitcoin'],
  ['ethereum', 'ETH', 'Ethereum'],
  ['ripple', 'XRP', 'XRP'],
  ['solana', 'SOL', 'Solana'],
  ['dogecoin', 'DOGE', 'Dogecoin'],
  ['cardano', 'ADA', 'Cardano'],
  ['chainlink', 'LINK', 'Chainlink'],
] as const;

/** Returns a fixture for the request or `null` to fall through to the real API. */
export function mockResponse(path: string, init: RequestInit & { json?: unknown }): unknown {
  const url = new URL(path, 'http://mock');
  const p = url.pathname;
  const method = (init.method ?? 'GET').toUpperCase();

  if (p === '/api/me') return me;
  if (p === '/api/settings' && method === 'PUT') {
    Object.assign(me.settings, init.json as object);
    return me.settings;
  }
  if (p === '/api/portfolio') {
    return portfolio(url.searchParams.get('view') === 'mine' ? 'mine' : 'whole');
  }
  if (p === '/api/portfolio/history') return history(url.searchParams.get('range') ?? '30d');
  if (p === '/api/prices') {
    const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
    const subset: PricesResponse['prices'] = {};
    for (const id of ids) {
      const q = prices.prices[id];
      if (q) subset[id] = q;
    }
    return { prices: subset, updatedAt: prices.updatedAt } satisfies PricesResponse;
  }
  if (p === '/api/fx') return fx;
  if (p === '/api/coins/search') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    return {
      results: coins
        .filter(([id, sym, name]) => `${id} ${sym} ${name}`.toLowerCase().includes(q))
        .map(([id, symbol, name]) => ({ id, symbol, name, thumb: null })),
    } satisfies CoinSearchResponse;
  }
  if (p === '/api/transactions' && method === 'GET') {
    const coinId = url.searchParams.get('coinId');
    const type = url.searchParams.get('type');
    return {
      transactions: transactions.filter(
        (t) => (!coinId || t.coinId === coinId) && (!type || t.type === type),
      ),
    } satisfies TransactionListResponse;
  }
  if (p === '/api/transactions' && method === 'POST') {
    const input = init.json as Omit<Transaction, 'id'>;
    const created = tx(
      `t${Date.now()}`,
      input.type,
      input.coinId,
      input.coinSymbol,
      input.coinName,
      input.quantity,
      input.pricePerUnit,
      input.currency,
      input.fee,
      input.occurredAt,
      input.note,
    );
    created.scope = input.scope;
    created.participants = input.participants;
    transactions.unshift(created);
    return created;
  }
  if (p.startsWith('/api/transactions/') && p !== '/api/transactions/import') {
    const id = p.split('/').pop();
    const index = transactions.findIndex((t) => t.id === id);
    if (method === 'DELETE') {
      if (index >= 0) transactions.splice(index, 1);
      return undefined;
    }
    if (method === 'PUT' && index >= 0) {
      const current = transactions[index]!;
      const updated = { ...current, ...(init.json as object) } as Transaction;
      transactions[index] = updated;
      return updated;
    }
  }
  if (p === '/api/transactions/import') {
    const body = init.json as { mode: 'preview' | 'commit' };
    const rows: ImportResponse['rows'] = [
      {
        line: 2,
        input: {
          type: 'buy',
          scope: 'personal',
          participants: [],
          coinId: 'ethereum',
          coinSymbol: 'ETH',
          coinName: 'Ethereum',
          quantity: 2,
          pricePerUnit: 2000,
          currency: 'USD',
          fee: 0,
          occurredAt: iso(20 * DAY),
          note: null,
        },
        errors: [],
      },
      { line: 3, input: null, errors: ['coin "nope-coin" not found'] },
      {
        line: 4,
        input: null,
        errors: ['quantity must be a number greater than 0, got "abc"'],
      },
    ];
    return {
      mode: body.mode,
      rows,
      validCount: 1,
      errorCount: 2,
      importedCount: body.mode === 'commit' ? 1 : 0,
    } satisfies ImportResponse;
  }
  if (p === '/api/alerts' && method === 'GET') return { alerts } satisfies AlertListResponse;
  if (p === '/api/alerts' && method === 'POST') {
    const created = {
      ...(init.json as Omit<Alert, 'id' | 'triggeredAt' | 'createdAt'>),
      id: `a${Date.now()}`,
      triggeredAt: null,
      createdAt: iso(0),
    } as Alert;
    alerts.unshift(created);
    return created;
  }
  if (p.startsWith('/api/alerts/')) {
    const id = p.split('/').pop();
    const index = alerts.findIndex((a) => a.id === id);
    if (method === 'DELETE') {
      if (index >= 0) alerts.splice(index, 1);
      return undefined;
    }
    if (method === 'PUT' && index >= 0) {
      const updated = { ...alerts[index]!, ...(init.json as object), triggeredAt: null } as Alert;
      alerts[index] = updated;
      return updated;
    }
  }
  if (p === '/api/push/vapid-public-key') return { publicKey: 'mock' };
  return null;
}
