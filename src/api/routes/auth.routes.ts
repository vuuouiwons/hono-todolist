import { createRoute } from '@hono/zod-openapi';
import type { AuthCommands } from '../../application/commands/auth.commands.js';
import {
  AuthRequestDTO,
  ErrorResponseDTO,
  LoginResponseDTO,
  RegisterResponseDTO,
} from '../dtos.js';
import { toUserResponseDTO } from '../mappers.js';
import { createOpenAPIRouter } from '../middlewares.js';

const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  operationId: 'registerUser',
  tags: ['Auth'],
  summary: 'Register a new user',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: AuthRequestDTO } },
    },
  },
  responses: {
    201: {
      description: 'User registered successfully',
      content: { 'application/json': { schema: RegisterResponseDTO } },
    },
    400: {
      description: 'Invalid input format or validation error',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    409: {
      description: 'Email already exists',
      content: { 'application/json': { schema: ErrorResponseDTO } },
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
      content: { 'application/json': { schema: AuthRequestDTO } },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: { 'application/json': { schema: LoginResponseDTO } },
    },
    400: {
      description: 'Invalid input format or validation error',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    401: {
      description: 'Invalid credentials',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
  },
});

export function createAuthRoutes(authCommands: AuthCommands) {
  return createOpenAPIRouter()
    .openapi(registerRoute, async (c) => {
      const body = c.req.valid('json');
      const user = await authCommands.register(body);
      return c.json(
        {
          message: 'User registered successfully',
          data: toUserResponseDTO(user),
        },
        201,
      );
    })
    .openapi(loginRoute, async (c) => {
      const body = c.req.valid('json');
      const result = await authCommands.login(body);
      return c.json(
        {
          message: 'Login successful',
          token: result.token,
          data: toUserResponseDTO(result.user),
        },
        200,
      );
    });
}
