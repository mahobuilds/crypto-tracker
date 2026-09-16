import { z } from 'zod';
import type { PushSubscriptionInput } from './types';

export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/, message: 'Endpoint must be an https URL' }),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const pushSchemaMatchesType: AssertEqual<
  z.infer<typeof pushSubscriptionSchema>,
  PushSubscriptionInput
> = true;
void pushSchemaMatchesType;
