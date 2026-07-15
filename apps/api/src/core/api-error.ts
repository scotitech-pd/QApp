export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, message: string, code = "API_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, "BAD_REQUEST", details);
  }

  static notFound(message: string, details?: unknown) {
    return new ApiError(404, message, "NOT_FOUND", details);
  }

  static conflict(message: string, details?: unknown) {
    return new ApiError(409, message, "CONFLICT", details);
  }

  static internal(message = "Internal server error.", details?: unknown) {
    return new ApiError(500, message, "INTERNAL_SERVER_ERROR", details);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
