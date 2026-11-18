import { createRoute } from '@hono/zod-openapi';
import type { MiddlewareHandler } from 'hono';
import type { TodolistCommands } from '../../application/commands/todolist.commands.js';
import type { TodolistQueries } from '../../application/queries/todolist.queries.js';
import {
  BulkDeleteRequestDTO,
  BulkDeleteResponseDTO,
  CreateTodolistBodyDTO,
  CreateTodolistRequestDTO,
  DeleteByIdResponseDTO,
  ErrorResponseDTO,
  IdParamDTO,
  PaginatedTodolistResponseDTO,
  SingleTodolistMutationResponseDTO,
  SingleTodolistResponseDTO,
  TodolistMutationResponseDTO,
  TodolistQueryDTO,
  UpdateTodolistBodyDTO,
} from '../dtos.js';
import { toPaginatedTodolistResponseDTO, toTodolistResponseDTO } from '../mappers.js';
import {
  createOpenAPIRouter,
  extractBulkDeleteIds,
  type AppEnv,
} from '../middlewares.js';

const getTodolistsRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getTodolists',
  tags: ['Todolist'],
  summary: 'Get paginated todolists (bulk)',
  security: [{ BearerAuth: [] }],
  request: { query: TodolistQueryDTO },
  responses: {
    200: {
      description: 'Paginated list of todolists',
      content: { 'application/json': { schema: PaginatedTodolistResponseDTO } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
  },
});

const createTodolistRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createTodolist',
  tags: ['Todolist'],
  summary: 'Create todolist (single or bulk)',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: CreateTodolistBodyDTO } },
    },
  },
  responses: {
    201: {
      description: 'Todolist(s) created successfully',
      content: { 'application/json': { schema: TodolistMutationResponseDTO } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
  },
});

const patchTodolistsRoute = createRoute({
  method: 'patch',
  path: '/',
  operationId: 'patchTodolists',
  tags: ['Todolist'],
  summary: 'Update todolists by ID (single or bulk)',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: UpdateTodolistBodyDTO } },
    },
  },
  responses: {
    200: {
      description: 'Todolist(s) updated successfully',
      content: { 'application/json': { schema: TodolistMutationResponseDTO } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    404: {
      description: 'Resource Not Found',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
  },
});

const deleteTodolistsRoute = createRoute({
  method: 'delete',
  path: '/',
  operationId: 'deleteTodolists',
  tags: ['Todolist'],
  summary: 'Delete todolists (single or bulk via body strictly)',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: BulkDeleteRequestDTO } },
    },
  },
  responses: {
    200: {
      description: 'Todolist(s) deleted successfully',
      content: { 'application/json': { schema: BulkDeleteResponseDTO } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
  },
});

const getTodolistByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  operationId: 'getTodolistByID',
  tags: ['Todolist'],
  summary: 'Get single todolist by ID',
  security: [{ BearerAuth: [] }],
  request: { params: IdParamDTO },
  responses: {
    200: {
      description: 'Todolist found',
      content: { 'application/json': { schema: SingleTodolistResponseDTO } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    404: {
      description: 'Resource Not Found',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
  },
});

const patchTodolistByIdRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  operationId: 'patchTodolistByID',
  tags: ['Todolist'],
  summary: 'Update single todolist by URL ID',
  security: [{ BearerAuth: [] }],
  request: {
    params: IdParamDTO,
    body: {
      required: true,
      content: { 'application/json': { schema: CreateTodolistRequestDTO } },
    },
  },
  responses: {
    200: {
      description: 'Todolist updated successfully',
      content: { 'application/json': { schema: SingleTodolistMutationResponseDTO } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    404: {
      description: 'Resource Not Found',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
  },
});

const deleteTodolistByIdRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  operationId: 'deleteTodolistByID',
  tags: ['Todolist'],
  summary: 'Delete single todolist by URL ID',
  security: [{ BearerAuth: [] }],
  request: { params: IdParamDTO },
  responses: {
    200: {
      description: 'Todolist deleted successfully',
      content: { 'application/json': { schema: DeleteByIdResponseDTO } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
    404: {
      description: 'Resource Not Found',
      content: { 'application/json': { schema: ErrorResponseDTO } },
    },
  },
});

export function createTodolistRoutes(
  authMiddleware: MiddlewareHandler<AppEnv>,
  commands: TodolistCommands,
  queries: TodolistQueries,
) {
  const router = createOpenAPIRouter();
  router.use('*', authMiddleware);

  return router
    .openapi(getTodolistsRoute, async (c) => {
      const userId = c.get('userId');
      const query = c.req.valid('query');
      const result = await queries.list({
        userId,
        page: query.page,
        limit: query.limit,
        search: query.search,
      });
      return c.json(toPaginatedTodolistResponseDTO(result), 200);
    })
    .openapi(createTodolistRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');

      if (Array.isArray(body)) {
        const created = await commands.createBulk(userId, body);
        return c.json(
          { message: 'Todolists created successfully', data: created.map(toTodolistResponseDTO) },
          201,
        );
      }
      if ('items' in body) {
        const created = await commands.createBulk(userId, body.items);
        return c.json(
          { message: 'Todolists created successfully', data: created.map(toTodolistResponseDTO) },
          201,
        );
      }

      const created = await commands.createSingle(userId, body);
      return c.json(
        { message: 'Todolist created successfully', data: toTodolistResponseDTO(created) },
        201,
      );
    })
    .openapi(patchTodolistsRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');

      if (Array.isArray(body)) {
        const updated = await commands.updateBulk(userId, body);
        return c.json(
          { message: 'Todolists updated successfully', data: updated.map(toTodolistResponseDTO) },
          200,
        );
      }

      const updated = await commands.updateSingle(userId, body);
      return c.json(
        { message: 'Todolist updated successfully', data: toTodolistResponseDTO(updated) },
        200,
      );
    })
    .openapi(deleteTodolistsRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');
      const result = await commands.deleteMany(userId, extractBulkDeleteIds(body));
      return c.json(
        {
          message: 'Todolist(s) deleted successfully',
          deletedCount: result.deletedCount,
          requestedIDs: result.requestedIDs,
        },
        200,
      );
    })
    .openapi(getTodolistByIdRoute, async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const todolist = await queries.getById(userId, id);
      return c.json({ data: toTodolistResponseDTO(todolist) }, 200);
    })
    .openapi(patchTodolistByIdRoute, async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const updated = await commands.updateSingle(userId, { id, title: body.title });
      return c.json(
        { message: 'Todolist updated successfully', data: toTodolistResponseDTO(updated) },
        200,
      );
    })
    .openapi(deleteTodolistByIdRoute, async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const deletedId = await commands.deleteById(userId, id);
      return c.json({ message: 'Todolist deleted successfully', id: deletedId }, 200);
    });
}
