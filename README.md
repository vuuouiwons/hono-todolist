# Hono Todolist Backend — Pragmatic Layered Architecture

A **Hono** + **TypeScript** + **Sequelize ORM (SQLite)** backend implementing 100% of [`openapi.json`](./openapi.json), structured around the **Pragmatic 3-Layer Architecture** defined in [`AGENTS.md`](./AGENTS.md) and showcasing what Hono and its complementary ecosystem are capable of.

---

## Architecture (`AGENTS.md`)

Instead of dogmatic 4-layer Clean/Hexagonal boilerplate, the codebase is split into **three clean layers** where dependencies flow strictly **inward** toward `Application`:

```text
API Layer (src/api) ──▶ Application Layer (src/application) ◀── Infrastructure Layer (src/infrastructure)
```

- **`src/application/` (Core)** — Zero dependencies on `api` or `infrastructure`.
  - [models.ts](src/application/models.ts) & [errors.ts](src/application/errors.ts): Core models (`User`, `Todolist`, `Todo`, `Pagination`) and application errors (`ValidationError`, `UnauthorizedError`, `NotFoundError`, `ConflictError`).
  - [ports.ts](src/application/ports.ts), [validation.ts](src/application/validation.ts) & [transactional.ts](src/application/transactional.ts): Infrastructure interfaces (`Transactor`, `Tx`, `UserRepository`, `TodolistRepository`, `TodoRepository`, `PasswordHasher`, `TokenService`), Zod schemas (`parseOrThrow`), plus `AsyncLocalStorage` transaction propagation helpers (`runWithTx`, `bindTx`, `getCurrentTx`).
  - **Lightweight CQRS**:
    - **Commands** (`src/application/commands/`): Handle writes, Zod validation, and ambient transaction propagation via `getCurrentTx()`.
    - **Queries** (`src/application/queries/`): Read retrieval using **Sequelize ORM abstraction** (`findAndCountAll`, `findOne`) via `TodolistRepository` and `TodoRepository` (zero raw SQL).
- **`src/infrastructure/` (Thin Anti-Corruption Layer)**
  - [database.ts](src/infrastructure/database.ts): Sequelize (SQLite) setup, `SequelizeTransactor`, and `normalizeTimestamp`.
  - [repositories.ts](src/infrastructure/repositories.ts): `SequelizeUserRepository`, `SequelizeTodolistRepository`, and `SequelizeTodoRepository` reusing `Application` models directly (minimal mapper tax).
  - [security.ts](src/infrastructure/security.ts): `ScryptPasswordHasher` (`node:crypto`) and `HonoJwtTokenService` (`hono/jwt`).
- **`src/api/` (Protocol Boundary & Mandatory DTO Mapper)**
  - [dtos.ts](src/api/dtos.ts): Explicit Zod OpenAPI Request & Response DTO schemas.
  - [mappers.ts](src/api/mappers.ts): Mandatory explicit mappers (e.g., `toUserResponseDTO` explicitly maps fields so sensitive data like `passwordHash` can never leak).
  - [middlewares.ts](src/api/middlewares.ts) & `src/api/routes/`: Hono routes invoking only `Application` Commands and Queries (never `Infrastructure` repositories), plus `createTransactionMiddleware` wrapping mutating HTTP requests (`POST`, `PATCH`, `PUT`, `DELETE`) in request-scoped transactions with automatic rollback on `>= 400` responses or errors.
- **`src/container.ts`**: Composition root wiring `Infrastructure` adapters into `Application` Commands & Queries.

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

## Testing Pyramid (`AGENTS.md` Section 3)

- **Unit Tests** (`tests/unit/commands.test.ts`): Fast, DB-free tests for `AuthCommands`, `TodolistCommands`, and `TodoCommands` using mocked repositories and `runWithTx`.
- **Integration Tests** (`tests/integration/queries-and-repos.test.ts`): Isolated `:memory:` SQLite Sequelize tests verifying `TodolistQueries`/`TodoQueries` and Sequelize ORM repository methods (`findAndCountAll`, `findOne`, `bulkCreate`, `update`, `destroy`), boolean/date mapping, and `SequelizeTransactor` rollbacks.
- **E2E Smoke Tests** (`tests/e2e/api.test.ts`): Critical-path API tests, DTO security boundary checks, Hono middleware behaviors, OpenAPI/Scalar/Swagger endpoints, and `hc<AppType>` RPC.

---

## Commands (`pnpm`)

```bash
pnpm install        # Install dependencies
pnpm dev            # Run dev server with hot reload on port 8080
pnpm run typecheck  # Type-check all TypeScript sources
pnpm run build      # Compile to dist/
pnpm test           # Run Unit, Integration, and E2E test suites
pnpm start          # Run compiled server
```
