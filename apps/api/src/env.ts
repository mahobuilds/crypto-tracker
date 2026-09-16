import 'dotenv/config';
import { MemoryCache } from './lib/memory-cache';

/** Runtime configuration. Loaded once at startup from process.env (dotenv in development). */
export interface Env {
  /** Public origin of the app, e.g. http://localhost:5173 or https://app.up.railway.app */
  APP_ORIGIN: string;
  PORT: number;
  /** Supabase Postgres connection string (pooler URI). */
  DATABASE_URL: string;
  /** https://<project-ref>.supabase.co */
  SUPABASE_URL: string;
  /** Only for projects still on the legacy HS256 JWT secret; otherwise JWKS is used. */
  SUPABASE_JWT_SECRET?: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  CACHE: MemoryCache;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export function loadEnv(): Env {
  return {
    APP_ORIGIN: process.env.APP_ORIGIN?.trim() || 'http://localhost:5173',
    PORT: Number(process.env.PORT ?? 8787),
    DATABASE_URL: required('DATABASE_URL'),
    SUPABASE_URL: required('SUPABASE_URL'),
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET?.trim() || undefined,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY?.trim() ?? '',
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY?.trim() ?? '',
    VAPID_SUBJECT: process.env.VAPID_SUBJECT?.trim() ?? 'mailto:admin@example.com',
    CACHE: new MemoryCache(),
  };
}
