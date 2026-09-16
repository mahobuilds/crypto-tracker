import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/errors';
import { fetchFxRates } from './fx';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

describe('fetchFxRates', () => {
  it('maps the upstream response, adding USD as the 1 base rate', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ result: 'success', rates: { EUR: 0.92, SAR: 3.75, TRY: 34.1 } }),
      );

    const result = await fetchFxRates(fetchImpl);

    expect(result).toMatchObject({
      base: 'USD',
      rates: { USD: 1, EUR: 0.92, SAR: 3.75, TRY: 34.1 },
    });
    expect(typeof result.updatedAt).toBe('string');
  });

  it('throws a 502 ApiError when a required rate is missing', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ result: 'success', rates: { EUR: 0.92, SAR: 3.75 } }));

    await expect(fetchFxRates(fetchImpl)).rejects.toMatchObject({
      status: 502,
      code: 'UPSTREAM_ERROR',
    });
    await expect(fetchFxRates(fetchImpl)).rejects.toBeInstanceOf(ApiError);
  });

  it('throws a 502 ApiError on a non-2xx response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    await expect(fetchFxRates(fetchImpl)).rejects.toMatchObject({
      status: 502,
      code: 'UPSTREAM_ERROR',
    });
  });
});
