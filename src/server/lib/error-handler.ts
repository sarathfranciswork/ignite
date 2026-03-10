import type { Logger } from "./logger";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Base application error with structured metadata.
 * isOperational = true means this is an expected error (bad input, not found, etc.)
 * isOperational = false means this is a programming/infrastructure bug.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND", true);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400, "VALIDATION_ERROR", true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 403, "AUTHORIZATION_ERROR", true);
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database operation failed") {
    super(message, 500, "DATABASE_ERROR", false);
  }
}

interface SafeErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
  };
}

/**
 * Handles an error by logging it appropriately and returning a safe response.
 * Operational errors are logged as warnings; programming errors as errors.
 * Stack traces and internal details are never leaked to clients in production.
 */
export function handleError(
  error: unknown,
  log: Logger,
): { response: SafeErrorResponse; statusCode: number } {
  if (error instanceof AppError) {
    const logPayload = {
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      ...(isProduction ? {} : { stack: error.stack }),
    };

    if (error.isOperational) {
      log.warn(logPayload, error.message);
    } else {
      log.error(logPayload, error.message);
    }

    return {
      response: {
        error: {
          message: error.isOperational ? error.message : "An internal error occurred",
          code: error.code,
          statusCode: error.statusCode,
        },
      },
      statusCode: error.statusCode,
    };
  }

  // Unknown/programming error
  const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
  const errorStack = error instanceof Error ? error.stack : undefined;

  log.error(
    {
      error: errorMessage,
      ...(isProduction ? {} : { stack: errorStack }),
    },
    "Unhandled error",
  );

  return {
    response: {
      error: {
        message: isProduction ? "An internal error occurred" : errorMessage,
        code: "INTERNAL_ERROR",
        statusCode: 500,
      },
    },
    statusCode: 500,
  };
}
