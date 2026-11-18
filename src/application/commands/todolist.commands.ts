import { NotFoundError } from '../errors.js';
import type { CreateTodolistInput, Todolist, UpdateTodolistInput } from '../models.js';
import type { TodolistRepository } from '../ports.js';
import { getCurrentTx } from '../transactional.js';
import {
  CreateTodolistBulkSchema,
  DeleteIdsSchema,
  PositiveIdSchema,
  UpdateTodolistBulkSchema,
  parseOrThrow,
} from '../validation.js';

export interface DeleteManyResult {
  deletedCount: number;
  requestedIDs: number[];
}

export class TodolistCommands {
  constructor(private readonly todolists: TodolistRepository) {}

  async createSingle(userId: number, input: CreateTodolistInput): Promise<Todolist> {
    const [created] = await this.createBulk(userId, [input]);
    return created;
  }

  async createBulk(userId: number, inputs: CreateTodolistInput[]): Promise<Todolist[]> {
    const validUserId = parseOrThrow(PositiveIdSchema, userId);
    const normalized = parseOrThrow(CreateTodolistBulkSchema, inputs);
    return this.todolists.createMany(validUserId, normalized, getCurrentTx());
  }

  async updateSingle(userId: number, input: UpdateTodolistInput): Promise<Todolist> {
    const [updated] = await this.updateBulk(userId, [input]);
    return updated;
  }

  async updateBulk(userId: number, inputs: UpdateTodolistInput[]): Promise<Todolist[]> {
    const validUserId = parseOrThrow(PositiveIdSchema, userId);
    const normalized = parseOrThrow(UpdateTodolistBulkSchema, inputs);
    return this.todolists.updateMany(validUserId, normalized, getCurrentTx());
  }

  async deleteById(userId: number, id: number): Promise<number> {
    const validUserId = parseOrThrow(PositiveIdSchema, userId);
    const validId = parseOrThrow(PositiveIdSchema, id);
    const deletedCount = await this.todolists.deleteMany(validUserId, [validId], getCurrentTx());
    if (deletedCount === 0) {
      throw new NotFoundError(`Todolist with id ${validId} not found`);
    }
    return validId;
  }

  async deleteMany(userId: number, ids: number[]): Promise<DeleteManyResult> {
    const validUserId = parseOrThrow(PositiveIdSchema, userId);
    const validIds = parseOrThrow(DeleteIdsSchema, ids);

    const uniqueIds = Array.from(new Set(validIds));
    const deletedCount = await this.todolists.deleteMany(validUserId, uniqueIds, getCurrentTx());

    return {
      deletedCount,
      requestedIDs: validIds,
    };
  }
}
