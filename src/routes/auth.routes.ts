import { createRoute } from '@hono/zod-openapi';
import type { UserAttributes } from '../db/index.js';
import { loginUser, registerUser } from '../services/auth.service.js';
import { createOpenAPIRouter } from './middlewares.js';
import {
  AuthRequestSchema,
  ErrorResponseSchema,
  LoginResponseSchema,
  RegisterResponseSchema,
} from './schemas.js';

// Controller boundary shaper: explicitly strips sensitive fields like passwordHash
function shapeUser(user: UserAttributes) {
  return {
    id: user.id,
    email: user.email,
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  operationId: 'registerUser',
  tags: ['Auth'],
  summary: 'Register a new user',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: AuthRequestSchema } },
    },
  },
  responses: {
    201: {
      description: 'User registered successfully',
      content: { 'application/json': { schema: RegisterResponseSchema } },
    },
    400: {
      description: 'Invalid input format or validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Email already exists',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  operationId: 'loginUser',
  tags: ['Auth'],
  summary: 'Authenticate user and receive JWT',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: AuthRequestSchema } },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: { 'application/json': { schema: LoginResponseSchema } },
    },
    400: {
      description: 'Invalid input format or validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Invalid credentials',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

export function createAuthRoutes() {
  return createOpenAPIRouter()
    .openapi(registerRoute, async (c) => {
      const body = c.req.valid('json');
      const user = await registerUser(body);
      return c.json(
        {
          message: 'User registered successfully',
          data: shapeUser(user),
        },
        201,
      );
    })
    .openapi(loginRoute, async (c) => {
      const body = c.req.valid('json');
      const result = await loginUser(body);
      return c.json(
        {
          message: 'Login successful',
          token: result.token,
          data: shapeUser(result.user),
        },
        200,
      );
    });
}
