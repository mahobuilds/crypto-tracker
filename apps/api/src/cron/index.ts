export interface CronJob {
  name: string;
  /** Cron expression this job runs on; must appear in `wrangler.jsonc` triggers. */
  cron: string;
  run(env: Env, ctx: ExecutionContext): Promise<void>;
}

/** Registry of scheduled jobs. The master pushes jobs here at integration. */
export const cronJobs: CronJob[] = [];

export async function handleScheduled(
  event: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  const jobs = cronJobs.filter((job) => job.cron === event.cron);
  if (jobs.length === 0) {
    console.warn(`[cron] no jobs registered for "${event.cron}"`);
    return;
  }

  const results = await Promise.allSettled(jobs.map((job) => job.run(env, ctx)));
  const failures = results.flatMap((result, i) =>
    result.status === 'rejected'
      ? [`${jobs[i]?.name ?? 'unknown'}: ${describeReason(result.reason)}`]
      : [],
  );
  const names = jobs.map((job) => job.name).join(', ');
  if (failures.length === 0) {
    console.log(`[cron] "${event.cron}" ran ${jobs.length} job(s): ${names}`);
  } else {
    console.error(
      `[cron] "${event.cron}" ran ${jobs.length} job(s): ${names}; ${failures.length} failed: ${failures.join('; ')}`,
    );
  }
}

function describeReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return String(reason);
}
