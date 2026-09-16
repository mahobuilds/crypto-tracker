import type { AuthUser } from './auth';
import type { Database } from './db/client';
import type { Env } from './env';

/** Hono context shape for every route in the API. `env` and `db` are set by `withContext`, `user` by `requireAuth`. */
export type AppEnv = {
  Variables: {
    env: Env;
    db: Database;
    user: AuthUser;
  };
};
