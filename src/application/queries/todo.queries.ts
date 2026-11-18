import { NotFoundError } from '../errors.js';
import { createPagination, type PaginatedResult, type Todo } from '../models.js';
import type { TodoRepository } from '../ports.js';
import { getCurrentTx } from '../transactional.js';
import { ListTodosQuerySchema, PositiveIdSchema, parseOrThrow } from '../validation.js';

export interface ListTodosParams {
  userId: number;
  page?: number;
  limit?: number;
  search?: string;
  check?: boolean;
}

export class TodoQueries {
  constructor(private readonly todos: TodoRepository) {}

  async list(input: ListTodosParams): Promise<PaginatedResult<Todo>> {
    const { userId, page, limit, search, check } = parseOrThrow(ListTodosQuerySchema, input);
    const { items, totalItems } = await this.todos.findAll(
      { userId, page, limit, search, check },
      getCurrentTx(),
    );

    return {
      data: items,
      pagination: createPagination(page, limit, totalItems),
    };
  }

  async getById(userId: number, id: number): Promise<Todo> {
    const validUserId = parseOrThrow(PositiveIdSchema, userId);
    const validId = parseOrThrow(PositiveIdSchema, id);

    const todo = await this.todos.findById(validUserId, validId, getCurrentTx());
    if (!todo) {
      throw new NotFoundError(`Todo with id ${validId} not found`);
    }

    return todo;
  }
}
