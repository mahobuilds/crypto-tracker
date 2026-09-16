/**
 * In-process cache with the same call shape the services used against Workers KV
 * (`get(key, 'json')`, `put(key, value, { expirationTtl })`). One process, so a Map is enough.
 */
export class MemoryCache {
  private readonly entries = new Map<string, { value: string; expiresAt: number | null }>();

  async get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
  async get(key: string): Promise<string | null>;
  async get<T>(key: string, type?: 'json'): Promise<T | string | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return type === 'json' ? (JSON.parse(entry.value) as T) : entry.value;
  }

  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    const ttl = opts?.expirationTtl;
    this.entries.set(key, {
      value,
      expiresAt: ttl && ttl > 0 ? Date.now() + ttl * 1000 : null,
    });
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
