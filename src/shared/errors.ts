import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';

export class AppError extends Error {
  readonly statusCode: ContentfulStatusCode;

  constructor(message: string, statusCode: ContentfulStatusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export function formatZodIssues(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'payload';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
