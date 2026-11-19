import { z } from '@hono/zod-openapi';

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'Error message description' }),
  })
  .openapi('ErrorResponse');

export const PaginationSchema = z
  .object({
    page: z.number().int().openapi({ example: 1 }),
    limit: z.number().int().openapi({ example: 10 }),
    totalItems: z.number().int().openapi({ example: 25 }),
    totalPages: z.number().int().openapi({ example: 3 }),
    hasNext: z.boolean().openapi({ example: true }),
    hasPrev: z.boolean().openapi({ example: false }),
  })
  .openapi('Pagination');

export const IdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ param: { name: 'id', in: 'path' }, example: 1 }),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .openapi({
      param: { name: 'page', in: 'query' },
      description: 'Page number (1-based)',
      example: 1,
    }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .openapi({
      param: { name: 'limit', in: 'query' },
      description: 'Number of items per page',
      example: 10,
    }),
});

export const PositiveIntIdSchema = z.number().int().positive();

export const BulkDeleteBodySchema = z.union([
  z.array(PositiveIntIdSchema).min(1).openapi({ example: [1, 2, 3] }),
  z.object({ id: PositiveIntIdSchema.openapi({ example: 1 }) }),
  z.object({ ids: z.array(PositiveIntIdSchema).min(1).openapi({ example: [1, 2, 3] }) }),
]);

export const BulkDeleteResponseSchema = z.object({
  message: z.string().openapi({ example: 'Items deleted successfully' }),
  deletedCount: z.number().int().openapi({ example: 2 }),
  requestedIDs: z.array(z.number().int()).openapi({ example: [1, 2] }),
});

export const DeleteByIdResponseSchema = z.object({
  message: z.string().openapi({ example: 'Item deleted successfully' }),
  id: z.number().int().openapi({ example: 1 }),
});

// Auth schemas
export const AuthRequestSchema = z
  .object({
    email: z.string().trim().email().openapi({ example: 'user@example.com' }),
    password: z.string().min(6).openapi({ example: 'securepassword123' }),
  })
  .openapi('AuthRequest');

export const UserResponseSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    email: z.string().email().openapi({ example: 'user@example.com' }),
    createdAt: z.string().datetime().openapi({ example: '2026-11-18T03:00:00.000Z' }),
  })
  .openapi('UserResponse');

export const RegisterResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'User registered successfully' }),
    data: UserResponseSchema,
  })
  .openapi('RegisterResponse');

export const LoginResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'Login successful' }),
    token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    data: UserResponseSchema,
  })
  .openapi('LoginResponse');

// Todolist schemas
export const TodolistSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    userId: z.number().int().openapi({ example: 1 }),
    title: z.string().openapi({ example: 'Work Tasks' }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Todolist');

export const CreateTodolistRequestSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').openapi({ example: 'Work Tasks' }),
  })
  .openapi('CreateTodolistRequest');

export const UpdateTodolistRequestSchema = z
  .object({
    id: PositiveIntIdSchema.openapi({ example: 1 }),
    title: z.string().trim().min(1, 'Title is required').openapi({ example: 'Work Tasks Updated' }),
  })
  .openapi('UpdateTodolistRequest');

export const CreateTodolistBodySchema = z.union([
  CreateTodolistRequestSchema,
  z.array(CreateTodolistRequestSchema).min(1),
  z.object({ items: z.array(CreateTodolistRequestSchema).min(1) }),
]);

export const UpdateTodolistBodySchema = z.union([
  UpdateTodolistRequestSchema,
  z.array(UpdateTodolistRequestSchema).min(1),
]);

export const TodolistQuerySchema = PaginationQuerySchema.extend({
  search: z
    .string()
    .optional()
    .openapi({
      param: { name: 'search', in: 'query' },
      description: 'Filter by list title',
      example: 'Work',
    }),
});

export const PaginatedTodolistResponseSchema = z
  .object({
    data: z.array(TodolistSchema),
    pagination: PaginationSchema,
  })
  .openapi('PaginatedTodolistResponse');

export const TodolistMutationResponseSchema = z.object({
  message: z.string(),
  data: z.union([TodolistSchema, z.array(TodolistSchema)]),
});

export const SingleTodolistResponseSchema = z.object({
  data: TodolistSchema,
});

export const SingleTodolistMutationResponseSchema = z.object({
  message: z.string(),
  data: TodolistSchema,
});

// Todo schemas
export const TodoSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    userId: z.number().int().openapi({ example: 1 }),
    message: z.string().openapi({ example: 'Buy groceries' }),
    check: z.boolean().openapi({ example: false }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Todo');

export const CreateTodoRequestSchema = z
  .object({
    message: z.string().trim().min(1, 'Message is required').openapi({ example: 'Buy groceries' }),
    check: z.boolean().default(false).openapi({ example: false }),
  })
  .openapi('CreateTodoRequest');

export const UpdateTodoRequestSchema = z
  .object({
    id: PositiveIntIdSchema.openapi({ example: 1 }),
    message: z.string().trim().min(1).optional().openapi({ example: 'Updated message' }),
    check: z.boolean().optional().openapi({ example: true }),
  })
  .refine((data) => data.message !== undefined || data.check !== undefined, {
    message: 'At least one of message or check must be provided',
  })
  .openapi('UpdateTodoRequest');

export const PatchTodoByIdBodySchema = z
  .object({
    message: z.string().trim().min(1).optional().openapi({ example: 'Updated message' }),
    check: z.boolean().optional().openapi({ example: true }),
  })
  .refine((data) => data.message !== undefined || data.check !== undefined, {
    message: 'At least one of message or check must be provided',
  });

export const CreateTodoBodySchema = z.union([
  CreateTodoRequestSchema,
  z.array(CreateTodoRequestSchema).min(1),
]);

export const UpdateTodoBodySchema = z.union([
  UpdateTodoRequestSchema,
  z.array(UpdateTodoRequestSchema).min(1),
]);

export const TodoQuerySchema = PaginationQuerySchema.extend({
  search: z
    .string()
    .optional()
    .openapi({
      param: { name: 'search', in: 'query' },
      description: 'Filter by message content',
      example: 'groceries',
    }),
  check: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional()
    .openapi({
      param: { name: 'check', in: 'query' },
      type: 'boolean',
      description: 'Filter by completed check status',
      example: false,
    }),
});

export const PaginatedTodoResponseSchema = z
  .object({
    data: z.array(TodoSchema),
    pagination: PaginationSchema,
  })
  .openapi('PaginatedTodoResponse');

export const TodoMutationResponseSchema = z.object({
  message: z.string(),
  data: z.union([TodoSchema, z.array(TodoSchema)]),
});

export const SingleTodoResponseSchema = z.object({
  data: TodoSchema,
});

export const SingleTodoMutationResponseSchema = z.object({
  message: z.string(),
  data: TodoSchema,
});
