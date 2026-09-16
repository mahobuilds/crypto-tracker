import { describe, expect, it } from 'vitest';
import { pushSubscriptionSchema } from './push';
import type { PushSubscriptionInput } from './types';

const valid = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'BNcRd...', auth: 'tBHI...' },
};

function failingPaths(input: unknown): string[] {
  const result = pushSubscriptionSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
}

describe('pushSubscriptionSchema', () => {
  it('accepts a browser subscription shape', () => {
    const result = pushSubscriptionSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      const data: PushSubscriptionInput = result.data;
      expect(data).toEqual(valid);
    }
  });

  it('rejects a non-https endpoint', () => {
    expect(failingPaths({ ...valid, endpoint: 'http://example.com/push' })).toEqual(['endpoint']);
    expect(failingPaths({ ...valid, endpoint: 'not a url' })).toEqual(['endpoint']);
  });

  it('rejects empty keys', () => {
    expect(failingPaths({ ...valid, keys: { p256dh: '', auth: 'x' } })).toEqual(['keys.p256dh']);
    expect(failingPaths({ ...valid, keys: { p256dh: 'x', auth: '' } })).toEqual(['keys.auth']);
  });

  it('rejects missing keys', () => {
    expect(failingPaths({ endpoint: valid.endpoint })).toEqual(['keys']);
  });
});
