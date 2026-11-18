import { hc } from 'hono/client';
import type { AppType } from './app.js';

export type TodoApiRpcClient = ReturnType<typeof hc<AppType>>;

export function createTodoApiClient(
  baseUrl: string,
  customFetch?: typeof fetch,
): TodoApiRpcClient {
  return hc<AppType>(baseUrl, {
    ...(customFetch ? { fetch: customFetch } : {}),
  });
}

/**
 * Example end-to-end typed Hono RPC workflow.
 * All paths, query parameters, request bodies, and response types are
 * inferred directly from `AppType` without code generation.
 */
export async function runRpcDemo(client: TodoApiRpcClient) {
  const registerRes = await client.api.v1.register.$post({
    json: {
      email: 'rpc-demo@example.com',
      password: 'securepassword123',
    },
  });

  if (registerRes.status !== 201) {
    throw new Error(`Registration failed with status ${registerRes.status}`);
  }

  const loginRes = await client.api.v1.login.$post({
    json: {
      email: 'rpc-demo@example.com',
      password: 'securepassword123',
    },
  });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }

  const loginBody = await loginRes.json();
  const authHeaders = {
    Authorization: `Bearer ${loginBody.token}`,
  };

  const createdTodoRes = await client.api.v1.todo.$post(
    {
      json: {
        message: 'Explore Hono RPC type safety',
        check: false,
      },
    },
    { headers: authHeaders },
  );

  const listRes = await client.api.v1.todo.$get(
    {
      query: { page: '1', limit: '10' },
    },
    { headers: authHeaders },
  );

  return {
    user: loginBody.data,
    createdTodo: createdTodoRes.status === 201 ? await createdTodoRes.json() : null,
    todos: listRes.status === 200 ? await listRes.json() : null,
  };
}
