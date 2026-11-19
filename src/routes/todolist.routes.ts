import { createRoute } from '@hono/zod-openapi';
import type { TodolistAttributes } from '../db/index.js';
import {
  createTodolists,
  deleteTodolistById,
  deleteTodolists,
  getTodolistById,
  listTodolists,
  updateTodolists,
} from '../services/todolist.service.js';
import { authMiddleware, createOpenAPIRouter, extractBulkDeleteIds } from './middlewares.js';
import {
  BulkDeleteBodySchema,
  BulkDeleteResponseSchema,
  CreateTodolistBodySchema,
  CreateTodolistRequestSchema,
  DeleteByIdResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
  PaginatedTodolistResponseSchema,
  SingleTodolistMutationResponseSchema,
  SingleTodolistResponseSchema,
  TodolistMutationResponseSchema,
  TodolistQuerySchema,
  UpdateTodolistBodySchema,
} from './schemas.js';

function shapeTodolist(item: TodolistAttributes) {
  return {
    id: item.id,
    userId: item.userId,
    title: item.title,
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
  };
}

const getTodolistsRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getTodolists',
  tags: ['Todolist'],
  summary: 'Get paginated todolists (bulk)',
  security: [{ BearerAuth: [] }],
  request: { query: TodolistQuerySchema },
  responses: {
    200: {
      description: 'Paginated list of todolists',
      content: { 'application/json': { schema: PaginatedTodolistResponseSchema } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
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
      content: { 'application/json': { schema: CreateTodolistBodySchema } },
    },
  },
  responses: {
    201: {
      description: 'Todolist(s) created successfully',
      content: { 'application/json': { schema: TodolistMutationResponseSchema } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
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
      content: { 'application/json': { schema: UpdateTodolistBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Todolist(s) updated successfully',
      content: { 'application/json': { schema: TodolistMutationResponseSchema } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Resource Not Found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
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
      content: { 'application/json': { schema: BulkDeleteBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Todolist(s) deleted successfully',
      content: { 'application/json': { schema: BulkDeleteResponseSchema } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
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
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: 'Todolist found',
      content: { 'application/json': { schema: SingleTodolistResponseSchema } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Resource Not Found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
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
    params: IdParamSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: CreateTodolistRequestSchema } },
    },
  },
  responses: {
    200: {
      description: 'Todolist updated successfully',
      content: { 'application/json': { schema: SingleTodolistMutationResponseSchema } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Resource Not Found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
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
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: 'Todolist deleted successfully',
      content: { 'application/json': { schema: DeleteByIdResponseSchema } },
    },
    400: {
      description: 'Bad Request / Validation Failure',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized / Missing or Invalid JWT Token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Resource Not Found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

export function createTodolistRoutes() {
  const router = createOpenAPIRouter();
  router.use('*', authMiddleware);

  return router
    .openapi(getTodolistsRoute, async (c) => {
      const userId = c.get('userId');
      const query = c.req.valid('query');
      const result = await listTodolists({
        userId,
        page: query.page,
        limit: query.limit,
        search: query.search,
      });
      return c.json(
        {
          data: result.data.map(shapeTodolist),
          pagination: result.pagination,
        },
        200,
      );
    })
    .openapi(createTodolistRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');

      if (Array.isArray(body)) {
        const created = await createTodolists(userId, body);
        return c.json(
          { message: 'Todolists created successfully', data: created.map(shapeTodolist) },
          201,
        );
      }
      if ('items' in body) {
        const created = await createTodolists(userId, body.items);
        return c.json(
          { message: 'Todolists created successfully', data: created.map(shapeTodolist) },
          201,
        );
      }

      const [created] = await createTodolists(userId, [body]);
      return c.json(
        { message: 'Todolist created successfully', data: shapeTodolist(created) },
        201,
      );
    })
    .openapi(patchTodolistsRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');

      if (Array.isArray(body)) {
        const updated = await updateTodolists(userId, body);
        return c.json(
          { message: 'Todolists updated successfully', data: updated.map(shapeTodolist) },
          200,
        );
      }

      const [updated] = await updateTodolists(userId, [body]);
      return c.json(
        { message: 'Todolist updated successfully', data: shapeTodolist(updated) },
        200,
      );
    })
    .openapi(deleteTodolistsRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');
      const result = await deleteTodolists(userId, extractBulkDeleteIds(body));
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
      const todolist = await getTodolistById(userId, id);
      return c.json({ data: shapeTodolist(todolist) }, 200);
    })
    .openapi(patchTodolistByIdRoute, async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const [updated] = await updateTodolists(userId, [{ id, title: body.title }]);
      return c.json(
        { message: 'Todolist updated successfully', data: shapeTodolist(updated) },
        200,
      );
    })
    .openapi(deleteTodolistByIdRoute, async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const deletedId = await deleteTodolistById(userId, id);
      return c.json({ message: 'Todolist deleted successfully', id: deletedId }, 200);
    });
}
