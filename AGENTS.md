# AGENTS.md

## Architecture Overview
This repository follows a **Pragmatic 3-Layer Architecture** designed for high engineering velocity, clarity, and minimal boilerplate.

**Data & Dependency Flow:**
`Inbound Interface (HTTP / CLI / Events)` ➔ `Controllers / Handlers` ➔ `Services` ➔ `Data Access (DB / ORM)`

Do NOT introduce Clean Architecture, Hexagonal Architecture, Domain-Driven Design (DDD) aggregates, or multi-layer DTO mappers unless explicitly instructed.

---

## Directory Structure
```text
src/
├── routes/        # (or controllers/handlers) Transport layer, input validation, response shaping
├── services/      # Core business logic, workflows, and external integrations
├── db/            # Database connection, schema/models, and reusable complex queries
└── utils/         # Stateless helpers (auth, formatting, logging, custom errors)
```

---

## Layer Responsibilities & Rules

### 1. Routes / Controllers Layer (`src/routes/` or `src/controllers/`)
- **Allowed:** Parse incoming requests, validate inputs (params, query, payload), enforce authentication/authorization, invoke services (or data access directly for trivial CRUD), and serialize responses.
- **Forbidden:** Business rules, domain calculations, or multi-step orchestration.
- **Boundary Security Rule:** Never expose raw database/ORM records directly in outbound responses if they contain sensitive or internal fields (e.g., `passwordHash`, internal tokens). Explicitly pick or shape the response payload at the controller boundary.

### 2. Services Layer (`src/services/`)
- **Allowed:** All business logic, domain rules, state mutations, database transactions, and calls to external APIs or third-party providers.
- **Forbidden:** Importing transport/framework primitives (e.g., HTTP `Request`/`Response` objects, status codes, CLI context). Services must accept plain typed arguments and return plain data or throw domain/application errors.
- **Flat Composition:** Avoid deep chains of services calling other services. When multiple services require shared logic, extract a stateless helper or shared internal function.

### 3. Data Access Layer (`src/db/`)
- **Allowed:** Direct use of the project's ORM, query builder, or database client.
- **Forbidden:** Creating generic repository interfaces (`IRepository`) or pass-through wrapper classes around standard queries. Use the database client/ORM directly.
- **Exception:** Extract a query into `src/db/queries/` only when it involves complex raw SQL or is reused across three or more distinct services.

---

## Pragmatic Shortcuts
- **Trivial CRUD Bypass:** If an operation performs a straightforward single-entity read or write with zero business logic, the controller/handler MAY query the database/ORM directly rather than creating a pass-through service function.
- **Shared Types:** Reuse schema-inferred or ORM-generated types across the `db` and `services` layers. Do not duplicate `Entity`, `DomainModel`, and `DTO` definitions for the same resource.

---

## Coding & Testing Conventions
- **Dependencies:** Prefer explicit, direct module imports over Dependency Injection (DI) containers, reflection, or heavy decorator frameworks.
- **Database Integrity:** Enforce data invariants at the database level using foreign keys, unique constraints, `NOT NULL` rules, and ACID transactions rather than duplicating defensive checks in application code.
- **Testing Strategy:** Favor fast integration tests against an isolated test database for endpoints and queries. Reserve unit tests for pure, logic-heavy service functions and edge cases.
- **Feature Scope:** Implementing a standard feature should require changes in at most three places:
  1. `src/db/` (schema or migration, if needed)
  2. `src/services/` (business logic, if non-trivial)
  3. `src/routes/` (endpoint, input validation, and safe response shaping)