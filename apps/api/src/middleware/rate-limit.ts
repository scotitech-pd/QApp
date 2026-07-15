import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../core/api-error";
import { authRateLimitStore, type RateLimitStore } from "../core/rate-limit";

type RateLimitOptions = {
  key: (req: Request) => string;
  limit: number;
  windowMs: number;
  code?: string;
  message: string;
  store?: RateLimitStore;
};

export function createRateLimit(options: RateLimitOptions) {
  const store = options.store ?? authRateLimitStore;

  return (req: Request, res: Response, next: NextFunction) => {
    const decision = store.consume(options.key(req), options.limit, options.windowMs);

    res.setHeader("x-ratelimit-limit", String(options.limit));
    res.setHeader("x-ratelimit-remaining", String(decision.remaining));
    res.setHeader("retry-after", String(decision.retryAfterSeconds));

    if (!decision.allowed) {
      next(new ApiError(429, options.message, options.code ?? "RATE_LIMITED"));
      return;
    }

    next();
  };
}

export function getRequestIp(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function buildLoginRateLimitKey(ipAddress: string, identifier: string) {
  return `login:${ipAddress}:${identifier}`;
}
