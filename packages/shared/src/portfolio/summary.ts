import type { FxRates, Holding, PnlByMethod, PortfolioSummary, PriceQuote } from '../types';
import { computeFifo } from './fifo';
import { computeHoldings, type TransactionLike } from './holdings';

export interface ComputePortfolioInput {
  transactions: readonly TransactionLike[];
  prices: Readonly<Record<string, PriceQuote | undefined>>;
  fx: FxRates;
  pricesUpdatedAt: string | null;
}

function pctOf(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

/** Builds the `GET /api/portfolio` summary from transactions and the latest prices. */
export function computePortfolio(input: ComputePortfolioInput): PortfolioSummary {
  const { holdings: cores, realizedPnlUsd } = computeHoldings(input.transactions);

  let totalValueUsd = 0;
  let investedUsd = 0;
  let pricedInvestedUsd = 0;

  const holdings: Holding[] = cores.map((core) => {
    investedUsd += core.investedUsd;
    const quote = input.prices[core.coinId];
    if (!quote) {
      return {
        ...core,
        currentPriceUsd: null,
        currentValueUsd: null,
        unrealizedPnlUsd: null,
        unrealizedPnlPct: null,
        allocationPct: null,
      };
    }
    const currentPriceUsd = quote.usd;
    const currentValueUsd = core.quantity * currentPriceUsd;
    const unrealizedPnlUsd = currentValueUsd - core.investedUsd;
    totalValueUsd += currentValueUsd;
    pricedInvestedUsd += core.investedUsd;
    return {
      ...core,
      currentPriceUsd,
      currentValueUsd,
      unrealizedPnlUsd,
      unrealizedPnlPct: pctOf(unrealizedPnlUsd, core.investedUsd),
      allocationPct: 0,
    };
  });

  for (const holding of holdings) {
    if (holding.currentValueUsd !== null) {
      holding.allocationPct = pctOf(holding.currentValueUsd, totalValueUsd);
    }
  }

  holdings.sort((a, b) => {
    if (a.currentValueUsd === null && b.currentValueUsd === null) {
      return b.investedUsd - a.investedUsd;
    }
    if (a.currentValueUsd === null) return 1;
    if (b.currentValueUsd === null) return -1;
    return b.currentValueUsd - a.currentValueUsd;
  });

  const unrealizedPnlUsd = totalValueUsd - pricedInvestedUsd;

  const average: PnlByMethod = {
    realizedPnlUsd,
    investedUsd,
    unrealizedPnlUsd: pricedInvestedUsd > 0 || totalValueUsd > 0 ? unrealizedPnlUsd : null,
    unrealizedPnlPct: pricedInvestedUsd > 0 ? pctOf(unrealizedPnlUsd, pricedInvestedUsd) : null,
  };

  const fifoResult = computeFifo(input.transactions);
  let fifoInvested = 0;
  let fifoPricedInvested = 0;
  let fifoPricedValue = 0;
  let anyPriced = false;
  for (const coin of Object.values(fifoResult.coins)) {
    fifoInvested += coin.investedUsd;
    const quote = input.prices[coin.coinId];
    if (quote) {
      anyPriced = true;
      fifoPricedInvested += coin.investedUsd;
      fifoPricedValue += coin.quantity * quote.usd;
    }
  }
  const fifoUnrealized = fifoPricedValue - fifoPricedInvested;
  const fifo: PnlByMethod = {
    realizedPnlUsd: fifoResult.realizedPnlUsd,
    investedUsd: fifoInvested,
    unrealizedPnlUsd: anyPriced ? fifoUnrealized : null,
    unrealizedPnlPct: fifoPricedInvested > 0 ? pctOf(fifoUnrealized, fifoPricedInvested) : null,
  };

  return {
    totalValueUsd,
    investedUsd,
    unrealizedPnlUsd,
    unrealizedPnlPct: pctOf(unrealizedPnlUsd, pricedInvestedUsd),
    realizedPnlUsd,
    methods: { average, fifo },
    holdings,
    fx: input.fx,
    pricesUpdatedAt: input.pricesUpdatedAt,
  };
}
