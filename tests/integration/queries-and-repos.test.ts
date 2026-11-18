import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '../../src/application/errors.js';
import { TodoQueries } from '../../src/application/queries/todo.queries.js';
import { TodolistQueries } from '../../src/application/queries/todolist.queries.js';
import { initializeDatabase, type DatabaseContext } from '../../src/infrastructure/database.js';
import {
  SequelizeTodoRepository,
  SequelizeTodolistRepository,
  SequelizeUserRepository,
} from '../../src/infrastructure/repositories.js';

describe('Integration Tests: Queries & Sequelize ORM Repositories against SQLite', () => {
  let db: DatabaseContext;
  let userRepo: SequelizeUserRepository;
  let todolistRepo: SequelizeTodolistRepository;
  let todoRepo: SequelizeTodoRepository;
  let todolistQueries: TodolistQueries;
  let todoQueries: TodoQueries;

  beforeEach(async () => {
    db = await initializeDatabase({ storage: ':memory:' });
    userRepo = new SequelizeUserRepository(db.tables.User);
    todolistRepo = new SequelizeTodolistRepository(db.tables.Todolist);
    todoRepo = new SequelizeTodoRepository(db.tables.Todo);
    todolistQueries = new TodolistQueries(todolistRepo);
    todoQueries = new TodoQueries(todoRepo);
  });

  afterEach(async () => {
    await db.close();
  });

  it('persists users, enforces unique email constraint, and rolls back failed transactions', async () => {
    const user = await db.transactor.execInTransaction((tx) =>
      userRepo.create({ email: 'alice@example.com', passwordHash: 'hash1' }, tx),
    );
    expect(user.id).toBeGreaterThan(0);
    expect((await userRepo.findByEmail('alice@example.com'))?.id).toBe(user.id);

    await expect(
      userRepo.create({ email: 'alice@example.com', passwordHash: 'hash2' }),
    ).rejects.toThrow(ConflictError);

    // Explicit rollback verification via SequelizeTransactor
    await expect(
      db.transactor.execInTransaction(async (tx) => {
        await todolistRepo.createMany(user.id, [{ title: 'Should Rollback' }], tx);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const listsAfterRollback = await todolistQueries.list({ userId: user.id });
    expect(listsAfterRollback.pagination.totalItems).toBe(0);
  });

  it('queries Todolists via Sequelize ORM with pagination, LIKE search, and user isolation', async () => {
    const alice = await userRepo.create({ email: 'alice@example.com', passwordHash: 'h1' });
    const bob = await userRepo.create({ email: 'bob@example.com', passwordHash: 'h2' });

    const created = await db.transactor.execInTransaction((tx) =>
      todolistRepo.createMany(
        alice.id,
        [{ title: 'Work Alpha' }, { title: 'Groceries' }, { title: 'Work Beta' }],
        tx,
      ),
    );
    await todolistRepo.createMany(bob.id, [{ title: 'Bob Work List' }]);

    const page1 = await todolistQueries.list({ userId: alice.id, page: 1, limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.pagination).toEqual({
      page: 1,
      limit: 2,
      totalItems: 3,
      totalPages: 2,
      hasNext: true,
      hasPrev: false,
    });

    const searched = await todolistQueries.list({ userId: alice.id, search: 'Work' });
    expect(searched.data.map((item) => item.title)).toEqual(['Work Alpha', 'Work Beta']);

    const found = await todolistQueries.getById(alice.id, created[0].id);
    expect(found.title).toBe('Work Alpha');
    expect(new Date(found.createdAt).toISOString()).toBe(found.createdAt);

    await expect(todolistQueries.getById(bob.id, created[0].id)).rejects.toThrow(NotFoundError);
    await expect(todolistQueries.list({ userId: alice.id, page: 0 })).rejects.toThrow(
      ValidationError,
    );
  });

  it('queries Todos via Sequelize ORM mapping booleans & performs atomic bulk updates', async () => {
    const alice = await userRepo.create({ email: 'alice@example.com', passwordHash: 'h1' });

    const created = await db.transactor.execInTransaction((tx) =>
      todoRepo.createMany(
        alice.id,
        [
          { message: 'Buy milk', check: false },
          { message: 'Buy bread', check: true },
          { message: 'Write tests', check: false },
        ],
        tx,
      ),
    );

    const unchecked = await todoQueries.list({ userId: alice.id, check: false });
    expect(unchecked.pagination.totalItems).toBe(2);
    expect(unchecked.data.every((t) => t.check === false)).toBe(true);

    const checkedSearch = await todoQueries.list({
      userId: alice.id,
      check: true,
      search: 'bread',
    });
    expect(checkedSearch.data).toHaveLength(1);
    expect(checkedSearch.data[0].check).toBe(true);

    // Atomic bulk update rollback when one ID does not exist
    await expect(
      db.transactor.execInTransaction((tx) =>
        todoRepo.updateMany(
          alice.id,
          [
            { id: created[0].id, message: 'Should Not Persist', check: true },
            { id: 99999, message: 'Missing' },
          ],
          tx,
        ),
      ),
    ).rejects.toThrow(NotFoundError);

    const stillOriginal = await todoQueries.getById(alice.id, created[0].id);
    expect(stillOriginal.message).toBe('Buy milk');
    expect(stillOriginal.check).toBe(false);
  });
});
