import { withTransaction, type TodolistAttributes } from '../db/index.js';
import { todolistRepository } from '../db/repositories/todolist.repository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { createPagination, type PaginatedResult } from '../utils/pagination.js';

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

export async function listTodolists(
  input: ListTodolistsInput,
): Promise<PaginatedResult<TodolistAttributes>> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 10;
  if (!Number.isInteger(page) || page < 1) {
    throw new ValidationError('page must be a positive integer');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ValidationError('limit must be an integer between 1 and 100');
  }

  const search = input.search?.trim() || undefined;
  const { rows, count } = await todolistRepository.findPaginated({
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

export async function getTodolistById(userId: number, id: number): Promise<TodolistAttributes> {
  const record = await todolistRepository.findById(userId, id);
  if (!record) {
    throw new NotFoundError(`Todolist with id ${id} not found`);
  }
  return record;
}

export async function createTodolists(
  userId: number,
  items: CreateTodolistInput[],
): Promise<TodolistAttributes[]> {
  if (items.length === 0) {
    throw new ValidationError('At least one todolist item is required');
  }

  const normalized = items.map((item, idx) => {
    const title = item.title?.trim();
    if (!title) {
      throw new ValidationError(`Item at index ${idx}: title is required`);
    }
    return { title };
  });

  return withTransaction(() => todolistRepository.bulkCreate(userId, normalized));
}

export async function updateTodolists(
  userId: number,
  items: UpdateTodolistInput[],
): Promise<TodolistAttributes[]> {
  if (items.length === 0) {
    throw new ValidationError('At least one todolist item is required');
  }

  const normalized = items.map((item, idx) => {
    if (!Number.isInteger(item.id) || item.id < 1) {
      throw new ValidationError(`Item at index ${idx}: valid positive integer id is required`);
    }
    const title = item.title?.trim();
    if (!title) {
      throw new ValidationError(`Item at index ${idx}: title is required`);
    }
    return { id: item.id, title };
  });

  return withTransaction(async () => {
    const ids = Array.from(new Set(normalized.map((item) => item.id)));
    const existing = await todolistRepository.findByIds(userId, ids);
    const byId = new Map(existing.map((record) => [record.id, record]));

    for (const item of normalized) {
      if (!byId.has(item.id)) {
        throw new NotFoundError(`Todolist with id ${item.id} not found`);
      }
    }

    const updated: TodolistAttributes[] = [];
    for (const item of normalized) {
      const record = byId.get(item.id)!;
      updated.push(await todolistRepository.updateRecord(record, { title: item.title }));
    }
    return updated;
  });
}

export async function deleteTodolistById(userId: number, id: number): Promise<number> {
  const deletedCount = await withTransaction(() => todolistRepository.deleteById(userId, id));
  if (deletedCount === 0) {
    throw new NotFoundError(`Todolist with id ${id} not found`);
  }
  return id;
}

export async function deleteTodolists(
  userId: number,
  ids: number[],
): Promise<{ deletedCount: number; requestedIDs: number[] }> {
  if (ids.length === 0) {
    throw new ValidationError('At least one ID is required for deletion');
  }

  const uniqueIds = Array.from(new Set(ids));
  const deletedCount = await withTransaction(() =>
    todolistRepository.deleteByIds(userId, uniqueIds),
  );

  return {
    deletedCount,
    requestedIDs: ids,
  };
}
