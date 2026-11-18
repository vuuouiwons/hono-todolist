import { describe, expect, it, vi } from 'vitest';
import { AuthCommands } from '../../src/application/commands/auth.commands.js';
import { TodoCommands } from '../../src/application/commands/todo.commands.js';
import { TodolistCommands } from '../../src/application/commands/todolist.commands.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../src/application/errors.js';
import type { Todo, Todolist, User } from '../../src/application/models.js';
import type {
  PasswordHasher,
  TodoRepository,
  TodolistRepository,
  TokenService,
  Transactor,
  Tx,
  UserRepository,
} from '../../src/application/ports.js';
import { bindTx, getCurrentTx, runWithTx } from '../../src/application/transactional.js';

function createMockTransactor() {
  const fakeTx: Tx = {};
  const transactor: Transactor = {
    execInTransaction: vi.fn(async (fn) => bindTx(fakeTx, () => fn(fakeTx))),
  };
  return { fakeTx, transactor };
}

describe('Unit Tests: Application Commands (Mocked Ports, No DB)', () => {
  describe('AuthCommands', () => {
    function setupAuthMocks() {
      const users: UserRepository = {
        findByEmail: vi.fn(async () => null),
        findById: vi.fn(async () => null),
        create: vi.fn(async ({ email, passwordHash }) => ({
          id: 1,
          email,
          passwordHash,
          createdAt: '2026-11-18T00:00:00.000Z',
        })),
      };
      const passwordHasher: PasswordHasher = {
        hash: vi.fn(async (pw) => `hashed:${pw}`),
        verify: vi.fn(async (pw, hash) => hash === `hashed:${pw}`),
      };
      const tokenService: TokenService = {
        sign: vi.fn(async (payload) => `jwt:${payload.sub}:${payload.email}`),
        verify: vi.fn(async () => ({ sub: 1, email: 'user@example.com' })),
      };
      const commands = new AuthCommands(users, passwordHasher, tokenService);
      return { users, passwordHasher, tokenService, commands };
    }

    it('normalizes email, hashes password, and uses ambient tx when run inside transaction scope', async () => {
      const { commands, users, passwordHasher } = setupAuthMocks();
      const { fakeTx, transactor } = createMockTransactor();

      const created = await runWithTx(transactor, () =>
        commands.register({
          email: '  Alice@Example.COM ',
          password: 'password123',
        }),
      );

      expect(created.email).toBe('alice@example.com');
      expect(passwordHasher.hash).toHaveBeenCalledWith('password123');
      expect(transactor.execInTransaction).toHaveBeenCalledTimes(1);
      expect(users.findByEmail).toHaveBeenCalledWith('alice@example.com', fakeTx);
      expect(users.create).toHaveBeenCalledWith(
        { email: 'alice@example.com', passwordHash: 'hashed:password123' },
        fakeTx,
      );
    });

    it('rejects invalid email or short password without touching repositories', async () => {
      const { commands, users } = setupAuthMocks();

      await expect(commands.register({ email: '   ', password: 'password123' })).rejects.toThrow(
        ValidationError,
      );
      await expect(
        commands.register({ email: 'a@b.com', password: '123' }),
      ).rejects.toThrow(ValidationError);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('throws ConflictError when email already exists', async () => {
      const { commands, users } = setupAuthMocks();
      vi.mocked(users.findByEmail).mockResolvedValueOnce({
        id: 10,
        email: 'dup@example.com',
        passwordHash: 'hashed:secret',
        createdAt: '2026-11-18T00:00:00.000Z',
      });

      await expect(
        commands.register({ email: 'dup@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictError);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('logs in valid user, verifies tokens, and throws UnauthorizedError on wrong credentials', async () => {
      const { commands, users, tokenService } = setupAuthMocks();
      const storedUser: User = {
        id: 7,
        email: 'bob@example.com',
        passwordHash: 'hashed:secret123',
        createdAt: '2026-11-18T00:00:00.000Z',
      };
      vi.mocked(users.findByEmail).mockResolvedValueOnce(null);
      await expect(
        commands.login({ email: 'bob@example.com', password: 'secret123' }),
      ).rejects.toThrow(UnauthorizedError);

      vi.mocked(users.findByEmail).mockResolvedValue(storedUser);
      await expect(
        commands.login({ email: 'bob@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedError);

      const loginResult = await commands.login({
        email: ' BOB@Example.com ',
        password: 'secret123',
      });
      expect(loginResult.token).toBe('jwt:7:bob@example.com');
      expect(loginResult.user).toEqual(storedUser);

      const verified = await commands.verifyToken('some-token');
      expect(tokenService.verify).toHaveBeenCalledWith('some-token');
      expect(verified).toEqual({ sub: 1, email: 'user@example.com' });
    });
  });

  describe('TodolistCommands', () => {
    function setupTodolistMocks() {
      const repo: TodolistRepository = {
        findAll: vi.fn(async () => ({ items: [], totalItems: 0 })),
        findById: vi.fn(async () => null),
        createMany: vi.fn(async (userId, items) =>
          items.map(
            (item, idx): Todolist => ({
              id: idx + 1,
              userId,
              title: item.title,
              createdAt: '2026-11-18T00:00:00.000Z',
              updatedAt: '2026-11-18T00:00:00.000Z',
            }),
          ),
        ),
        updateMany: vi.fn(async (userId, items) =>
          items.map(
            (item): Todolist => ({
              id: item.id,
              userId,
              title: item.title,
              createdAt: '2026-11-18T00:00:00.000Z',
              updatedAt: '2026-11-18T00:00:00.000Z',
            }),
          ),
        ),
        deleteMany: vi.fn(async (_userId, ids) => ids.length),
      };
      const commands = new TodolistCommands(repo);
      return { repo, commands };
    }

    it('trims titles on createSingle/createBulk and forwards ambient tx', async () => {
      const { commands, repo } = setupTodolistMocks();
      const { fakeTx, transactor } = createMockTransactor();

      const single = await runWithTx(transactor, () =>
        commands.createSingle(1, { title: '  Groceries  ' }),
      );
      expect(single.title).toBe('Groceries');
      expect(repo.createMany).toHaveBeenCalledWith(1, [{ title: 'Groceries' }], fakeTx);

      const bulk = await commands.createBulk(1, [{ title: ' A ' }, { title: ' B ' }]);
      expect(bulk.map((b) => b.title)).toEqual(['A', 'B']);
      expect(repo.createMany).toHaveBeenLastCalledWith(
        1,
        [{ title: 'A' }, { title: 'B' }],
        undefined,
      );
    });

    it('validates create/update/delete inputs cleanly', async () => {
      const { commands, repo } = setupTodolistMocks();

      await expect(commands.createBulk(1, [])).rejects.toThrow(ValidationError);
      await expect(commands.createSingle(1, { title: '   ' })).rejects.toThrow(ValidationError);
      await expect(commands.updateBulk(1, [])).rejects.toThrow(ValidationError);
      await expect(commands.updateSingle(1, { id: 0, title: 'Ok' })).rejects.toThrow(
        ValidationError,
      );
      await expect(commands.updateSingle(1, { id: 1, title: '   ' })).rejects.toThrow(
        ValidationError,
      );
      await expect(commands.deleteMany(1, [])).rejects.toThrow(ValidationError);
      expect(repo.createMany).not.toHaveBeenCalled();
      expect(repo.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when deleteById deletes 0 rows and deduplicates deleteMany IDs', async () => {
      const { commands, repo } = setupTodolistMocks();
      vi.mocked(repo.deleteMany).mockResolvedValueOnce(0);

      await expect(commands.deleteById(1, 99)).rejects.toThrow(NotFoundError);

      vi.mocked(repo.deleteMany).mockResolvedValueOnce(2);
      const many = await commands.deleteMany(1, [5, 6, 5]);
      expect(repo.deleteMany).toHaveBeenLastCalledWith(1, [5, 6], undefined);
      expect(many).toEqual({ deletedCount: 2, requestedIDs: [5, 6, 5] });
    });

    it('reuses a single ambient transaction across multiple command calls via runWithTx', async () => {
      const { commands, repo } = setupTodolistMocks();
      const { fakeTx, transactor } = createMockTransactor();

      await runWithTx(transactor, async (outerTx) => {
        expect(getCurrentTx()).toBe(outerTx);
        await commands.createSingle(1, { title: 'First' });
        await commands.createBulk(1, [{ title: 'Second' }]);
      });

      expect(transactor.execInTransaction).toHaveBeenCalledTimes(1);
      expect(repo.createMany).toHaveBeenNthCalledWith(1, 1, [{ title: 'First' }], fakeTx);
      expect(repo.createMany).toHaveBeenNthCalledWith(2, 1, [{ title: 'Second' }], fakeTx);
    });
  });

  describe('TodoCommands', () => {
    function setupTodoMocks() {
      const repo: TodoRepository = {
        findAll: vi.fn(async () => ({ items: [], totalItems: 0 })),
        findById: vi.fn(async () => null),
        createMany: vi.fn(async (userId, items) =>
          items.map(
            (item, idx): Todo => ({
              id: idx + 1,
              userId,
              message: item.message,
              check: item.check ?? false,
              createdAt: '2026-11-18T00:00:00.000Z',
              updatedAt: '2026-11-18T00:00:00.000Z',
            }),
          ),
        ),
        updateMany: vi.fn(async (userId, items) =>
          items.map(
            (item): Todo => ({
              id: item.id,
              userId,
              message: item.message ?? 'Existing',
              check: item.check ?? false,
              createdAt: '2026-11-18T00:00:00.000Z',
              updatedAt: '2026-11-18T00:00:00.000Z',
            }),
          ),
        ),
        deleteMany: vi.fn(async (_userId, ids) => ids.length),
      };
      const commands = new TodoCommands(repo);
      return { repo, commands };
    }

    it('defaults check to false and trims messages on create', async () => {
      const { commands, repo } = setupTodoMocks();
      const { fakeTx, transactor } = createMockTransactor();

      const todo = await runWithTx(transactor, () =>
        commands.createSingle(2, { message: '  Buy milk  ' }),
      );
      expect(todo.check).toBe(false);
      expect(repo.createMany).toHaveBeenCalledWith(
        2,
        [{ message: 'Buy milk', check: false }],
        fakeTx,
      );
    });

    it('validates partial updates and requires at least one of message or check', async () => {
      const { commands, repo } = setupTodoMocks();

      await expect(commands.updateSingle(1, { id: 1 })).rejects.toThrow(ValidationError);
      await expect(commands.updateSingle(1, { id: 1, message: '  ' })).rejects.toThrow(
        ValidationError,
      );
      await expect(commands.updateSingle(1, { id: -1, check: true })).rejects.toThrow(
        ValidationError,
      );
      await expect(commands.createBulk(1, [])).rejects.toThrow(ValidationError);
      await expect(commands.deleteMany(1, [])).rejects.toThrow(ValidationError);

      await commands.updateBulk(1, [
        { id: 1, check: true },
        { id: 2, message: '  Clean code  ' },
      ]);
      expect(repo.updateMany).toHaveBeenCalledWith(
        1,
        [
          { id: 1, check: true },
          { id: 2, message: 'Clean code' },
        ],
        undefined,
      );
    });

    it('throws NotFoundError when deleteById deletes 0 rows', async () => {
      const { commands, repo } = setupTodoMocks();
      vi.mocked(repo.deleteMany).mockResolvedValueOnce(0);
      await expect(commands.deleteById(1, 123)).rejects.toThrow(NotFoundError);
    });
  });
});
