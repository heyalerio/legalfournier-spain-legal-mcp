import * as z from "zod/v4";

export type ValidationIssue = { path: (string | number)[]; message: string };

/** Only explicitly public messages and structured details cross the API boundary. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
    public readonly details?: Record<string, unknown>,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function validationError(issues: ValidationIssue[]): ApiError {
  return new ApiError("INVALID_INPUT", "Check the supplied fields and try again.", 400, { issues });
}

export function publicError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof z.ZodError) {
    return validationError(error.issues.map((issue) => ({
      path: issue.path.map((part) => typeof part === "number" ? part : String(part)),
      message: issue.message,
    })));
  }
  return new ApiError("INTERNAL_ERROR", "The service could not complete this request.", 500);
}
