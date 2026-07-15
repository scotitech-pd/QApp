import type { NextFunction, Request, Response } from "express";

import { ApiError, isApiError } from "../core/api-error";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound("Route not found."));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = res.locals.requestId as string | undefined;
  const apiError = isApiError(error)
    ? error
    : ApiError.internal(error instanceof Error ? error.message : "Unexpected server error.");

  if (apiError.statusCode >= 500) {
    console.error(`[${requestId ?? "unknown-request"}] ${req.method} ${req.originalUrl}`, error);
  }

  res.status(apiError.statusCode).json({
    error: apiError.message,
    code: apiError.code,
    details: apiError.details,
    meta: {
      requestId
    }
  });
}
