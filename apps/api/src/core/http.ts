import type { NextFunction, Request, RequestHandler, Response } from "express";

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function getRequestId(res: Response) {
  return res.locals.requestId as string | undefined;
}

export function sendItem<T>(res: Response, item: T, statusCode = 200) {
  return res.status(statusCode).json({
    data: item,
    item,
    meta: {
      requestId: getRequestId(res)
    }
  });
}

export function sendItems<T>(res: Response, items: T[], statusCode = 200) {
  return res.status(statusCode).json({
    data: items,
    items,
    meta: {
      count: items.length,
      requestId: getRequestId(res)
    }
  });
}

export function getOptionalNumberQuery(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getPathParam(value: unknown) {
  return typeof value === "string" ? value : "";
}
