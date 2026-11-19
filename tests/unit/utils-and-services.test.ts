import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createTodos,
  deleteTodos,
  listTodos,
  updateTodos,
} from '../../src/business/index.js';
import {
  createTodolists,
  deleteTodolists,
  listTodolists,
  updateTodolists,
} from '../../src/business/index.js';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../../src/shared/auth.js';
import { UnauthorizedError, ValidationError, formatZodIssues } from '../../src/shared/errors.js';
import { createPagination } from '../../src/shared/pagination.js';

describe('Unit Tests: Stateless Utils & Service Validation', () => {
  it('computes pagination metadata accurately for empty, first, middle, and last pages', () => {
    expect(createPagination(1, 10, 0)).toEqual({
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });

    expect(createPagination(1, 10, 25)).toEqual({
      page: 1,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });

    expect(createPagination(2, 10, 25)).toEqual({
      page: 2,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });

    expect(createPagination(3, 10, 25)).toEqual({
      page: 3,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      hasNext: false,
      hasPrev: true,
    });
  });

  it('hashes and verifies passwords with scrypt and timingSafeEqual', async () => {
    const hash = await hashPassword('super-secret-123');
    expect(hash).toContain(':');
    expect(await verifyPassword('super-secret-123', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
    expect(await verifyPassword('super-secret-123', 'malformed-hash')).toBe(false);
  });

  it('signs and verifies HS256 JWT tokens and rejects invalid tokens', async () => {
    const secret = 'unit-test-jwt-secret';
    const token = await signToken({ sub: 42, email: 'user@example.com' }, { secret, ttlSeconds: 60 });
    const payload = await verifyToken(token, secret);
    expect(payload).toEqual({ sub: 42, email: 'user@example.com' });

    await expect(verifyToken(token, 'wrong-secret')).rejects.toThrow(UnauthorizedError);
    await expect(verifyToken('invalid.jwt', secret)).rejects.toThrow(UnauthorizedError);
  });

  it('formats ZodError issues concisely', () => {
    const schema = z.object({ title: z.string().min(3, 'too short') });
    const parsed = schema.safeParse({ title: 'a' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(formatZodIssues(parsed.error)).toBe('title: too short');
    }
  });

  it('enforces validation rules on Todolist and Todo service inputs before hitting DB', async () => {
    await expect(listTodolists({ userId: 1, page: 0 })).rejects.toThrow(ValidationError);
    await expect(listTodolists({ userId: 1, limit: 101 })).rejects.toThrow(ValidationError);
    await expect(createTodolists(1, [])).rejects.toThrow(ValidationError);
    await expect(createTodolists(1, [{ title: '   ' }])).rejects.toThrow(ValidationError);
    await expect(updateTodolists(1, [])).rejects.toThrow(ValidationError);
    await expect(updateTodolists(1, [{ id: 0, title: 'Ok' }])).rejects.toThrow(ValidationError);
    await expect(updateTodolists(1, [{ id: 1, title: '   ' }])).rejects.toThrow(ValidationError);
    await expect(deleteTodolists(1, [])).rejects.toThrow(ValidationError);

    await expect(listTodos({ userId: 1, page: -1 })).rejects.toThrow(ValidationError);
    await expect(listTodos({ userId: 1, limit: 0 })).rejects.toThrow(ValidationError);
    await expect(createTodos(1, [])).rejects.toThrow(ValidationError);
    await expect(createTodos(1, [{ message: '   ' }])).rejects.toThrow(ValidationError);
    await expect(updateTodos(1, [])).rejects.toThrow(ValidationError);
    await expect(updateTodos(1, [{ id: 0, check: true }])).rejects.toThrow(ValidationError);
    await expect(updateTodos(1, [{ id: 1 }])).rejects.toThrow(ValidationError);
    await expect(updateTodos(1, [{ id: 1, message: '   ' }])).rejects.toThrow(ValidationError);
    await expect(deleteTodos(1, [])).rejects.toThrow(ValidationError);
  });
});
