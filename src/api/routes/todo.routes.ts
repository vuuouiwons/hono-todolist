import { createRoute } from '@hono/zod-openapi';
import type { MiddlewareHandler } from 'hono';
import type { TodoCommands } from '../../application/commands/todo.commands.js';
import type { TodoQueries } from '../../application/queries/todo.queries.js';
import {
  BulkDeleteRequestDTO,
  BulkDeleteResponseDTO,
  CreateTodoBodyDTO,
  DeleteByIdResponseDTO,
  ErrorResponseDTO,
  IdParamDTO,
  PaginatedTodoResponseDTO,
  PatchTodoByIdBodyDTO,
  SingleTodoMutationResponseDTO,
  SingleTodoResponseDTO,
  TodoMutationResponseDTO,
  TodoQueryDTO,
  UpdateTodoBodyDTO,
} from '../dtos.js';
import { toPaginatedTodoResponseDTO, toTodoResponseDTO } from '../mappers.js';
import {
  createOpenAPIRouter,
  extractBulkDeleteIds,
  type AppEnv,
} from '../middlewares.js';

const getTodosRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getTodos',
  tags: ['Todo'],
  summary: 'Get paginated todos (bulk)',
  security: [{ BearerAuth: [] }],
  request: { query: TodoQueryDTO },
  responses: {
    200: {
      description: 'Paginated list of todos',
      content: { 'application/json': { schema: PaginatedTodoResponseDTO } },
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
      content: { 'application/json': { schema: CreateTodoBodyDTO } },
    },
  },
  responses: {
    201: {
      description: 'Todo(s) created successfully',
      content: { 'application/json': { schema: TodoMutationResponseDTO } },
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
      content: { 'application/json': { schema: UpdateTodoBodyDTO } },
    },
  },
  responses: {
    200: {
      description: 'Todo(s) updated successfully',
      content: { 'application/json': { schema: TodoMutationResponseDTO } },
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
      content: { 'application/json': { schema: BulkDeleteRequestDTO } },
    },
  },
  responses: {
    200: {
      description: 'Todo(s) deleted successfully',
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

const getTodoByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  operationId: 'getTodoByID',
  tags: ['Todo'],
  summary: 'Get single todo by ID',
  security: [{ BearerAuth: [] }],
  request: { params: IdParamDTO },
  responses: {
    200: {
      description: 'Todo found',
      content: { 'application/json': { schema: SingleTodoResponseDTO } },
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

const patchTodoByIdRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  operationId: 'patchTodoByID',
  tags: ['Todo'],
  summary: 'Update single todo by URL ID',
  security: [{ BearerAuth: [] }],
  request: {
    params: IdParamDTO,
    body: {
      required: true,
      content: { 'application/json': { schema: PatchTodoByIdBodyDTO } },
    },
  },
  responses: {
    200: {
      description: 'Todo updated successfully',
      content: { 'application/json': { schema: SingleTodoMutationResponseDTO } },
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

const deleteTodoByIdRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  operationId: 'deleteTodoByID',
  tags: ['Todo'],
  summary: 'Delete single todo by URL ID',
  security: [{ BearerAuth: [] }],
  request: { params: IdParamDTO },
  responses: {
    200: {
      description: 'Todo deleted successfully',
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

export function createTodoRoutes(
  authMiddleware: MiddlewareHandler<AppEnv>,
  commands: TodoCommands,
  queries: TodoQueries,
) {
  const router = createOpenAPIRouter();
  router.use('*', authMiddleware);

  return router
    .openapi(getTodosRoute, async (c) => {
      const userId = c.get('userId');
      const query = c.req.valid('query');
      const result = await queries.list({
        userId,
        page: query.page,
        limit: query.limit,
        search: query.search,
        check: query.check,
      });
      return c.json(toPaginatedTodoResponseDTO(result), 200);
    })
    .openapi(createTodoRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');

      if (Array.isArray(body)) {
        const created = await commands.createBulk(userId, body);
        return c.json(
          { message: 'Todos created successfully', data: created.map(toTodoResponseDTO) },
          201,
        );
      }

      const created = await commands.createSingle(userId, body);
      return c.json(
        { message: 'Todo created successfully', data: toTodoResponseDTO(created) },
        201,
      );
    })
    .openapi(patchTodosRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');

      if (Array.isArray(body)) {
        const updated = await commands.updateBulk(userId, body);
        return c.json(
          { message: 'Todos updated successfully', data: updated.map(toTodoResponseDTO) },
          200,
        );
      }

      const updated = await commands.updateSingle(userId, body);
      return c.json(
        { message: 'Todo updated successfully', data: toTodoResponseDTO(updated) },
        200,
      );
    })
    .openapi(deleteTodosRoute, async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');
      const result = await commands.deleteMany(userId, extractBulkDeleteIds(body));
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
      const todo = await queries.getById(userId, id);
      return c.json({ data: toTodoResponseDTO(todo) }, 200);
    })
    .openapi(patchTodoByIdRoute, async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const updated = await commands.updateSingle(userId, { id, ...body });
      return c.json(
        { message: 'Todo updated successfully', data: toTodoResponseDTO(updated) },
        200,
      );
    })
    .openapi(deleteTodoByIdRoute, async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const deletedId = await commands.deleteById(userId, id);
      return c.json({ message: 'Todo deleted successfully', id: deletedId }, 200);
    });
}
