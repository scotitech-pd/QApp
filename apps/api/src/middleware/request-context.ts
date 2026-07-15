import crypto from "node:crypto";

import type { NextFunction, Request, Response } from "express";

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const headerRequestId = req.header("x-request-id");
  const requestId = headerRequestId && headerRequestId.trim() ? headerRequestId : crypto.randomUUID();

  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  next();
}
