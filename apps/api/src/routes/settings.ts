import { Hono } from 'hono';
import { settingsUpdateSchema, type Settings, type SettingsUpdate } from '@crypto-tracker/shared';
import { getOrCreateSettings, saveSettings } from '../db/settings';
import { ApiError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

/** Merges a partial settings patch into the current settings. `chartPrefs` is replaced whole. */
export function mergeSettings(current: Settings, patch: SettingsUpdate): Settings {
  return { ...current, ...patch };
}

export function createSettingsRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>().use(requireAuth).put('/', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Body must be JSON');
    }

    const parsed = settingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const [issue] = parsed.error.issues;
      if (issue) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${issue.path.join('.')}: ${issue.message}`);
      }
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid settings');
    }

    const patch = parsed.data;
    if (Object.keys(patch).length === 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'No settings provided');
    }

    const user = c.get('user');
    const db = c.get('db');
    const current = await getOrCreateSettings(db, user.id);
    const next = mergeSettings(current, patch);
    return c.json(await saveSettings(db, user.id, next));
  });
}
