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
import {
  createAuthMiddleware,
  createOpenAPIRouter,
  createTransactionMiddleware,
  globalErrorHandler,
  globalNotFoundHandler,
  type AppEnv,
} from './api/middlewares.js';
import { createAuthRoutes } from './api/routes/auth.routes.js';
import { createTodoRoutes } from './api/routes/todo.routes.js';
import { createTodolistRoutes } from './api/routes/todolist.routes.js';
import type { AppContainer } from './container.js';

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

export function createApp(container: AppContainer, options: CreateAppOptions = {}) {
  const app = createOpenAPIRouter();

  app.onError(globalErrorHandler);
  app.notFound(globalNotFoundHandler);

  // Built-in Hono middleware showcase
  app.use('*', requestId());
  app.use('*', timing());
  app.use('*', contextStorage());

  if (options.enableLogger !== false) {
    app.use('*', logger());
  }

  // Track handler processing time via Server-Timing header
  app.use('/api/*', async (c, next) => {
    startTime(c, 'handler');
    await next();
    endTime(c, 'handler');
  });

  app.use('/api/*', secureHeaders());
  app.use('/api/*', cors());
  app.use('/api/*', prettyJSON());
  app.use('/api/*', etag());
  app.use('/api/*', createTransactionMiddleware(container.transactor));

  app.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Enter JWT token obtained from /api/v1/login',
  });

  const authMiddleware = createAuthMiddleware(container.tokenService);

  const authRoutes = createAuthRoutes(container.commands.auth);
  const todolistRoutes = createTodolistRoutes(
    authMiddleware,
    container.commands.todolist,
    container.queries.todolist,
  );
  const todoRoutes = createTodoRoutes(
    authMiddleware,
    container.commands.todo,
    container.queries.todo,
  );

  const api = app
    .route('/api/v1', authRoutes)
    .route('/api/v1/todolist', todolistRoutes)
    .route('/api/v1/todo', todoRoutes);

  api.doc('/openapi.json', {
    openapi: '3.0.3',
    info: {
      title: 'Hono Pragmatic Layered Todo API',
      description:
        'Pragmatic 3-Layer RESTful API (API -> Application <- Infrastructure) for Todo and Todolist management built with Hono, Zod OpenAPI, and Sequelize ORM.',
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
          architecture: 'Pragmatic Layered Architecture (API -> Application <- Infrastructure)',
          requestId: meta.requestId,
          capabilities: [
            'OpenAPIHono + Zod validation (@hono/zod-openapi)',
            'End-to-end typed RPC client (hono/client)',
            'Built-in JWT auth (hono/jwt + createMiddleware)',
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
