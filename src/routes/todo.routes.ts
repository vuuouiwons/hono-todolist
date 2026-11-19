import { createRoute } from '@hono/zod-openapi';
import type { TodoAttributes } from '../db/index.js';
import {
  createTodos,
  deleteTodoById,
  deleteTodos,
  getTodoById,
  listTodos,
  updateTodos,
} from '../services/todo.service.js';
import { authMiddleware, createOpenAPIRouter, extractBulkDeleteIds } from './middlewares.js';
import {
  BulkDeleteBodySchema,
  BulkDeleteResponseSchema,
  CreateTodoBodySchema,
  DeleteByIdResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
  PaginatedTodoResponseSchema,
  PatchTodoByIdBodySchema,
  SingleTodoMutationResponseSchema,
  SingleTodoResponseSchema,
  TodoMutationResponseSchema,
  TodoQuerySchema,
  UpdateTodoBodySchema,
} from './schemas.js';

function shapeTodo(item: TodoAttributes) {
  return {
    id: item.id,
    userId: item.userId,
    message: item.message,
    check: Boolean(item.check),
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
  };
}

const getTodosRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getTodos',
  tags: ['Todo'],
  summary: 'Get paginated todos (bulk)',
  security: [{ BearerAuth: [] }],
  request: { query: TodoQuerySchema },
  responses: {
    200: {
      description: 'Paginated list of todos',
      content: { 'application/json': { schema: PaginatedTodoResponseSchema } },
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

const createTodoRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createTodo',
  tags: ['Todo'],
  summary: 'Create todo (single or bulk)',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: CreateTodoBodySchema } },
    },
  },
  responses: {
    201: {
      description: 'Todo(s) created successfully',
      content: { 'application/json': { schema: TodoMutationResponseSchema } },
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

const patchTodosRoute = createRoute({
  method: 'patch',
  path: '/',
  operationId: 'patchTodos',
  tags: ['Todo'],
  summary: 'Update todos by ID (single or bulk)',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: UpdateTodoBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Todo(s) updated successfully',
      content: { 'application/json': { schema: TodoMutationResponseSchema } },
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

const deleteTodosRoute = createRoute({
  method: 'delete',
  path: '/',
  operationId: 'deleteTodos',
  tags: ['Todo'],
  summary: 'Delete todos (single or bulk via body strictly)',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: BulkDeleteBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Todo(s) deleted successfully',
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

const getTodoByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  operationId: 'getTodoByID',
  tags: ['Todo'],
  summary: 'Get single todo by ID',
  security: [{ BearerAuth: [] }],
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: 'Todo found',
      content: { 'application/json': { schema: SingleTodoResponseSchema } },
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

const patchTodoByIdRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  operationId: 'patchTodoByID',
  tags: ['Todo'],
  summary: 'Update single todo by URL ID',
  security: [{ BearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: PatchTodoByIdBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Todo updated successfully',
      content: { 'application/json': { schema: SingleTodoMutationResponseSchema } },
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

const deleteTodoByIdRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  operationId: 'deleteTodoByID',
  tags: ['Todo'],
  summary: 'Delete single todo by URL ID',
  security: [{ BearerAuth: [] }],
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: 'Todo deleted successfully',
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

export function createTodoRoutes() {
  const router = createOpenAPIRouter();
  router.use('*', authMiddleware);

  return router
    .openapi(getTodosRoute, async (c) => {
      const userId = c.get('userId');
      const query = c.req.valid('query');
      const result = await listTodos({
        userId,
        page: query.page,
        limit: query.limit,
        search: query.search,
        check: query.check,
      });
      return c.json(
        {
          data: result.data.map(shapeTodo),
          pagination: result.pagination,
        },
        200,
      );
    })
    .openapi(createTodoRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');

      if (Array.isArray(body)) {
        const created = await createTodos(userId, body);
        return c.json(
          { message: 'Todos created successfully', data: created.map(shapeTodo) },
          201,
        );
      }

      const [created] = await createTodos(userId, [body]);
      return c.json({ message: 'Todo created successfully', data: shapeTodo(created) }, 201);
    })
    .openapi(patchTodosRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');

      if (Array.isArray(body)) {
        const updated = await updateTodos(userId, body);
        return c.json(
          { message: 'Todos updated successfully', data: updated.map(shapeTodo) },
          200,
        );
      }

      const [updated] = await updateTodos(userId, [body]);
      return c.json({ message: 'Todo updated successfully', data: shapeTodo(updated) }, 200);
    })
    .openapi(deleteTodosRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');
      const result = await deleteTodos(userId, extractBulkDeleteIds(body));
      return c.json(
        {
          message: 'Todo(s) deleted successfully',
          deletedCount: result.deletedCount,
          requestedIDs: result.requestedIDs,
        },
        200,
      );
    })
    .openapi(getTodoByIdRoute, async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const todo = await getTodoById(userId, id);
      return c.json({ data: shapeTodo(todo) }, 200);
    })
    .openapi(patchTodoByIdRoute, async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const [updated] = await updateTodos(userId, [{ id, ...body }]);
      return c.json({ message: 'Todo updated successfully', data: shapeTodo(updated) }, 200);
    })
    .openapi(deleteTodoByIdRoute, async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const deletedId = await deleteTodoById(userId, id);
      return c.json({ message: 'Todo deleted successfully', id: deletedId }, 200);
    });
}
