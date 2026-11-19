```
# AGENTS.md — 3-Layer Architecture & Coding Conventions

## Project Overview
This codebase strictly enforces a **3-Layer Architecture** (`Presentation` -> `Business Logic` -> `Data Access`). All generated, refactored, or reviewed code must adhere to these architectural boundaries, naming conventions, and dependency rules.

---

## Directory Structure
Place all new files in their designated architectural layer:

```text
src/
├── presentation/       # Controllers, Routes, Middlewares, Request/Response DTOs
├── business/           # Services, Domain Models, Business Rules, Repository Interfaces
├── data/               # Repository Implementations, ORM Entities, Mappers, Migrations
└── shared/             # Custom Domain Errors, Constants, Pure Utilities
```

---

## Strict Architectural & Dependency Rules
1. **Unidirectional Dependency Flow:** Dependencies must only point downward: `Presentation` -> `Business` -> `Data`. Lower layers must **never** import from upper layers.
2. **No Layer Skipping:** Presentation components (Controllers/Handlers) must **never** call Data Access components (Repositories/ORMs) directly, even for simple CRUD lookups. Always route through a Business Service.
3. **No Cross-Layer Model Leakage:**
   - **Data Layer** operates on ORM/Database entities and maps them to Domain Models before returning.
   - **Business Layer** operates exclusively on Domain Models and primitives.
   - **Presentation Layer** accepts Request DTOs and returns Response DTOs. Never expose database entities directly in API responses.
4. **Dependency Inversion:** Business Services must depend on Repository interfaces defined in the Business layer (e.g., `IUserRepository`), never concrete Data layer classes.

---

## Layer-Specific Coding Conventions

### 1. Presentation Layer (`src/presentation/`)
* **Naming:** `[Entity]Controller.[ext]`, `[Entity]Routes.[ext]`, `[Action][Entity]Request.[ext]`, `[Entity]Response.[ext]`.
* **Responsibilities:** Parse and validate incoming request payloads, invoke a single Business Service method, map the returned Domain Model to a Response DTO, and return the appropriate HTTP status code.
* **Constraints:**
  - Keep controller methods thin (ideally under 20 lines).
  - **Forbidden:** Business logic, conditional domain rules, direct database/ORM calls.

### 2. Business Logic Layer (`src/business/`)
* **Naming:** `[Entity]Service.[ext]`, `[Workflow]UseCase.[ext]`, `[Entity].[ext]` (Domain Model), `I[Entity]Repository.[ext]`.
* **Responsibilities:** Execute core business rules, calculations, multi-step workflows, and orchestrate calls across multiple repositories.
* **Error Handling:** Throw domain-specific errors from `src/shared/errors` (e.g., `ConflictError`, `NotFoundError`, `ValidationError`). Let Presentation middleware translate these into HTTP status codes.
* **Constraints:**
  - **Forbidden:** HTTP-specific objects (`req`, `res`, headers, HTTP status codes) or database-specific imports (SQL queries, ORM decorators/clients).

### 3. Data Access Layer (`src/data/`)
* **Naming:** `[Entity]Repository.[ext]`, `[Entity]Entity.[ext]` (ORM model), `[Entity]Mapper.[ext]`.
* **Responsibilities:** Encapsulate all database queries, ORM operations, caching, and external storage calls. Convert raw database records into Domain Models via Mappers before returning.
* **Constraints:**
  - **Forbidden:** Business validation or domain decision-making (e.g., checking user permissions or account eligibility inside SQL/ORM queries).

---

## Agent Workflow & Verification Checklist
Before finalizing any code changes, verify the following:
- [ ] Are imports strictly flowing downward (`presentation` -> `business` -> `data`)?
- [ ] Are all database queries isolated inside `src/data/`?
- [ ] Are all HTTP status codes and `req`/`res` objects isolated inside `src/presentation/`?
- [ ] Are DTOs used at API boundaries instead of raw database entities?
- [ ] Do new Services inject Repository interfaces rather than concrete classes?
```