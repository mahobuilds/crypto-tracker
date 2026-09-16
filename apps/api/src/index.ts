import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { createAlertCheckJob } from './cron/alerts';
import { createFxRefreshJob } from './cron/fx';
import { cronJobs, handleScheduled } from './cron';
import { createPriceRefreshJob } from './cron/prices';
import { createSnapshotJob } from './cron/snapshots';
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
import { marketData } from './services/market';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.use('/api/*', withContext);
app.on(['GET', 'POST'], '/api/auth/*', (c) => c.get('auth').handler(c.req.raw));
app.route('/api/health', healthRoutes);
app.route('/api/me', meRoutes);
app.route('/api/settings', createSettingsRoutes());
app.route('/api/transactions', createTransactionsRoutes({ fx: marketData, coins: marketData }));
app.route('/api/prices', createPricesRoutes({ prices: marketData, fx: marketData }));
app.route('/api/fx', createFxRoutes({ fx: marketData }));
app.route('/api/coins', createCoinsRoutes({ coins: marketData }));
app.route('/api/portfolio', createPortfolioRoutes({ prices: marketData, fx: marketData }));
app.route('/api/alerts', createAlertsRoutes());
app.route('/api/push', createPushRoutes());

cronJobs.push(
  createPriceRefreshJob({ prices: marketData }),
  createFxRefreshJob({ fx: marketData }),
  createAlertCheckJob({ prices: marketData }),
  createSnapshotJob({ prices: marketData, fx: marketData }),
);

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

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
} satisfies ExportedHandler<Env>;
