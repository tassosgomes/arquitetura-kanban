export class ApplicationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class ValidationError extends ApplicationError {
  readonly fields: Record<string, string[]>;

  constructor(message = "Invalid input", fields: Record<string, string[]> = {}) {
    super("VALIDATION", message);
    this.fields = fields;
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "Not allowed") {
    super("FORBIDDEN", message);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message = "The resource was updated by someone else") {
    super("CONFLICT", message);
  }
}

export class InvariantError extends ApplicationError {
  constructor(message: string) {
    super("INVARIANT", message);
  }
}
