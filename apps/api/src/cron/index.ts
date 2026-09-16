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
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[cron] ${job.name} failed: ${reason}`);
  }
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
