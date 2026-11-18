import { Op, UniqueConstraintError, type WhereOptions } from 'sequelize';
import { ConflictError, NotFoundError } from '../application/errors.js';
import {
  normalizeTimestamp,
  type CreateTodoInput,
  type CreateTodolistInput,
  type Todo,
  type Todolist,
  type UpdateTodoInput,
  type UpdateTodolistInput,
  type User,
} from '../application/models.js';
import type {
  FindTodolistsParams,
  FindTodosParams,
  TodoRepository,
  TodolistRepository,
  Tx,
  UserRepository,
} from '../application/ports.js';
import {
  unwrapTx,
  type TodoRecord,
  type TodoTable,
  type TodolistRecord,
  type TodolistTable,
  type UserRecord,
  type UserTable,
} from './database.js';

export class SequelizeUserRepository implements UserRepository {
  constructor(private readonly users: UserTable) {}

  private toModel(record: UserRecord): User {
    const plain = record.get({ plain: true });
    return {
      id: plain.id,
      email: plain.email,
      passwordHash: plain.passwordHash,
      createdAt: normalizeTimestamp(plain.createdAt),
    };
  }

  async findByEmail(email: string, tx?: Tx): Promise<User | null> {
    const record = await this.users.findOne({ where: { email }, transaction: unwrapTx(tx) });
    return record ? this.toModel(record) : null;
  }

  async findById(id: number, tx?: Tx): Promise<User | null> {
    const record = await this.users.findByPk(id, { transaction: unwrapTx(tx) });
    return record ? this.toModel(record) : null;
  }

  async create(input: { email: string; passwordHash: string }, tx?: Tx): Promise<User> {
    try {
      const created = await this.users.create(
        { email: input.email, passwordHash: input.passwordHash },
        { transaction: unwrapTx(tx) },
      );
      return this.toModel(created);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictError('Email already exists');
      }
      throw error;
    }
  }
}

export class SequelizeTodolistRepository implements TodolistRepository {
  constructor(private readonly todolists: TodolistTable) {}

  private toModel(record: TodolistRecord): Todolist {
    const plain = record.get({ plain: true });
    return {
      id: plain.id,
      userId: plain.userId,
      title: plain.title,
      createdAt: normalizeTimestamp(plain.createdAt),
      updatedAt: normalizeTimestamp(plain.updatedAt),
    };
  }

  async findAll(
    params: FindTodolistsParams,
    tx?: Tx,
  ): Promise<{ items: Todolist[]; totalItems: number }> {
    const where: WhereOptions<{ userId: number; title: string }> = {
      userId: params.userId,
    };

    if (params.search) {
      where.title = { [Op.like]: `%${params.search}%` };
    }

    const { rows, count } = await this.todolists.findAndCountAll({
      where,
      limit: params.limit,
      offset: (params.page - 1) * params.limit,
      order: [['id', 'ASC']],
      transaction: unwrapTx(tx),
    });

    return {
      items: rows.map((row) => this.toModel(row)),
      totalItems: count,
    };
  }

  async findById(userId: number, id: number, tx?: Tx): Promise<Todolist | null> {
    const record = await this.todolists.findOne({
      where: { id, userId },
      transaction: unwrapTx(tx),
    });
    return record ? this.toModel(record) : null;
  }

  async createMany(userId: number, items: CreateTodolistInput[], tx?: Tx): Promise<Todolist[]> {
    const created = await this.todolists.bulkCreate(
      items.map((item) => ({ userId, title: item.title })),
      { transaction: unwrapTx(tx), returning: true },
    );
    return created.map((row) => this.toModel(row));
  }

  async updateMany(userId: number, items: UpdateTodolistInput[], tx?: Tx): Promise<Todolist[]> {
    const transaction = unwrapTx(tx);
    const ids = Array.from(new Set(items.map((item) => item.id)));
    const existing = await this.todolists.findAll({
      where: { userId, id: { [Op.in]: ids } },
      transaction,
    });

    const byId = new Map<number, TodolistRecord>(
      existing.map((record) => [record.get('id') as number, record]),
    );

    for (const item of items) {
      if (!byId.has(item.id)) {
        throw new NotFoundError(`Todolist with id ${item.id} not found`);
      }
    }

    const updated: Todolist[] = [];
    for (const item of items) {
      const record = byId.get(item.id)!;
      await record.update({ title: item.title }, { transaction });
      updated.push(this.toModel(record));
    }
    return updated;
  }

  async deleteMany(userId: number, ids: number[], tx?: Tx): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    return this.todolists.destroy({
      where: { userId, id: { [Op.in]: ids } },
      transaction: unwrapTx(tx),
    });
  }
}

export class SequelizeTodoRepository implements TodoRepository {
  constructor(private readonly todos: TodoTable) {}

  private toModel(record: TodoRecord): Todo {
    const plain = record.get({ plain: true });
    return {
      id: plain.id,
      userId: plain.userId,
      message: plain.message,
      check: Boolean(plain.check),
      createdAt: normalizeTimestamp(plain.createdAt),
      updatedAt: normalizeTimestamp(plain.updatedAt),
    };
  }

  async findAll(
    params: FindTodosParams,
    tx?: Tx,
  ): Promise<{ items: Todo[]; totalItems: number }> {
    const where: WhereOptions<{ userId: number; message: string; check: boolean }> = {
      userId: params.userId,
    };

    if (params.search) {
      where.message = { [Op.like]: `%${params.search}%` };
    }
    if (params.check !== undefined) {
      where.check = params.check;
    }

    const { rows, count } = await this.todos.findAndCountAll({
      where,
      limit: params.limit,
      offset: (params.page - 1) * params.limit,
      order: [['id', 'ASC']],
      transaction: unwrapTx(tx),
    });

    return {
      items: rows.map((row) => this.toModel(row)),
      totalItems: count,
    };
  }

  async findById(userId: number, id: number, tx?: Tx): Promise<Todo | null> {
    const record = await this.todos.findOne({
      where: { id, userId },
      transaction: unwrapTx(tx),
    });
    return record ? this.toModel(record) : null;
  }

  async createMany(userId: number, items: CreateTodoInput[], tx?: Tx): Promise<Todo[]> {
    const created = await this.todos.bulkCreate(
      items.map((item) => ({ userId, message: item.message, check: item.check ?? false })),
      { transaction: unwrapTx(tx), returning: true },
    );
    return created.map((row) => this.toModel(row));
  }

  async updateMany(userId: number, items: UpdateTodoInput[], tx?: Tx): Promise<Todo[]> {
    const transaction = unwrapTx(tx);
    const ids = Array.from(new Set(items.map((item) => item.id)));
    const existing = await this.todos.findAll({
      where: { userId, id: { [Op.in]: ids } },
      transaction,
    });

    const byId = new Map<number, TodoRecord>(
      existing.map((record) => [record.get('id') as number, record]),
    );

    for (const item of items) {
      if (!byId.has(item.id)) {
        throw new NotFoundError(`Todo with id ${item.id} not found`);
      }
    }

    const updated: Todo[] = [];
    for (const item of items) {
      const record = byId.get(item.id)!;
      const patch: { message?: string; check?: boolean } = {};
      if (item.message !== undefined) {
        patch.message = item.message;
      }
      if (item.check !== undefined) {
        patch.check = item.check;
      }
      await record.update(patch, { transaction });
      updated.push(this.toModel(record));
    }
    return updated;
  }

  async deleteMany(userId: number, ids: number[], tx?: Tx): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    return this.todos.destroy({
      where: { userId, id: { [Op.in]: ids } },
      transaction: unwrapTx(tx),
    });
  }
}
