export class AuthError extends Error {
  constructor(message: string, public statusCode = 401) {
    super(message);
    this.name = "AuthError";
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class EmailNotVerifiedError extends AuthError {
  constructor(message = "Email not verified") {
    super(message, 403);
    this.name = "EmailNotVerifiedError";
  }
}
