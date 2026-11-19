import { OpenAPIHono, type z } from '@hono/zod-openapi';
import type { ErrorHandler, NotFoundHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { RequestIdVariables } from 'hono/request-id';
import type { TimingVariables } from 'hono/timing';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Transaction } from 'sequelize';
import { ZodError } from 'zod';
import { withTransaction } from '../../data/database.js';
import { verifyToken } from '../../shared/auth.js';
import { AppError, UnauthorizedError, formatZodIssues } from '../../shared/errors.js';
import type { BulkDeleteBodySchema } from '../dtos/schemas.js';

export type AppVariables = RequestIdVariables &
  TimingVariables & {
    userId: number;
    userEmail: string;
    tx?: Transaction;
  };

export type AppEnv = {
  Variables: AppVariables;
};

export function createOpenAPIRouter() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json({ error: formatZodIssues(result.error) }, 400);
      }
    },
  });
}

export function extractBulkDeleteIds(body: z.infer<typeof BulkDeleteBodySchema>): number[] {
  if (Array.isArray(body)) {
    return body;
  }
  if ('id' in body) {
    return [body.id];
  }
  return body.ids;
}

const MUTATING_HTTP_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

class TransactionRollbackSignal extends Error {
  constructor() {
    super('Transaction rolled back due to error HTTP response');
  }
}

export const transactionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  if (!MUTATING_HTTP_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  try {
    await withTransaction(async (tx) => {
      c.set('tx', tx);
      await next();
      if (c.error || c.res.status >= 400) {
        throw new TransactionRollbackSignal();
      }
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackSignal)) {
      throw error;
    }
  }
});

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    throw new UnauthorizedError('Missing Authorization header');
  }

  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match || !match[1]) {
    throw new UnauthorizedError('Authorization header must use Bearer token scheme');
  }

  const payload = await verifyToken(match[1]);
  c.set('userId', payload.sub);
  c.set('userEmail', payload.email);

  await next();
});

export const globalErrorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.statusCode as ContentfulStatusCode);
  }

  if (err instanceof ZodError) {
    return c.json({ error: formatZodIssues(err) }, 400);
  }

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  return c.json({ error: message }, 500);
};

export const globalNotFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  return c.json({ error: `Not Found: ${c.req.method} ${c.req.path}` }, 404);
};
