import { withTransaction, type TodoAttributes } from '../db/index.js';
import { todoRepository } from '../db/repositories/todo.repository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { createPagination, type PaginatedResult } from '../utils/pagination.js';

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

export async function listTodos(input: ListTodosInput): Promise<PaginatedResult<TodoAttributes>> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 10;
  if (!Number.isInteger(page) || page < 1) {
    throw new ValidationError('page must be a positive integer');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ValidationError('limit must be an integer between 1 and 100');
  }

  const search = input.search?.trim() || undefined;
  const { rows, count } = await todoRepository.findPaginated({
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

export async function getTodoById(userId: number, id: number): Promise<TodoAttributes> {
  const record = await todoRepository.findById(userId, id);
  if (!record) {
    throw new NotFoundError(`Todo with id ${id} not found`);
  }
  return record;
}

export async function createTodos(
  userId: number,
  items: CreateTodoInput[],
): Promise<TodoAttributes[]> {
  if (items.length === 0) {
    throw new ValidationError('At least one todo item is required');
  }

  const normalized = items.map((item, idx) => {
    const message = item.message?.trim();
    if (!message) {
      throw new ValidationError(`Item at index ${idx}: message is required`);
    }
    return {
      message,
      check: item.check ?? false,
    };
  });

  return withTransaction(() => todoRepository.bulkCreate(userId, normalized));
}

export async function updateTodos(
  userId: number,
  items: UpdateTodoInput[],
): Promise<TodoAttributes[]> {
  if (items.length === 0) {
    throw new ValidationError('At least one todo item is required');
  }

  const normalized = items.map((item, idx) => {
    if (!Number.isInteger(item.id) || item.id < 1) {
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

  return withTransaction(async () => {
    const ids = Array.from(new Set(normalized.map((item) => item.id)));
    const existing = await todoRepository.findByIds(userId, ids);
    const byId = new Map(existing.map((record) => [record.id, record]));

    for (const item of normalized) {
      if (!byId.has(item.id)) {
        throw new NotFoundError(`Todo with id ${item.id} not found`);
      }
    }

    const updated: TodoAttributes[] = [];
    for (const item of normalized) {
      const record = byId.get(item.id)!;
      const patch: Partial<Pick<TodoAttributes, 'message' | 'check'>> = {};
      if (item.message !== undefined) {
        patch.message = item.message;
      }
      if (item.check !== undefined) {
        patch.check = item.check;
      }
      updated.push(await todoRepository.updateRecord(record, patch));
    }
    return updated;
  });
}

export async function deleteTodoById(userId: number, id: number): Promise<number> {
  const deletedCount = await withTransaction(() => todoRepository.deleteById(userId, id));
  if (deletedCount === 0) {
    throw new NotFoundError(`Todo with id ${id} not found`);
  }
  return id;
}

export async function deleteTodos(
  userId: number,
  ids: number[],
): Promise<{ deletedCount: number; requestedIDs: number[] }> {
  if (ids.length === 0) {
    throw new ValidationError('At least one ID is required for deletion');
  }

  const uniqueIds = Array.from(new Set(ids));
  const deletedCount = await withTransaction(() => todoRepository.deleteByIds(userId, uniqueIds));

  return {
    deletedCount,
    requestedIDs: ids,
  };
}
