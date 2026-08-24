import type { NextFunction, Request, Response } from "express";

/**
 * One line per request: method, path, status, duration.
 * Health checks are skipped so they don't drown the log. Useful for spotting
 * runaway client polling and for watching the shop's traffic on pilot day.
 */
export function requestLog(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/health") return next();

  const startedAt = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - startedAt;
    console.log(`${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} ${ms}ms`);
  });
  next();
}
