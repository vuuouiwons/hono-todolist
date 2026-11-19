import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { createPagination, type PaginatedResult } from '../../shared/pagination.js';
import type { TodolistModel } from '../models/todolist.model.js';
import type { ITodolistRepository } from '../repositories/ITodolistRepository.js';

export interface ListTodolistsInput {
  userId: number;
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateTodolistInput {
  title: string;
}

export interface UpdateTodolistInput {
  id: number;
  title: string;
}

export class TodolistService {
  constructor(private readonly todolistRepository: ITodolistRepository) {}

  async listTodolists(input: ListTodolistsInput): Promise<PaginatedResult<TodolistModel>> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    if (!Number.isInteger(page) || page < 1) {
      throw new ValidationError('page must be a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('limit must be an integer between 1 and 100');
    }

    const search = input.search?.trim() || undefined;
    const { rows, count } = await this.todolistRepository.findPaginated({
      userId: input.userId,
      page,
      limit,
      search,
    });

    return {
      data: rows,
      pagination: createPagination(page, limit, count),
    };
  }

  async getTodolistById(userId: number, id: number): Promise<TodolistModel> {
    const record = await this.todolistRepository.findById(userId, id);
    if (!record) {
      throw new NotFoundError(`Todolist with id ${id} not found`);
    }
    return record;
  }

  async createTodolists(
    userId: number,
    items: CreateTodolistInput[],
  ): Promise<TodolistModel[]> {
    if (items.length === 0) {
      throw new ValidationError('items array must not be empty');
    }

    const cleanedItems = items.map((item, idx) => {
      const title = item.title?.trim();
      if (!title) {
        throw new ValidationError(`Item at index ${idx}: title is required`);
      }
      return { title };
    });

    return this.todolistRepository.bulkCreate(userId, cleanedItems);
  }

  async updateTodolists(
    userId: number,
    items: UpdateTodolistInput[],
  ): Promise<TodolistModel[]> {
    if (items.length === 0) {
      throw new ValidationError('items array must not be empty');
    }

    const normalized = items.map((item, idx) => {
      if (!Number.isInteger(item.id) || item.id <= 0) {
        throw new ValidationError(`Item at index ${idx}: valid positive integer id is required`);
      }
      const title = item.title?.trim();
      if (!title) {
        throw new ValidationError(`Item at index ${idx}: title is required`);
      }
      return { id: item.id, title };
    });

    const ids = Array.from(new Set(normalized.map((item) => item.id)));
    const existing = await this.todolistRepository.findByIds(userId, ids);
    const byId = new Map(existing.map((record) => [record.id, record]));

    for (const item of normalized) {
      if (!byId.has(item.id)) {
        throw new NotFoundError(`Todolist with id ${item.id} not found`);
      }
    }

    const updated: TodolistModel[] = [];
    for (const item of normalized) {
      const res = await this.todolistRepository.updateRecord(userId, item.id, {
        title: item.title,
      });
      if (res) {
        updated.push(res);
      }
    }
    return updated;
  }

  async deleteTodolistById(userId: number, id: number): Promise<number> {
    const deletedCount = await this.todolistRepository.deleteById(userId, id);
    if (deletedCount === 0) {
      throw new NotFoundError(`Todolist with id ${id} not found`);
    }
    return id;
  }

  async deleteTodolists(
    userId: number,
    ids: number[],
  ): Promise<{ deletedCount: number; requestedIDs: number[] }> {
    if (ids.length === 0) {
      throw new ValidationError('At least one ID is required for deletion');
    }

    const uniqueIds = Array.from(new Set(ids));
    const deletedCount = await this.todolistRepository.deleteByIds(userId, uniqueIds);

    return {
      deletedCount,
      requestedIDs: ids,
    };
  }
}
