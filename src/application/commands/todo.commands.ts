import { NotFoundError } from '../errors.js';
import type { CreateTodoInput, Todo, UpdateTodoInput } from '../models.js';
import type { TodoRepository, Transactor } from '../ports.js';
import { getCurrentTx, Transactional } from '../transactional.js';
import {
  CreateTodoBulkSchema,
  DeleteIdsSchema,
  PositiveIdSchema,
  UpdateTodoBulkSchema,
  parseOrThrow,
} from '../validation.js';
import type { DeleteManyResult } from './todolist.commands.js';

export class TodoCommands {
  constructor(
    private readonly todos: TodoRepository,
    public readonly transactor: Transactor,
  ) {}

  @Transactional()
  async createSingle(userId: number, input: CreateTodoInput): Promise<Todo> {
    const [created] = await this.createBulk(userId, [input]);
    return created;
  }

  @Transactional()
  async createBulk(userId: number, inputs: CreateTodoInput[]): Promise<Todo[]> {
    const validUserId = parseOrThrow(PositiveIdSchema, userId);
    const normalized = parseOrThrow(CreateTodoBulkSchema, inputs);
    return this.todos.createMany(validUserId, normalized, getCurrentTx());
  }

  @Transactional()
  async updateSingle(userId: number, input: UpdateTodoInput): Promise<Todo> {
    const [updated] = await this.updateBulk(userId, [input]);
    return updated;
  }

  @Transactional()
  async updateBulk(userId: number, inputs: UpdateTodoInput[]): Promise<Todo[]> {
    const validUserId = parseOrThrow(PositiveIdSchema, userId);
    const normalized = parseOrThrow(UpdateTodoBulkSchema, inputs);
    return this.todos.updateMany(validUserId, normalized, getCurrentTx());
  }

  @Transactional()
  async deleteById(userId: number, id: number): Promise<number> {
    const validUserId = parseOrThrow(PositiveIdSchema, userId);
    const validId = parseOrThrow(PositiveIdSchema, id);
    const deletedCount = await this.todos.deleteMany(validUserId, [validId], getCurrentTx());
    if (deletedCount === 0) {
      throw new NotFoundError(`Todo with id ${validId} not found`);
    }
    return validId;
  }

  @Transactional()
  async deleteMany(userId: number, ids: number[]): Promise<DeleteManyResult> {
    const validUserId = parseOrThrow(PositiveIdSchema, userId);
    const validIds = parseOrThrow(DeleteIdsSchema, ids);

    const uniqueIds = Array.from(new Set(validIds));
    const deletedCount = await this.todos.deleteMany(validUserId, uniqueIds, getCurrentTx());

    return {
      deletedCount,
      requestedIDs: validIds,
    };
  }
}
