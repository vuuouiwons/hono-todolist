# AGENTS.md — Pragmatic Layered Architecture Guidelines

This codebase follows a **Pragmatic Layered Architecture** balancing testability, clear ownership, and low cognitive overhead without Clean/Hexagonal Architecture dogma.

## 1. Core Architectural Structure

The system is divided into **three layers**:

1. **API Layer** (Outer): Protocol concerns (HTTP, gRPC, GraphQL, message queues, CLI).
2. **Application Layer** (Core): Business logic, domain/application types, commands, queries, and infrastructure interfaces.
3. **Infrastructure Layer** (Outer): Thin Anti-Corruption Layer (ACL) implementing application interfaces (databases, Pub/Sub, external APIs).

### Dependency & Call Flow Rules
* **Call Flow (Runtime):** `API` → `Application` → `Infrastructure`
* **Dependency Flow (Imports):** `API` → `Application` ← `Infrastructure`
* **Strict Rule:** Dependencies MUST flow **inward** toward the `Application` layer.
  * `API` and `Infrastructure` both import from `Application`.
  * `API` and `Infrastructure` MUST NEVER import each other.
  * `Application` MUST NEVER import `API` or `Infrastructure` packages.
  * Circular dependencies are strictly prohibited.

---

## 2. Layer-by-Layer Implementation Rules

### Application Layer (`internal/app` or `src/application`)
* **Ownership:** Defines all core data types/models and the interfaces required from infrastructure (e.g., `UserRepository`, `Transactor`, `Queryer`). Design interfaces around actual business needs and existing infrastructure capabilities—do not over-abstract for hypothetical database swaps.
* **Lightweight CQRS:** Separate state mutations from data reads:
  * **Commands:** Handle writes, validation, business rules, and transactions. Orchestrate infrastructure calls via interfaces.
  * **Queries:** Handle data retrieval.
* **SQL Placement & Pass-Through Avoidance:**
  * **Direct SQL in Application Queries is ALLOWED and PREFERRED** for non-reused reads (using a lightweight `Queryer` interface) to eliminate useless pass-through boilerplate.
  * Move queries to `Infrastructure` repositories **only when they need to be reused** across multiple application components.
  * Never expose `Infrastructure` repositories directly to the `API` layer; outside callers interact with `Application` exclusively via Commands and Queries.
* **Transactions:** Manage ACID transactions explicitly in Application Commands via a `Transactor` interface (e.g., `BeginTx` or `ExecInTransaction`) passed down into repository methods.

### Infrastructure Layer (`internal/infra` or `src/infrastructure`)
* **Thin Anti-Corruption Layer (ACL):** Keep business logic out of this layer. Focus strictly on database queries, external API clients, serialization, and enforcing strict types/naming conventions (e.g., UUIDs, Dates).
* **Type Reuse (Minimal Mapper Tax):** Do NOT create separate database entity/DAO structs by default. Reuse `Application` layer types directly. Only introduce separate infrastructure types or extended structs if serialization or schema complexity genuinely requires it.

### API Layer (`internal/api` or `src/api`)
* **Mandatory Mapper Tax (Security Boundary):** This is the **one place** where explicit DTOs and mapping are strictly enforced.
  * NEVER return `Application` domain types directly from API endpoints.
  * Always define explicit Request/Response DTOs and write explicit mapping functions/transformers—even in structurally typed languages (e.g., TypeScript)—to prevent accidental leakage of sensitive fields (such as `PasswordHash` or internal metadata).
* **CLI Exception:** Standard CLI commands should invoke `Application` Commands and Queries. One-off maintenance or emergency operational scripts may bypass the Application layer and talk to Infrastructure directly as a documented exception.

---

## 3. Testing Strategy (Test Pyramid)

Optimize for fast, reliable, deterministic tests:

* **Unit Tests (Majority — ~80–90% coverage target):**
  * Focus heavily on **Application Commands** (where business logic lives).
  * Mock out infrastructure interfaces (`Repository`, `Transactor`, external clients). Do not spin up databases for command unit tests.
* **Integration Tests (Focused & Isolated):**
  * Use integration tests against a **real, isolated test database** for **Application Queries** and **Infrastructure Repositories** to verify SQL syntax, constraints, and data mapping.
* **End-to-End (E2E) Tests (Minimal):**
  * Keep E2E tests limited to critical paths and smoke tests.

---

## 4. Anti-Patterns to Avoid

* **Dogmatic File Explosion:** Do not create `UserDTO`, `UserDomain`, `UserEntity`, and `UserDAO` for a single feature. Keep `Application` types shared with `Infrastructure`, and map to `DTO`s only at the `API` boundary.
* **Useless Pass-Through Methods:** Do not write a Query method that simply calls an identical Repository method unless that repository query is shared elsewhere.
* **Leaking Internal Models to API:** Never rely solely on serialization tags (like `json:"-"`) or TypeScript structural compatibility to hide sensitive fields on domain models—map explicitly to API DTOs.
* **Premature Abstraction:** Do not build generic repository frameworks or provider-agnostic wrappers unless polymorphic infrastructure is an immediate requirement.