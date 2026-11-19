# Hono Todolist Backend — Pragmatic 3-Layer Architecture

A **Hono** + **TypeScript** + **Sequelize ORM (SQLite)** backend implementing 100% of [`openapi.json`](./openapi.json), structured around the **Pragmatic 3-Layer Architecture** defined in [`AGENTS.md`](./AGENTS.md) and showcasing what Hono and its ecosystem are capable of.

---

## Architecture (`AGENTS.md`)

`Inbound Interface (HTTP)` ➔ `Routes (src/routes/)` ➔ `Services (src/services/)` ➔ `Data Access (src/db/)`

```text
src/
├── routes/        # Transport layer, Zod OpenAPI validation, auth/tx middleware, safe response shaping
├── services/      # Business logic, workflows, and ACID transaction orchestration (zero HTTP imports)
├── db/            # Sequelize connection, AsyncLocalStorage CLS, ORM models, and reusable repositories/
├── utils/         # Stateless helpers (scrypt & JWT auth, custom errors, pagination)
├── app.ts         # Hono app assembly & OpenAPI/Scalar/Swagger documentation
├── client.ts      # Hono RPC client (hc<AppType>)
└── index.ts       # Node server entrypoint (@hono/node-server)
```

Key principles enforced:
- **Direct Module Imports**: No DI containers, no generic `IRepository` interfaces, and no duplicate DTO/Domain/Entity layers.
- **Boundary Security Rule**: Controllers in `src/routes/` explicitly shape outbound payloads (`shapeUser`, `shapeTodolist`, `shapeTodo`) so sensitive fields like `passwordHash` are never exposed.
- **Shared ORM Types**: `src/services/` reuses Sequelize-inferred `UserAttributes`, `TodolistAttributes`, and `TodoAttributes` directly from `src/db/`.
- **CLS-Backed Transactions**: `src/db/` hooks `Sequelize.useCLS` to Node's `AsyncLocalStorage`, so `transactionMiddleware` (for mutating HTTP requests) and `withTransaction()` automatically share transactions across all Sequelize calls.

---

## What Hono Is Capable Of (Showcased Here)

1. **Schema-First OpenAPI + Validation (`@hono/zod-openapi`)**: `OpenAPIHono` + `createRoute()` validates requests, infers `c.req.valid()` types, checks `c.json(payload, status)` types, and generates a live OpenAPI 3.0.3 document at `GET /openapi.json`.
2. **Interactive API Docs**: Scalar API Reference (`GET /docs` via `@scalar/hono-api-reference`), Swagger UI (`GET /swagger` via `@hono/swagger-ui`), and the original spec (`GET /openapi-spec.json`).
3. **Zero-Codegen Type-Safe RPC (`hono/client`)**: `AppType` in [src/app.ts](src/app.ts) powers `hc<AppType>()` in [src/client.ts](src/client.ts) for end-to-end typed requests and responses.
4. **Batteries-Included Built-in Middlewares**:
   - `hono/jwt` (`HS256` token sign/verify) + `hono/factory` (`createMiddleware`)
   - `hono/request-id` (`X-Request-Id`), `hono/timing` (`Server-Timing`), `hono/context-storage` (`getContext()`)
   - `hono/etag` (`304 Not Modified`), `hono/pretty-json` (`?pretty`), `hono/cors`, `hono/secure-headers`, `hono/logger`
5. **Web Standard Zero-Socket Testing (`app.request()`) & Runtime Portability**: Runs on Node.js via `@hono/node-server` in [src/index.ts](src/index.ts) and tests full request lifecycles directly via `app.request()`.

---

## Commands (`pnpm`)

```bash
pnpm install        # Install dependencies
pnpm dev            # Run dev server with hot reload on port 8080
pnpm run typecheck  # Type-check all TypeScript sources
pnpm run build      # Compile to dist/
pnpm test           # Run integration and unit tests
pnpm start          # Run compiled server
```
