import type { z } from '@hono/zod-openapi';
import type { PaginatedResult, Pagination, Todo, Todolist, User } from '../application/models.js';
import type {
  PaginatedTodoResponseDTO,
  PaginatedTodolistResponseDTO,
  PaginationResponseDTO,
  TodoResponseDTO,
  TodolistResponseDTO,
  UserResponseDTO,
} from './dtos.js';

export function toUserResponseDTO(user: User): z.infer<typeof UserResponseDTO> {
  // Explicit field-by-field mapping ensures sensitive fields like passwordHash never leak
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export function toPaginationResponseDTO(
  pagination: Pagination,
): z.infer<typeof PaginationResponseDTO> {
  return {
    page: pagination.page,
    limit: pagination.limit,
    totalItems: pagination.totalItems,
    totalPages: pagination.totalPages,
    hasNext: pagination.hasNext,
    hasPrev: pagination.hasPrev,
  };
}

export function toTodolistResponseDTO(
  todolist: Todolist,
): z.infer<typeof TodolistResponseDTO> {
  return {
    id: todolist.id,
    userId: todolist.userId,
    title: todolist.title,
    createdAt: todolist.createdAt,
    updatedAt: todolist.updatedAt,
  };
}

export function toPaginatedTodolistResponseDTO(
  result: PaginatedResult<Todolist>,
): z.infer<typeof PaginatedTodolistResponseDTO> {
  return {
    data: result.data.map(toTodolistResponseDTO),
    pagination: toPaginationResponseDTO(result.pagination),
  };
}

export function toTodoResponseDTO(todo: Todo): z.infer<typeof TodoResponseDTO> {
  return {
    id: todo.id,
    userId: todo.userId,
    message: todo.message,
    check: todo.check,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
}

export function toPaginatedTodoResponseDTO(
  result: PaginatedResult<Todo>,
): z.infer<typeof PaginatedTodoResponseDTO> {
  return {
    data: result.data.map(toTodoResponseDTO),
    pagination: toPaginationResponseDTO(result.pagination),
  };
}
