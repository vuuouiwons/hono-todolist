import { NotFoundError } from '../errors.js';
import { createPagination, type PaginatedResult, type Todolist } from '../models.js';
import type { TodolistRepository } from '../ports.js';
import { getCurrentTx } from '../transactional.js';
import { ListTodolistsQuerySchema, PositiveIdSchema, parseOrThrow } from '../validation.js';

export interface ListTodolistsParams {
  userId: number;
  page?: number;
  limit?: number;
  search?: string;
}

export class TodolistQueries {
  constructor(private readonly todolists: TodolistRepository) {}

  async list(input: ListTodolistsParams): Promise<PaginatedResult<Todolist>> {
    const { userId, page, limit, search } = parseOrThrow(ListTodolistsQuerySchema, input);
    const { items, totalItems } = await this.todolists.findAll(
      { userId, page, limit, search },
      getCurrentTx(),
    );

    return {
      data: items,
      pagination: createPagination(page, limit, totalItems),
    };
  }

  async getById(userId: number, id: number): Promise<Todolist> {
    const validUserId = parseOrThrow(PositiveIdSchema, userId);
    const validId = parseOrThrow(PositiveIdSchema, id);

    const todolist = await this.todolists.findById(validUserId, validId, getCurrentTx());
    if (!todolist) {
      throw new NotFoundError(`Todolist with id ${validId} not found`);
    }

    return todolist;
  }
}
