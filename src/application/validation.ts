import { z } from 'zod';
import { ValidationError } from './errors.js';

export function formatZodIssues(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return 'Validation error';
  }
  const path = firstIssue.path.length > 0 ? `${firstIssue.path.join('.')}: ` : '';
  return `${path}${firstIssue.message}`;
}

export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(formatZodIssues(result.error));
  }
  return result.data;
}

export const PositiveIdSchema = z
  .number()
  .int()
  .positive('valid positive integer id is required');

export const AuthRegisterSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email('Invalid email')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const AuthLoginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const CreateTodolistItemSchema = z.object({
  title: z.string().trim().min(1, 'title is required'),
});

export const CreateTodolistBulkSchema = z
  .array(CreateTodolistItemSchema)
  .min(1, 'At least one todolist item is required');

export const UpdateTodolistItemSchema = z.object({
  id: PositiveIdSchema,
  title: z.string().trim().min(1, 'title is required'),
});

export const UpdateTodolistBulkSchema = z
  .array(UpdateTodolistItemSchema)
  .min(1, 'At least one todolist item is required');

export const DeleteIdsSchema = z
  .array(PositiveIdSchema)
  .min(1, 'At least one ID is required for deletion');

export const CreateTodoItemSchema = z.object({
  message: z.string().trim().min(1, 'message is required'),
  check: z.boolean().default(false),
});

export const CreateTodoBulkSchema = z
  .array(CreateTodoItemSchema)
  .min(1, 'At least one todo item is required');

export const UpdateTodoItemSchema = z
  .object({
    id: PositiveIdSchema,
    message: z.string().trim().min(1, 'message cannot be empty').optional(),
    check: z.boolean().optional(),
  })
  .refine((data) => data.message !== undefined || data.check !== undefined, {
    message: 'at least one of message or check must be provided',
  });

export const UpdateTodoBulkSchema = z
  .array(UpdateTodoItemSchema)
  .min(1, 'At least one todo item is required');

export const ListTodolistsQuerySchema = z.object({
  userId: PositiveIdSchema,
  page: z.number().int('page must be a positive integer').min(1, 'page must be a positive integer').default(1),
  limit: z
    .number()
    .int('limit must be an integer between 1 and 100')
    .min(1, 'limit must be an integer between 1 and 100')
    .max(100, 'limit must be an integer between 1 and 100')
    .default(10),
  search: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional(),
});

export const ListTodosQuerySchema = ListTodolistsQuerySchema.extend({
  check: z.boolean().optional(),
});
