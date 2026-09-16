import { Hono } from 'hono';
import {
  alertInputSchema,
  type Alert,
  type AlertInput,
  type AlertListResponse,
} from '@crypto-tracker/shared';
import { ApiError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { createAlert, deleteAlert, listAlerts, updateAlert } from '../services/alerts';
import type { AppEnv } from '../types';

async function readAlertInput(request: Request): Promise<AlertInput> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'body: Expected a JSON object');
  }
  const result = alertInputSchema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') || 'body';
    throw new ApiError(400, 'VALIDATION_ERROR', `${path}: ${issue?.message ?? 'Invalid input'}`);
  }
  return result.data;
}

export function createAlertsRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .use(requireAuth)
    .get('/', async (c) => {
      const body: AlertListResponse = {
        alerts: await listAlerts(c.get('db'), c.get('user').id),
      };
      return c.json(body);
    })
    .post('/', async (c) => {
      const input = await readAlertInput(c.req.raw);
      const body: Alert = await createAlert(c.get('db'), c.get('user').id, input);
      return c.json(body, 201);
    })
    .put('/:id', async (c) => {
      const input = await readAlertInput(c.req.raw);
      const body: Alert = await updateAlert(
        c.get('db'),
        c.get('user').id,
        c.req.param('id'),
        input,
      );
      return c.json(body);
    })
    .delete('/:id', async (c) => {
      await deleteAlert(c.get('db'), c.get('user').id, c.req.param('id'));
      return c.body(null, 204);
    });
}
