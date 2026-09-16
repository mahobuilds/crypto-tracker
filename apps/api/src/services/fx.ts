import type { FxRates } from '@crypto-tracker/shared';
import { ApiError } from '../lib/errors';
import { nowIso } from '../lib/time';

const FX_URL = 'https://open.er-api.com/v6/latest/USD';

interface FxResponse {
  result: string;
  rates?: Record<string, number>;
}

export async function fetchFxRates(fetchImpl: typeof fetch = fetch): Promise<FxRates> {
  let response: Response;
  try {
    response = await fetchImpl(FX_URL, {
      headers: { Accept: 'application/json', 'User-Agent': 'crypto-tracker/1.0' },
    });
  } catch (error) {
    throw new ApiError(
      502,
      'UPSTREAM_ERROR',
      `Failed to reach the FX service: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      502,
      'UPSTREAM_ERROR',
      `FX service responded with status ${response.status}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(502, 'UPSTREAM_ERROR', 'FX service returned a non-JSON response');
  }

  let data: FxResponse;
  try {
    data = (await response.json()) as FxResponse;
  } catch {
    throw new ApiError(502, 'UPSTREAM_ERROR', 'FX service returned malformed JSON');
  }

  const rates = data.rates;
  const eur = rates?.EUR;
  const sar = rates?.SAR;
  const try_ = rates?.TRY;
  if (typeof eur !== 'number' || typeof sar !== 'number' || typeof try_ !== 'number') {
    throw new ApiError(502, 'UPSTREAM_ERROR', 'FX service response is missing required rates');
  }

  return {
    base: 'USD',
    rates: { USD: 1, EUR: eur, SAR: sar, TRY: try_ },
    updatedAt: nowIso(),
  };
}
