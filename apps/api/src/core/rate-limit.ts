type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export interface RateLimitStore {
  consume(key: string, limit: number, windowMs: number): RateLimitDecision;
  reset(key: string): void;
  resetWhere(predicate: (key: string) => boolean): void;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private entries = new Map<string, RateLimitEntry>();

  consume(key: string, limit: number, windowMs: number): RateLimitDecision {
    const now = Date.now();
    const existing = this.entries.get(key);

    if (!existing || existing.resetAt <= now) {
      this.entries.set(key, {
        count: 1,
        resetAt: now + windowMs
      });

      return {
        allowed: true,
        remaining: Math.max(0, limit - 1),
        retryAfterSeconds: Math.ceil(windowMs / 1000)
      };
    }

    existing.count += 1;
    this.entries.set(key, existing);

    const allowed = existing.count <= limit;
    return {
      allowed,
      remaining: allowed ? Math.max(0, limit - existing.count) : 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  reset(key: string) {
    this.entries.delete(key);
  }

  resetWhere(predicate: (key: string) => boolean) {
    for (const key of this.entries.keys()) {
      if (predicate(key)) {
        this.entries.delete(key);
      }
    }
  }
}

export const authRateLimitStore = new MemoryRateLimitStore();
