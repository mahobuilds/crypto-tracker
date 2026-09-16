import type { ApiErrorBody } from '@crypto-tracker/shared';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorBody(code: string, message: string): ApiErrorBody {
  return { error: { code, message } };
}
