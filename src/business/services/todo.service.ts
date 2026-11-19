import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { createPagination, type PaginatedResult } from '../../shared/pagination.js';
import type { TodoModel } from '../models/todo.model.js';
import type { ITodoRepository } from '../repositories/ITodoRepository.js';

export interface ListTodosInput {
  userId: number;
  page?: number;
  limit?: number;
  search?: string;
  check?: boolean;
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

export class TodoService {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async listTodos(input: ListTodosInput): Promise<PaginatedResult<TodoModel>> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    if (!Number.isInteger(page) || page < 1) {
      throw new ValidationError('page must be a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('limit must be an integer between 1 and 100');
    }

    const search = input.search?.trim() || undefined;
    const { rows, count } = await this.todoRepository.findPaginated({
      userId: input.userId,
      page,
      limit,
      search,
      check: input.check,
    });

    return {
      data: rows,
      pagination: createPagination(page, limit, count),
    };
  }

  async getTodoById(userId: number, id: number): Promise<TodoModel> {
    const record = await this.todoRepository.findById(userId, id);
    if (!record) {
      throw new NotFoundError(`Todo with id ${id} not found`);
    }
    return record;
  }

  async createTodos(userId: number, items: CreateTodoInput[]): Promise<TodoModel[]> {
    if (items.length === 0) {
      throw new ValidationError('items array must not be empty');
    }

    const cleanedItems = items.map((item, idx) => {
      const message = item.message?.trim();
      if (!message) {
        throw new ValidationError(`Item at index ${idx}: message is required`);
      }
      return {
        message,
        check: item.check ?? false,
      };
    });

    return this.todoRepository.bulkCreate(userId, cleanedItems);
  }

  async updateTodos(userId: number, items: UpdateTodoInput[]): Promise<TodoModel[]> {
    if (items.length === 0) {
      throw new ValidationError('items array must not be empty');
    }

    const normalized = items.map((item, idx) => {
      if (!Number.isInteger(item.id) || item.id <= 0) {
        throw new ValidationError(`Item at index ${idx}: valid positive integer id is required`);
      }
      if (item.message === undefined && item.check === undefined) {
        throw new ValidationError(
          `Item at index ${idx}: at least one of message or check must be provided`,
        );
      }

      const message = item.message !== undefined ? item.message.trim() : undefined;
      if (message !== undefined && message.length === 0) {
        throw new ValidationError(`Item at index ${idx}: message cannot be empty`);
      }

      return {
        id: item.id,
        ...(message !== undefined ? { message } : {}),
        ...(item.check !== undefined ? { check: item.check } : {}),
      };
    });

    const ids = Array.from(new Set(normalized.map((item) => item.id)));
    const existing = await this.todoRepository.findByIds(userId, ids);
    const byId = new Map(existing.map((record) => [record.id, record]));

    for (const item of normalized) {
      if (!byId.has(item.id)) {
        throw new NotFoundError(`Todo with id ${item.id} not found`);
      }
    }

    const updated: TodoModel[] = [];
    for (const item of normalized) {
      const patch: Partial<Pick<TodoModel, 'message' | 'check'>> = {};
      if (item.message !== undefined) {
        patch.message = item.message;
      }
      if (item.check !== undefined) {
        patch.check = item.check;
      }
      const res = await this.todoRepository.updateRecord(userId, item.id, patch);
      if (res) {
        updated.push(res);
      }
    }

    return updated;
  }

  async deleteTodoById(userId: number, id: number): Promise<number> {
    const deletedCount = await this.todoRepository.deleteById(userId, id);
    if (deletedCount === 0) {
      throw new NotFoundError(`Todo with id ${id} not found`);
    }
    return id;
  }

  async deleteTodos(
    userId: number,
    ids: number[],
  ): Promise<{ deletedCount: number; requestedIDs: number[] }> {
    if (ids.length === 0) {
      throw new ValidationError('At least one ID is required for deletion');
    }

    const uniqueIds = Array.from(new Set(ids));
    const deletedCount = await this.todoRepository.deleteByIds(userId, uniqueIds);

    return {
      deletedCount,
      requestedIDs: ids,
    };
  }
}
