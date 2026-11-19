import { createRoute } from '@hono/zod-openapi';
import { authService, type UserModel } from '../../business/index.js';
import { shapeUser } from '../controllers/auth.controller.js';
import {
  AuthRequestSchema,
  ErrorResponseSchema,
  LoginResponseSchema,
  RegisterResponseSchema,
} from '../dtos/schemas.js';
import { createOpenAPIRouter } from '../middlewares/middlewares.js';

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
      const user = await authService.registerUser(body);
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
      const result = await authService.loginUser(body);
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
