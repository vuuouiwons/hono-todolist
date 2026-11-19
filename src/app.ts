import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { swaggerUI } from '@hono/swagger-ui';
import { Scalar } from '@scalar/hono-api-reference';
import { contextStorage, getContext } from 'hono/context-storage';
import { cors } from 'hono/cors';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { endTime, startTime, timing } from 'hono/timing';
import { createAuthRoutes } from './routes/auth.routes.js';
import {
  createOpenAPIRouter,
  globalErrorHandler,
  globalNotFoundHandler,
  transactionMiddleware,
  type AppEnv,
} from './routes/middlewares.js';
import { createTodoRoutes } from './routes/todo.routes.js';
import { createTodolistRoutes } from './routes/todolist.routes.js';

export interface CreateAppOptions {
  enableLogger?: boolean;
  openApiSpecPath?: string;
}

function getRequestMetadataFromContextStorage() {
  const ctx = getContext<AppEnv>();
  return {
    requestId: ctx.get('requestId'),
  };
}

export function createApp(options: CreateAppOptions = {}) {
  const app = createOpenAPIRouter();

  app.onError(globalErrorHandler);
  app.notFound(globalNotFoundHandler);

  // Built-in Hono middlewares
  app.use('*', requestId());
  app.use('*', timing());
  app.use('*', contextStorage());

  if (options.enableLogger !== false) {
    app.use('*', logger());
  }

  app.use('/api/*', async (c, next) => {
    startTime(c, 'handler');
    await next();
    endTime(c, 'handler');
  });

  app.use('/api/*', secureHeaders());
  app.use('/api/*', cors());
  app.use('/api/*', prettyJSON());
  app.use('/api/*', etag());
  app.use('/api/*', transactionMiddleware);

  app.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Enter JWT token obtained from /api/v1/login',
  });

  const api = app
    .route('/api/v1', createAuthRoutes())
    .route('/api/v1/todolist', createTodolistRoutes())
    .route('/api/v1/todo', createTodoRoutes());

  api.doc('/openapi.json', {
    openapi: '3.0.3',
    info: {
      title: 'Hono Pragmatic 3-Layer Todo API',
      description:
        'Pragmatic 3-Layer RESTful API (Routes -> Services -> DB) for Todo and Todolist management built with Hono, Zod OpenAPI, and Sequelize ORM.',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Local Development Server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'User registration and authentication' },
      { name: 'Todolist', description: 'Todolist CRUD operations (single and bulk)' },
      { name: 'Todo', description: 'Todo CRUD operations (single and bulk)' },
    ],
  });

  return api
    .get('/health', (c) => {
      const meta = getRequestMetadataFromContextStorage();
      return c.json(
        {
          status: 'ok',
          framework: 'Hono',
          orm: 'Sequelize (SQLite)',
          architecture: 'Pragmatic 3-Layer Architecture (Routes -> Services -> DB)',
          requestId: meta.requestId,
          capabilities: [
            'OpenAPIHono + Zod validation (@hono/zod-openapi)',
            'End-to-end typed RPC client (hono/client)',
            'Built-in JWT auth (hono/jwt + createMiddleware)',
            'CLS-backed Sequelize transactionMiddleware (AsyncLocalStorage)',
            'Built-in Request ID, Server-Timing, ETag, PrettyJSON, CORS, Secure Headers, ContextStorage',
            'Interactive Scalar (/docs) & Swagger UI (/swagger)',
          ],
        },
        200,
      );
    })
    .get('/openapi-spec.json', async (c) => {
      const specPath = options.openApiSpecPath ?? resolve(process.cwd(), 'openapi.json');
      const raw = await readFile(specPath, 'utf-8');
      return c.body(raw, 200, { 'Content-Type': 'application/json; charset=utf-8' });
    })
    .get(
      '/docs',
      Scalar({
        url: '/openapi.json',
        pageTitle: 'Hono Todo API - Scalar Reference',
      }),
    )
    .get(
      '/swagger',
      swaggerUI({
        url: '/openapi.json',
        title: 'Hono Todo API - Swagger UI',
      }),
    );
}

export type AppType = ReturnType<typeof createApp>;
