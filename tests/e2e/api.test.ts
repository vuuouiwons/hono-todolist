import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransactionMiddleware, globalErrorHandler, type AppEnv } from '../../src/api/middlewares.js';
import { AppError } from '../../src/application/errors.js';
import { createApp, type AppType } from '../../src/app.js';
import { createTodoApiClient, runRpcDemo } from '../../src/client.js';
import { createContainer, type AppContainer } from '../../src/container.js';

describe('E2E Smoke Tests: Hono API, DTO Security Boundary & Capabilities', () => {
  let container: AppContainer;
  let app: AppType;

  beforeEach(async () => {
    container = await createContainer({
      dbStorage: ':memory:',
      jwtSecret: 'e2e-test-secret',
    });
    app = createApp(container, { enableLogger: false });
  });

  afterEach(async () => {
    await container.close();
  });

  async function registerAndLogin(email = 'alice@example.com', password = 'password123') {
    const regRes = await app.request('/api/v1/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(regRes.status).toBe(201);
    const regBody = (await regRes.json()) as { data: Record<string, unknown> };
    // Enforce API DTO security boundary: internal fields must never leak
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
      headers: {
        Authorization: `Bearer ${loginBody.token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  it('executes full Auth + Todolist & Todo CRUD critical path (single & bulk)', async () => {
    const { headers } = await registerAndLogin();

    // Missing/invalid auth -> 401
    expect((await app.request('/api/v1/todolist')).status).toBe(401);
    expect(
      (
        await app.request('/api/v1/todo', {
          headers: { Authorization: 'Bearer invalid.token' },
        })
      ).status,
    ).toBe(401);

    // Todolist single + bulk ({ items }) + URL patch + body delete
    const createListRes = await app.request('/api/v1/todolist', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: [{ title: 'Work' }, { title: 'Personal' }] }),
    });
    expect(createListRes.status).toBe(201);
    const lists = ((await createListRes.json()) as { data: Array<{ id: number }> }).data;

    const patchListRes = await app.request(`/api/v1/todolist/${lists[0].id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ title: 'Work Updated' }),
    });
    expect(patchListRes.status).toBe(200);

    const getListRes = await app.request('/api/v1/todolist?search=Updated', { headers });
    expect(getListRes.status).toBe(200);
    expect(((await getListRes.json()) as { pagination: { totalItems: number } }).pagination.totalItems).toBe(
      1,
    );

    const delListRes = await app.request('/api/v1/todolist', {
      method: 'DELETE',
      headers,
      body: JSON.stringify([lists[0].id, lists[1].id]),
    });
    expect(delListRes.status).toBe(200);
    expect(await delListRes.json()).toMatchObject({ deletedCount: 2 });

    // Todo single + bulk + check=false filter + body bulk patch + delete
    const createTodoRes = await app.request('/api/v1/todo', {
      method: 'POST',
      headers,
      body: JSON.stringify([
        { message: 'Buy milk', check: false },
        { message: 'Ship code', check: true },
      ]),
    });
    expect(createTodoRes.status).toBe(201);
    const todos = ((await createTodoRes.json()) as { data: Array<{ id: number }> }).data;

    const uncheckedRes = await app.request('/api/v1/todo?check=false', { headers });
    expect(uncheckedRes.status).toBe(200);
    expect(((await uncheckedRes.json()) as { data: Array<{ message: string }> }).data).toHaveLength(
      1,
    );

    const bulkPatchRes = await app.request('/api/v1/todo', {
      method: 'PATCH',
      headers,
      body: JSON.stringify([{ id: todos[0].id, check: true }]),
    });
    expect(bulkPatchRes.status).toBe(200);

    const delTodoRes = await app.request(`/api/v1/todo/${todos[0].id}`, {
      method: 'DELETE',
      headers,
    });
    expect(delTodoRes.status).toBe(200);
  });

  it('exercises Hono middlewares, OpenAPI/Scalar/Swagger docs, and hc<AppType> RPC client', async () => {
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
      body: JSON.stringify({ message: 'ETag item' }),
    });

    const prettyRes = await app.request('/api/v1/todo?pretty', { headers });
    expect(prettyRes.status).toBe(200);
    expect(prettyRes.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(prettyRes.headers.get('Server-Timing')).toContain('handler');
    const etag = prettyRes.headers.get('ETag')!;
    expect(etag).toBeTruthy();
    expect(await prettyRes.text()).toContain('\n  "data"');

    const notModifiedRes = await app.request('/api/v1/todo?pretty', {
      headers: { ...headers, 'If-None-Match': etag },
    });
    expect(notModifiedRes.status).toBe(304);

    // OpenAPI + Docs UIs
    const openApiRes = await app.request('/openapi.json');
    expect(openApiRes.status).toBe(200);
    const spec = (await openApiRes.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.paths['/api/v1/todolist']).toBeDefined();
    expect(spec.paths['/api/v1/todo']).toBeDefined();

    expect((await app.request('/openapi-spec.json')).status).toBe(200);
    expect((await app.request('/docs')).status).toBe(200);
    expect((await app.request('/swagger')).status).toBe(200);

    // End-to-end typed Hono RPC
    const client = createTodoApiClient('http://localhost', (input, init) =>
      app.request(input, init),
    );
    const demo = await runRpcDemo(client);
    expect(demo.user.email).toBe('rpc-demo@example.com');
    expect(demo.todos?.pagination.totalItems).toBe(1);
  });

  it('wraps mutating HTTP requests in Hono transactionMiddleware and rolls back on error responses', async () => {
    const { headers } = await registerAndLogin();
    const txSpy = vi.spyOn(container.transactor, 'execInTransaction');

    // GET requests do not open a transaction
    const listBefore = await app.request('/api/v1/todo', { headers });
    expect(listBefore.status).toBe(200);
    expect(txSpy).not.toHaveBeenCalled();

    // Mutating POST opens exactly 1 request-scoped transaction shared via AsyncLocalStorage
    const createdRes = await app.request('/api/v1/todo', {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: 'Committed Todo' }),
    });
    expect(createdRes.status).toBe(201);
    expect(txSpy).toHaveBeenCalledTimes(1);

    // Mount a failing mutating route sharing the same middleware & commands to prove full rollback
    const rollbackProbeApp = new Hono<AppEnv>();
    rollbackProbeApp.onError(globalErrorHandler);
    rollbackProbeApp.use('*', createTransactionMiddleware(container.transactor));
    rollbackProbeApp.post('/mutate-then-fail', async (c) => {
      expect(c.get('tx')).toBeDefined();
      await container.commands.todo.createSingle(1, { message: 'Should Be Rolled Back' });
      throw new AppError('Simulated failure after write', 400);
    });

    const failedRes = await rollbackProbeApp.request('/mutate-then-fail', { method: 'POST' });
    expect(failedRes.status).toBe(400);
    expect(await failedRes.json()).toEqual({ error: 'Simulated failure after write' });

    // Confirm the write before the thrown error was rolled back completely
    const listAfter = await app.request('/api/v1/todo', { headers });
    const bodyAfter = (await listAfter.json()) as { data: Array<{ message: string }> };
    expect(bodyAfter.data.map((t) => t.message)).toEqual(['Committed Todo']);
  });
});
