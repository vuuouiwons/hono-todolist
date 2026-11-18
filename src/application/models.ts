export interface User {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Todolist {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodolistInput {
  title: string;
}

export interface UpdateTodolistInput {
  id: number;
  title: string;
}

export interface Todo {
  id: number;
  userId: number;
  message: string;
  check: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  message: string;
  check?: boolean;
}

export interface UpdateTodoInput {
  id: number;
  message?: string;
  check?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

export function createPagination(page: number, limit: number, totalItems: number): Pagination {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function normalizeTimestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
