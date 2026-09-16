import type { ApiErrorBody } from '@crypto-tracker/shared';
import { supabase } from '@/lib/supabase';
import { isMockEnabled, mockResponse } from '@/dev/mock';

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type ApiInit = RequestInit & { json?: unknown };

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const error = (value as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return typeof code === 'string' && typeof message === 'string';
}

export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  if (import.meta.env.DEV && isMockEnabled()) {
    const mocked = mockResponse(path, init);
    if (mocked !== null) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return mocked as T;
    }
  }
  const { json, headers, ...rest } = init;
  const requestHeaders = new Headers(headers);
  let body = rest.body;
  if (json !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    requestHeaders.set('Authorization', `Bearer ${data.session.access_token}`);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      body,
      headers: requestHeaders,
    });
  } catch (cause) {
    throw new ApiRequestError(
      0,
      'NETWORK',
      cause instanceof Error ? cause.message : 'Network error',
    );
  }

  if (!response.ok) {
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    if (isApiErrorBody(parsed)) {
      throw new ApiRequestError(response.status, parsed.error.code, parsed.error.message);
    }
    throw new ApiRequestError(
      response.status,
      'UNKNOWN',
      response.statusText || `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
