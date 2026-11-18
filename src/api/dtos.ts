import { z } from '@hono/zod-openapi';

// Shared DTOs
export const ErrorResponseDTO = z
  .object({
    error: z.string().openapi({ example: 'Error message description' }),
  })
  .openapi('ErrorResponse');

export const PaginationResponseDTO = z
  .object({
    page: z.number().int().openapi({ example: 1 }),
    limit: z.number().int().openapi({ example: 10 }),
    totalItems: z.number().int().openapi({ example: 25 }),
    totalPages: z.number().int().openapi({ example: 3 }),
    hasNext: z.boolean().openapi({ example: true }),
    hasPrev: z.boolean().openapi({ example: false }),
  })
  .openapi('Pagination');

export const IdParamDTO = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ param: { name: 'id', in: 'path' }, example: 1 }),
});

export const PaginationQueryDTO = z.object({
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

export const PositiveIntIdDTO = z.number().int().positive();

export const BulkDeleteRequestDTO = z.union([
  z.array(PositiveIntIdDTO).min(1).openapi({ example: [1, 2, 3] }),
  z.object({ id: PositiveIntIdDTO.openapi({ example: 1 }) }),
  z.object({ ids: z.array(PositiveIntIdDTO).min(1).openapi({ example: [1, 2, 3] }) }),
]);

export const BulkDeleteResponseDTO = z.object({
  message: z.string().openapi({ example: 'Items deleted successfully' }),
  deletedCount: z.number().int().openapi({ example: 2 }),
  requestedIDs: z.array(z.number().int()).openapi({ example: [1, 2] }),
});

export const DeleteByIdResponseDTO = z.object({
  message: z.string().openapi({ example: 'Item deleted successfully' }),
  id: z.number().int().openapi({ example: 1 }),
});

// Auth DTOs
export const AuthRequestDTO = z
  .object({
    email: z.string().trim().email().openapi({ example: 'user@example.com' }),
    password: z.string().min(6).openapi({ example: 'securepassword123' }),
  })
  .openapi('AuthRequest');

export const UserResponseDTO = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    email: z.string().email().openapi({ example: 'user@example.com' }),
    createdAt: z.string().datetime().openapi({ example: '2026-11-18T03:00:00.000Z' }),
  })
  .openapi('UserResponse');

export const RegisterResponseDTO = z
  .object({
    message: z.string().openapi({ example: 'User registered successfully' }),
    data: UserResponseDTO,
  })
  .openapi('RegisterResponse');

export const LoginResponseDTO = z
  .object({
    message: z.string().openapi({ example: 'Login successful' }),
    token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    data: UserResponseDTO,
  })
  .openapi('LoginResponse');

// Todolist DTOs
export const TodolistResponseDTO = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    userId: z.number().int().openapi({ example: 1 }),
    title: z.string().openapi({ example: 'Work Tasks' }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Todolist');

export const CreateTodolistRequestDTO = z
  .object({
    title: z.string().trim().min(1, 'Title is required').openapi({ example: 'Work Tasks' }),
  })
  .openapi('CreateTodolistRequest');

export const UpdateTodolistRequestDTO = z
  .object({
    id: PositiveIntIdDTO.openapi({ example: 1 }),
    title: z.string().trim().min(1, 'Title is required').openapi({ example: 'Work Tasks Updated' }),
  })
  .openapi('UpdateTodolistRequest');

export const CreateTodolistBodyDTO = z.union([
  CreateTodolistRequestDTO,
  z.array(CreateTodolistRequestDTO).min(1),
  z.object({ items: z.array(CreateTodolistRequestDTO).min(1) }),
]);

export const UpdateTodolistBodyDTO = z.union([
  UpdateTodolistRequestDTO,
  z.array(UpdateTodolistRequestDTO).min(1),
]);

export const TodolistQueryDTO = PaginationQueryDTO.extend({
  search: z
    .string()
    .optional()
    .openapi({
      param: { name: 'search', in: 'query' },
      description: 'Filter by list title',
      example: 'Work',
    }),
});

export const PaginatedTodolistResponseDTO = z
  .object({
    data: z.array(TodolistResponseDTO),
    pagination: PaginationResponseDTO,
  })
  .openapi('PaginatedTodolistResponse');

export const TodolistMutationResponseDTO = z.object({
  message: z.string(),
  data: z.union([TodolistResponseDTO, z.array(TodolistResponseDTO)]),
});

export const SingleTodolistResponseDTO = z.object({
  data: TodolistResponseDTO,
});

export const SingleTodolistMutationResponseDTO = z.object({
  message: z.string(),
  data: TodolistResponseDTO,
});

// Todo DTOs
export const TodoResponseDTO = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    userId: z.number().int().openapi({ example: 1 }),
    message: z.string().openapi({ example: 'Buy groceries' }),
    check: z.boolean().openapi({ example: false }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Todo');

export const CreateTodoRequestDTO = z
  .object({
    message: z.string().trim().min(1, 'Message is required').openapi({ example: 'Buy groceries' }),
    check: z.boolean().default(false).openapi({ example: false }),
  })
  .openapi('CreateTodoRequest');

export const UpdateTodoRequestDTO = z
  .object({
    id: PositiveIntIdDTO.openapi({ example: 1 }),
    message: z.string().trim().min(1).optional().openapi({ example: 'Updated message' }),
    check: z.boolean().optional().openapi({ example: true }),
  })
  .refine((data) => data.message !== undefined || data.check !== undefined, {
    message: 'At least one of message or check must be provided',
  })
  .openapi('UpdateTodoRequest');

export const PatchTodoByIdBodyDTO = z
  .object({
    message: z.string().trim().min(1).optional().openapi({ example: 'Updated message' }),
    check: z.boolean().optional().openapi({ example: true }),
  })
  .refine((data) => data.message !== undefined || data.check !== undefined, {
    message: 'At least one of message or check must be provided',
  });

export const CreateTodoBodyDTO = z.union([
  CreateTodoRequestDTO,
  z.array(CreateTodoRequestDTO).min(1),
]);

export const UpdateTodoBodyDTO = z.union([
  UpdateTodoRequestDTO,
  z.array(UpdateTodoRequestDTO).min(1),
]);

export const TodoQueryDTO = PaginationQueryDTO.extend({
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

export const PaginatedTodoResponseDTO = z
  .object({
    data: z.array(TodoResponseDTO),
    pagination: PaginationResponseDTO,
  })
  .openapi('PaginatedTodoResponse');

export const TodoMutationResponseDTO = z.object({
  message: z.string(),
  data: z.union([TodoResponseDTO, z.array(TodoResponseDTO)]),
});

export const SingleTodoResponseDTO = z.object({
  data: TodoResponseDTO,
});

export const SingleTodoMutationResponseDTO = z.object({
  message: z.string(),
  data: TodoResponseDTO,
});
