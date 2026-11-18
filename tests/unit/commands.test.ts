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
import { getCurrentTx, runWithTx } from '../../src/application/transactional.js';

function createMockTransactor() {
  const fakeTx: Tx = {};
  const transactor: Transactor = {
    execInTransaction: vi.fn(async (fn) => fn(fakeTx)),
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
      const { fakeTx, transactor } = createMockTransactor();
      const commands = new AuthCommands(users, passwordHasher, tokenService, transactor);
      return { users, passwordHasher, tokenService, transactor, fakeTx, commands };
    }

    it('normalizes email, hashes password, and creates user inside transaction', async () => {
      const { commands, users, passwordHasher, transactor, fakeTx } = setupAuthMocks();

      const created = await commands.register({
        email: '  Alice@Example.COM ',
        password: 'password123',
      });

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

    it('logs in valid user and throws UnauthorizedError on wrong email/password', async () => {
      const { commands, users } = setupAuthMocks();
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
      const { fakeTx, transactor } = createMockTransactor();
      const commands = new TodolistCommands(repo, transactor);
      return { repo, fakeTx, transactor, commands };
    }

    it('trims titles on createSingle/createBulk and executes inside Transactor', async () => {
      const { commands, repo, fakeTx, transactor } = setupTodolistMocks();

      const single = await commands.createSingle(1, { title: '  Groceries  ' });
      expect(single.title).toBe('Groceries');
      expect(transactor.execInTransaction).toHaveBeenCalledTimes(1);
      expect(repo.createMany).toHaveBeenCalledWith(1, [{ title: 'Groceries' }], fakeTx);

      const bulk = await commands.createBulk(1, [{ title: ' A ' }, { title: ' B ' }]);
      expect(bulk.map((b) => b.title)).toEqual(['A', 'B']);
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
      const { commands, repo, fakeTx } = setupTodolistMocks();
      vi.mocked(repo.deleteMany).mockResolvedValueOnce(0);

      await expect(commands.deleteById(1, 99)).rejects.toThrow(NotFoundError);

      vi.mocked(repo.deleteMany).mockResolvedValueOnce(2);
      const many = await commands.deleteMany(1, [5, 6, 5]);
      expect(repo.deleteMany).toHaveBeenLastCalledWith(1, [5, 6], fakeTx);
      expect(many).toEqual({ deletedCount: 2, requestedIDs: [5, 6, 5] });
    });

    it('enforces REQUIRED propagation when nested @Transactional() methods run in an active tx', async () => {
      const { commands, repo, fakeTx, transactor } = setupTodolistMocks();

      await runWithTx(transactor, async (outerTx) => {
        expect(getCurrentTx()).toBe(outerTx);
        await commands.createSingle(1, { title: 'First' });
        await commands.createBulk(1, [{ title: 'Second' }]);
      });

      // Outer runWithTx opened 1 transaction; nested @Transactional() methods joined it
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
      const { fakeTx, transactor } = createMockTransactor();
      const commands = new TodoCommands(repo, transactor);
      return { repo, fakeTx, transactor, commands };
    }

    it('defaults check to false and trims messages on create', async () => {
      const { commands, repo, fakeTx } = setupTodoMocks();

      const todo = await commands.createSingle(2, { message: '  Buy milk  ' });
      expect(todo.check).toBe(false);
      expect(repo.createMany).toHaveBeenCalledWith(
        2,
        [{ message: 'Buy milk', check: false }],
        fakeTx,
      );
    });

    it('validates partial updates and requires at least one of message or check', async () => {
      const { commands, repo, fakeTx } = setupTodoMocks();

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
        fakeTx,
      );
    });

    it('throws NotFoundError when deleteById deletes 0 rows', async () => {
      const { commands, repo } = setupTodoMocks();
      vi.mocked(repo.deleteMany).mockResolvedValueOnce(0);
      await expect(commands.deleteById(1, 123)).rejects.toThrow(NotFoundError);
    });
  });
});
