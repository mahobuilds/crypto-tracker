import cron, { type ScheduledTask } from 'node-cron';
import type { Env } from '../env';

export interface CronJob {
  name: string;
  /** Cron expression this job runs on. */
  cron: string;
  run(env: Env): Promise<void>;
}

/** Registry of scheduled jobs. The master pushes jobs here at integration. */
export const cronJobs: CronJob[] = [];

export interface Scheduler {
  stop(): void;
}

async function runOne(job: CronJob, env: Env): Promise<void> {
  const startedAt = Date.now();
  try {
    await job.run(env);
    console.log(`[cron] ${job.name} ok (${Date.now() - startedAt}ms)`);
  } catch (err) {
    console.error(`[cron] ${job.name} failed: ${describeError(err)}`);
  }
}

/**
 * Drizzle wraps database failures in a `DrizzleQueryError` whose message is only the SQL;
 * the real reason (connection refused, bad password, missing column) sits in `cause`.
 */
export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const parts = [err.message];
  let cause: unknown = err.cause;
  while (cause instanceof Error) {
    const code = 'code' in cause && typeof cause.code === 'string' ? ` [${cause.code}]` : '';
    parts.push(`${cause.message}${code}`);
    cause = cause.cause;
  }
  return parts.join(' <- ');
}

/**
 * Schedules every job in `cronJobs` with node-cron, one task per job, all in UTC.
 * Errors from a job are logged and never thrown, so one failing job cannot stop the others.
 */
export function startScheduler(env: Env): Scheduler {
  const tasks: ScheduledTask[] = cronJobs.map((job) =>
    cron.schedule(job.cron, () => runOne(job, env), { timezone: 'UTC' }),
  );

  return {
    stop() {
      for (const task of tasks) task.stop();
    },
  };
}

/** Runs every registered job matching `cron` immediately, outside the schedule. */
export async function runJobsFor(cronExpr: string, env: Env): Promise<void> {
  const jobs = cronJobs.filter((job) => job.cron === cronExpr);
  await Promise.all(jobs.map((job) => runOne(job, env)));
}
