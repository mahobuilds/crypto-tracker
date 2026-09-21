import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAlertCheckJob } from './cron/alerts';
import { cronJobs } from './cron';
import { createFxRefreshJob } from './cron/fx';
import { createPriceRefreshJob } from './cron/prices';
import { createSnapshotJob } from './cron/snapshots';
import type { Database } from './db/client';
import type { Env } from './env';
import { ApiError, errorBody } from './lib/errors';
import { withContext } from './middleware/context';
import { createAlertsRoutes } from './routes/alerts';
import { createCoinsRoutes } from './routes/coins';
import { healthRoutes } from './routes/health';
import { meRoutes } from './routes/me';
import { createPortfolioRoutes } from './routes/portfolio';
import { createFxRoutes, createPricesRoutes } from './routes/prices';
import { createPushRoutes } from './routes/push';
import { createSettingsRoutes } from './routes/settings';
import { createTransactionsRoutes } from './routes/transactions';
import { createWalletsRoutes } from './routes/wallets';
import { marketData } from './services/market';
import type { AppEnv } from './types';

/** apps/web/dist, resolved from this file's location so it works regardless of process cwd. */
const webDistDir = fileURLToPath(new URL('../../web/dist/', import.meta.url));

let cachedIndexHtml: string | null | undefined;

/** Reads and caches apps/web/dist/index.html. Returns null when the web app has not been built. */
function readIndexHtml(): string | null {
  if (cachedIndexHtml === undefined) {
    const indexPath = `${webDistDir}index.html`;
    cachedIndexHtml = existsSync(indexPath) ? readFileSync(indexPath, 'utf-8') : null;
  }
  return cachedIndexHtml;
}

/** Pushes the four scheduled jobs into `cronJobs` with `marketData` injected. Call once at boot. */
export function registerCronJobs(): void {
  cronJobs.push(
    createPriceRefreshJob({ prices: marketData }),
    createFxRefreshJob({ fx: marketData }),
    createAlertCheckJob({ prices: marketData }),
    createSnapshotJob({ prices: marketData, fx: marketData }),
  );
}

/** Builds the Hono app: `/api/*` routes, then the built SPA from `apps/web/dist` with SPA fallback. */
export function createApp(env: Env, db: Database): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  console.log(
    `[static] web dist: ${webDistDir} (index.html ${readIndexHtml() === null ? 'missing' : 'found'})`,
  );

  app.use('/api/*', withContext(env, db));
  app.route('/api/health', healthRoutes);
  app.route('/api/me', meRoutes);
  app.route('/api/settings', createSettingsRoutes());
  app.route('/api/transactions', createTransactionsRoutes({ fx: marketData, coins: marketData, prices: marketData }));
  app.route('/api/prices', createPricesRoutes({ prices: marketData, fx: marketData }));
  app.route('/api/fx', createFxRoutes({ fx: marketData }));
  app.route('/api/coins', createCoinsRoutes({ coins: marketData }));
  app.route('/api/portfolio', createPortfolioRoutes({ prices: marketData, fx: marketData }));
  app.route('/api/wallets', createWalletsRoutes());
  app.route('/api/alerts', createAlertsRoutes());
  app.route('/api/push', createPushRoutes());

  app.notFound((c) =>
    c.json(errorBody('NOT_FOUND', `No route for ${c.req.method} ${c.req.path}`), 404),
  );

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json(errorBody(err.code, err.message), err.status as ContentfulStatusCode);
    }
    console.error(err);
    return c.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), 500);
  });

  app.use(
    '/*',
    serveStatic({
      root: webDistDir,
      onFound: (path, c) => {
        const normalized = path.replace(/\\/g, '/');
        if (normalized.includes('/assets/')) {
          c.header('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (normalized.endsWith('/index.html') || normalized.endsWith('/sw.js')) {
          c.header('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  app.get('*', (c) => {
    if (c.req.path.startsWith('/api/')) return c.notFound();
    const html = readIndexHtml();
    if (html === null) {
      return c.json(
        errorBody('NOT_FOUND', 'apps/web/dist/index.html not found; build the web app first'),
        404,
      );
    }
    c.header('Cache-Control', 'no-cache');
    return c.html(html);
  });

  return app;
}
