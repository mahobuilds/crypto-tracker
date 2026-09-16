import { serve } from '@hono/node-server';
import { cronJobs, startScheduler } from './cron';
import { closeDb, createDb } from './db/client';
import { loadEnv } from './env';
import { createApp, registerCronJobs } from './index';

async function main(): Promise<void> {
  const env = loadEnv();
  const db = createDb(env);
  registerCronJobs();
  const app = createApp(env, db);
  const scheduler = startScheduler(env);

  const server = serve({ fetch: app.fetch, port: env.PORT }, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
    console.log(`${cronJobs.length} cron job(s) scheduled`);
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] received ${signal}, shutting down`);
    scheduler.stop();
    server.close(() => {
      void closeDb(db).finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void main();
