import { Hono } from 'hono';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, type AppType } from '../../src/app.js';
import { createTodoApiClient, runRpcDemo } from '../../src/client.js';
import { closeDb, getCurrentTransaction, getSequelize, initDb, resetDb } from '../../src/db/index.js';
import {
  globalErrorHandler,
  transactionMiddleware,
  type AppEnv,
} from '../../src/routes/middlewares.js';
import { createTodos } from '../../src/services/todo.service.js';
import { AppError } from '../../src/utils/errors.js';

describe('Integration Tests: Hono 3-Layer Todo API (Isolated SQLite)', () => {
  let app: AppType;

  beforeAll(async () => {
    await initDb({ storage: ':memory:' });
    app = createApp({ enableLogger: false });
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  async function registerAndLogin(email = 'alice@example.com', password = 'password123') {
    const regRes = await app.request('/api/v1/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(regRes.status).toBe(201);
    const regBody = (await regRes.json()) as { data: Record<string, unknown> };
    expect(regBody.data.passwordHash).toBeUndefined();

    const loginRes = await app.request('/api/v1/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as {
      token: string;
      data: Record<string, unknown>;
    };
    expect(loginBody.data.passwordHash).toBeUndefined();

    return {
      token: loginBody.token,
      user: loginBody.data,
      headers: {
        Authorization: `Bearer ${loginBody.token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  describe('Auth & Security Boundary', () => {
    it('registers user, rejects duplicate emails (409), and validates payloads (400)', async () => {
      const { user } = await registerAndLogin('User@Example.com', 'securepassword123');
      expect(user.email).toBe('user@example.com');

      const dupRes = await app.request('/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com', password: 'securepassword123' }),
      });
      expect(dupRes.status).toBe(409);
      expect(await dupRes.json()).toEqual({ error: 'Email already exists' });

      const badRes = await app.request('/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad-email', password: '123' }),
      });
      expect(badRes.status).toBe(400);

      const malformedRes = await app.request('/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid-json',
      });
      expect(malformedRes.status).toBe(400);
    });

    it('rejects wrong login credentials (401) and protects routes with Bearer JWT', async () => {
      await registerAndLogin('bob@example.com', 'secret123');

      const wrongPass = await app.request('/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bob@example.com', password: 'wrongpassword' }),
      });
      expect(wrongPass.status).toBe(401);

      const unknownEmail = await app.request('/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@example.com', password: 'wrongpassword' }),
      });
      expect(unknownEmail.status).toBe(401);

      expect((await app.request('/api/v1/todolist')).status).toBe(401);
      expect(
        (await app.request('/api/v1/todo', { headers: { Authorization: 'Bearer bad.token' } })).status,
      ).toBe(401);
    });
  });

  describe('Todolist CRUD (Single & Bulk)', () => {
    it('supports single, array, and { items } creation, pagination, search, atomic patch, and all delete formats', async () => {
      const { headers } = await registerAndLogin();

      const s1 = await app.request('/api/v1/todolist', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'Groceries' }),
      });
      expect(s1.status).toBe(201);

      const b1 = await app.request('/api/v1/todolist', {
        method: 'POST',
        headers,
        body: JSON.stringify([{ title: 'Work Alpha' }, { title: 'Work Beta' }]),
      });
      expect(b1.status).toBe(201);

      const b2 = await app.request('/api/v1/todolist', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: [{ title: 'Fitness' }, { title: 'Reading' }] }),
      });
      expect(b2.status).toBe(201);

      const listPage1 = await app.request('/api/v1/todolist?page=1&limit=2', { headers });
      expect(listPage1.status).toBe(200);
      const page1Body = (await listPage1.json()) as {
        data: Array<{ id: number; title: string }>;
        pagination: { totalItems: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
      };
      expect(page1Body.data).toHaveLength(2);
      expect(page1Body.pagination).toMatchObject({
        totalItems: 5,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });

      const searchRes = await app.request('/api/v1/todolist?search=Work', { headers });
      expect(searchRes.status).toBe(200);
      const searchBody = (await searchRes.json()) as { data: Array<{ id: number; title: string }> };
      expect(searchBody.data.map((item) => item.title)).toEqual(['Work Alpha', 'Work Beta']);

      // Get by ID & URL patch
      const firstId = page1Body.data[0].id;
      const secondId = page1Body.data[1].id;
      expect((await app.request(`/api/v1/todolist/${firstId}`, { headers })).status).toBe(200);
      expect((await app.request('/api/v1/todolist/99999', { headers })).status).toBe(404);
      expect((await app.request('/api/v1/todolist/abc', { headers })).status).toBe(400);

      const urlPatchRes = await app.request(`/api/v1/todolist/${firstId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title: 'Groceries Updated' }),
      });
      expect(urlPatchRes.status).toBe(200);

      // Atomic bulk patch rollback when one ID is missing
      const atomicFail = await app.request('/api/v1/todolist', {
        method: 'PATCH',
        headers,
        body: JSON.stringify([
          { id: firstId, title: 'Should Rollback' },
          { id: 99999, title: 'Missing' },
        ]),
      });
      expect(atomicFail.status).toBe(404);

      const verifyRollback = await app.request(`/api/v1/todolist/${firstId}`, { headers });
      expect(((await verifyRollback.json()) as { data: { title: string } }).data.title).toBe(
        'Groceries Updated',
      );

      // Delete by URL ID and all 3 body formats
      expect(
        (await app.request(`/api/v1/todolist/${firstId}`, { method: 'DELETE', headers })).status,
      ).toBe(200);

      const delBodyObj = await app.request('/api/v1/todolist', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: secondId }),
      });
      expect(await delBodyObj.json()).toMatchObject({ deletedCount: 1, requestedIDs: [secondId] });

      const remainingIds = searchBody.data.map((d) => d.id).filter((id) => id !== secondId);
      const delBodyArr = await app.request('/api/v1/todolist', {
        method: 'DELETE',
        headers,
        body: JSON.stringify(remainingIds),
      });
      expect(await delBodyArr.json()).toMatchObject({ deletedCount: remainingIds.length });
    });
  });

  describe('Todo CRUD & User Isolation', () => {
    it('filters check=true/false accurately, supports bulk patch/delete, and isolates users', async () => {
      const alice = await registerAndLogin('alice@example.com', 'password123');
      const bob = await registerAndLogin('bob@example.com', 'password123');

      const single = await app.request('/api/v1/todo', {
        method: 'POST',
        headers: alice.headers,
        body: JSON.stringify({ message: 'Buy milk' }),
      });
      expect(single.status).toBe(201);
      const singleId = ((await single.json()) as { data: { id: number; check: boolean } }).data.id;

      const bulk = await app.request('/api/v1/todo', {
        method: 'POST',
        headers: alice.headers,
        body: JSON.stringify([
          { message: 'Buy bread', check: false },
          { message: 'Review PR', check: true },
        ]),
      });
      expect(bulk.status).toBe(201);
      const bulkIds = ((await bulk.json()) as { data: Array<{ id: number }> }).data.map((t) => t.id);

      // check=false must NOT coerce to true
      const unchecked = await app.request('/api/v1/todo?check=false', { headers: alice.headers });
      const uncheckedBody = (await unchecked.json()) as {
        data: Array<{ check: boolean }>;
        pagination: { totalItems: number };
      };
      expect(uncheckedBody.pagination.totalItems).toBe(2);
      expect(uncheckedBody.data.every((t) => t.check === false)).toBe(true);

      const checked = await app.request('/api/v1/todo?check=true&search=Review', {
        headers: alice.headers,
      });
      expect(((await checked.json()) as { pagination: { totalItems: number } }).pagination.totalItems).toBe(
        1,
      );

      // Bob cannot read, update, or delete Alice's todo
      expect((await app.request(`/api/v1/todo/${singleId}`, { headers: bob.headers })).status).toBe(
        404,
      );
      expect(
        (
          await app.request(`/api/v1/todo/${singleId}`, {
            method: 'PATCH',
            headers: bob.headers,
            body: JSON.stringify({ check: true }),
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await app.request(`/api/v1/todo/${singleId}`, {
            method: 'DELETE',
            headers: bob.headers,
          })
        ).status,
      ).toBe(404);

      // Alice bulk patch & delete via { ids }
      const patchRes = await app.request('/api/v1/todo', {
        method: 'PATCH',
        headers: alice.headers,
        body: JSON.stringify([
          { id: bulkIds[0], check: true },
          { id: bulkIds[1], message: 'Review PR #2' },
        ]),
      });
      expect(patchRes.status).toBe(200);

      const delRes = await app.request('/api/v1/todo', {
        method: 'DELETE',
        headers: alice.headers,
        body: JSON.stringify({ ids: [singleId, ...bulkIds] }),
      });
      expect(await delRes.json()).toMatchObject({ deletedCount: 3 });
    });
  });

  describe('Hono Capabilities & Sequelize CLS Transaction Middleware', () => {
    it('propagates Sequelize CLS transactions from transactionMiddleware and rolls back on error', async () => {
      const { headers } = await registerAndLogin();
      const txSpy = vi.spyOn(getSequelize(), 'transaction');

      // GET requests skip transactions
      const getRes = await app.request('/api/v1/todo', { headers });
      expect(getRes.status).toBe(200);
      expect(txSpy).not.toHaveBeenCalled();

      // Mutating POST opens 1 transaction shared by Sequelize CLS across all queries
      const postRes = await app.request('/api/v1/todo', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: 'Committed Todo' }),
      });
      expect(postRes.status).toBe(201);
      expect(txSpy).toHaveBeenCalledTimes(1);
      txSpy.mockRestore();

      // Probe route: writes to DB via service, then fails -> middleware rolls back everything
      const probe = new Hono<AppEnv>();
      probe.onError(globalErrorHandler);
      probe.use('*', transactionMiddleware);
      probe.post('/fail-after-write', async (c) => {
        expect(c.get('tx')).toBeDefined();
        expect(getCurrentTransaction()).toBe(c.get('tx'));
        await createTodos(1, [{ message: 'Should Be Rolled Back' }]);
        throw new AppError('Simulated failure after write', 400);
      });

      const failRes = await probe.request('/fail-after-write', { method: 'POST' });
      expect(failRes.status).toBe(400);

      const afterRes = await app.request('/api/v1/todo', { headers });
      const afterBody = (await afterRes.json()) as { data: Array<{ message: string }> };
      expect(afterBody.data.map((t) => t.message)).toEqual(['Committed Todo']);
    });

    it('exposes Request-Id, Server-Timing, ContextStorage, PrettyJSON, ETag 304, OpenAPI docs & Hono RPC', async () => {
      const healthRes = await app.request('/health');
      expect(healthRes.status).toBe(200);
      const reqId = healthRes.headers.get('X-Request-Id');
      expect(reqId).toBeTruthy();
      expect(healthRes.headers.get('Server-Timing')).toBeTruthy();
      expect((await healthRes.json()) as { requestId: string }).toMatchObject({ requestId: reqId });

      const { headers } = await registerAndLogin();
      await app.request('/api/v1/todo', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: 'ETag test' }),
      });

      const prettyRes = await app.request('/api/v1/todo?pretty', { headers });
      expect(prettyRes.status).toBe(200);
      expect(prettyRes.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(prettyRes.headers.get('Server-Timing')).toContain('handler');
      const etag = prettyRes.headers.get('ETag')!;
      expect(etag).toBeTruthy();
      expect(await prettyRes.text()).toContain('\n  "data"');

      const notModified = await app.request('/api/v1/todo?pretty', {
        headers: { ...headers, 'If-None-Match': etag },
      });
      expect(notModified.status).toBe(304);

      const openApi = (await (await app.request('/openapi.json')).json()) as {
        openapi: string;
        paths: Record<string, unknown>;
      };
      expect(openApi.openapi).toBe('3.0.3');
      expect(openApi.paths['/api/v1/todolist']).toBeDefined();
      expect(openApi.paths['/api/v1/todo']).toBeDefined();

      expect((await app.request('/openapi-spec.json')).status).toBe(200);
      expect((await app.request('/docs')).status).toBe(200);
      expect((await app.request('/swagger')).status).toBe(200);

      const client = createTodoApiClient('http://localhost', (input, init) =>
        app.request(input, init),
      );
      const demo = await runRpcDemo(client);
      expect(demo.user.email).toBe('rpc-demo@example.com');
      expect(demo.todos?.pagination.totalItems).toBe(1);
    });
  });
});
