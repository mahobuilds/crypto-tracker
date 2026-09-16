import type { Auth, AuthUser } from './auth';
import type { Database } from './db/client';

export type AppEnv = {
  Bindings: Env;
  Variables: { db: Database; auth: Auth; user: AuthUser };
};
