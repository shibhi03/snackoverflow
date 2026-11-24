export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.name = "AppError"
    this.statusCode = statusCode
    this.code = code
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Invalid request input", code = "INVALID_INPUT") {
    super(400, code, message)
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = "Authentication required. Please log in.",
    code = "UNAUTHENTICATED",
  ) {
    super(401, code, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = "Access denied. You lack permissions for this resource.",
    code = "FORBIDDEN_RESOURCE",
  ) {
    super(403, code, message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Requested resource not found.", code = "NOT_FOUND") {
    super(404, code, message)
  }
}

export class ConflictError extends AppError {
  constructor(
    message = "A conflict occurred with current server state.",
    code = "CONFLICT",
  ) {
    super(409, code, message)
  }
}

export class InsufficientStockError extends AppError {
  constructor(
    message = "Someone beat you to the last packet! Please refresh the inventory.",
  ) {
    super(409, "INSUFFICIENT_STOCK", message)
  }
}

export class DuplicateVoteError extends AppError {
  constructor(message = "You have already voted for this snack.") {
    super(409, "DUPLICATE_VOTE", message)
  }
}
