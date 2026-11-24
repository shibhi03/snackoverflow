# System Architecture

Snack Overflow is structured as an npm workspaces monorepo with a Next.js 15 frontend (`frontend/`) and an Express + Prisma REST API (`backend/`) backed by PostgreSQL 18.

## Layered Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend ["Frontend Web Client (Next.js 15 + React 19)"]
        Pages["App Router Pages (/login, /register, /dashboard, /snacks, /favourites, /history, /admin, /activities)"]
        State["Client State (AuthContext, BasketContext, ThemeContext, ToastContext)"]
        Query["TanStack Query Cache & API Client (apiFetch)"]
        Realtime["useRealtimeEvents Hook (Native EventSource)"]
    end

    subgraph Middleware ["Express Middleware Pipeline"]
        CORS["CORS & Cookie Parser"]
        AuthMW["Session Auth (SHA-256 Token Lookup & Revocation Check)"]
        RBAC["Role Guards (requireAdmin / requireMember)"]
        CSRF["Dual-Layer CSRF (Origin/Referer + X-CSRF-Token)"]
        ZodMW["Zod Schema Validation & Rate Limiter"]
    end

    subgraph Domain ["Controllers & Business Services"]
        AuthSvc["AuthService (Bcrypt Cost 12 & Stateful Sessions)"]
        IdempSvc["IdempotencyService (Payload Hash & Replay Ledger)"]
        SnackSvc["SnackService (Atomic Conditional Decrements & Basket Tx)"]
        VoteSvc["VoteService (Composite Unique Vote Enforcement)"]
        SummarySvc["SummaryService (KPIs & Snack of the Week)"]
        SseSvc["SseService (In-Memory Real-Time Broadcast)"]
    end

    subgraph Database ["PostgreSQL 18 Relational Engine"]
        Users[("users & sessions")]
        Snacks[("snacks (CHECK quantity >= 0)")]
        Votes[("votes (UNIQUE userId, snackId)")]
        Activities[("activities (ON DELETE SET NULL / RESTRICT)")]
        IdempKeys[("idempotency_keys (UNIQUE userId, key)")]
    end

    Pages --> State
    Pages --> Query
    Realtime -- "Cache Invalidation" --> Query
    Query -- "HTTPS / HTTP + Cookies + X-CSRF-Token + Idempotency-Key" --> CORS
    CORS --> AuthMW --> RBAC --> CSRF --> ZodMW

    ZodMW --> AuthSvc
    ZodMW --> IdempSvc
    ZodMW --> SnackSvc
    ZodMW --> VoteSvc
    ZodMW --> SummarySvc

    AuthSvc --> Users
    IdempSvc --> IdempKeys
    SnackSvc --> Snacks
    SnackSvc --> Activities
    VoteSvc --> Votes
    SummarySvc --> Snacks
    SummarySvc --> Votes
    SummarySvc --> Activities

    SnackSvc -. "Emit Mutation Event" .-> SseSvc
    VoteSvc -. "Emit Vote Event" .-> SseSvc
    SseSvc -- "text/event-stream (/api/events)" --> Realtime
```

## Atomic & Idempotent Consumption Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Member
    participant UI as Next.js Client
    participant API as Express Controller
    participant Idemp as IdempotencyService
    participant DB as PostgreSQL 18
    participant SSE as SseService

    Member->>UI: Click Consume / Confirm Basket
    UI->>API: POST /api/snacks/:id/consume (X-CSRF-Token, Idempotency-Key)
    API->>Idemp: Reserve (userId, key, requestHash)
    alt Duplicate Replay (Already Completed)
        Idemp-->>API: Cached statusCode & responseBody
        API-->>UI: 200 OK (Idempotency-Replayed: true)
    else Fresh Request
        API->>DB: BEGIN TRANSACTION
        API->>DB: UPDATE snacks SET quantity = quantity - $amount WHERE id = $id AND quantity >= $amount RETURNING *
        alt 0 Rows Updated (Insufficient Stock)
            DB-->>API: Empty result
            API->>DB: ROLLBACK
            API-->>UI: 409 Conflict (INSUFFICIENT_STOCK)
        else 1 Row Updated
            API->>DB: INSERT INTO activities (CONSUMED, amount, snackName)
            API->>DB: COMMIT
            API->>Idemp: Mark COMPLETED & store response
            API->>SSE: Broadcast SNACK_CONSUMED event
            SSE-->>UI: Live SSE update to all connected tabs
            API-->>UI: 200 OK (Updated snack & derived status)
        end
    end
```

## Concurrency & Idempotency Flow

1. **Single & Basket Consumption:**
   - The client generates a UUID `Idempotency-Key` per logical action.
   - `idempotencyService` reserves `(userId, key)` in `idempotency_keys` along with a SHA-256 hash of the request payload.
   - Inside `prisma.$transaction`, each snack executes:
     ```sql
     UPDATE "snacks"
     SET "quantity" = "quantity" - $amount, "updatedAt" = NOW()
     WHERE "id" = $snackId::uuid AND "quantity" >= $amount
     RETURNING *;
     ```
   - If any item returns 0 rows, the transaction throws `InsufficientStockError` (`409 Conflict`) and rolls back completely.
   - On success, `activities` rows are written in the same transaction, the idempotency record is marked `COMPLETED` with the serialized response, and an SSE event is broadcast.
   - Replaying the same key with the same payload returns the cached response (`Idempotency-Replayed: true`) without touching stock or emitting duplicate SSE events. Reusing a key with a different payload returns `409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`.

2. **One Vote Per Person:**
   - Enforced directly by PostgreSQL `UNIQUE ("userId", "snackId")` on `votes`. Concurrent duplicate `POST /api/snacks/:id/vote` calls result in a `P2002` / `23505` constraint error mapped cleanly to `409 Conflict`.

## Real-Time Synchronization (SSE)

- Authenticated clients open `GET /api/events`.
- `SseService` maintains active response streams and sends periodic heartbeat pings.
- Mutations (`SNACK_CREATED`, `SNACK_UPDATED`, `SNACK_DELETED`, `SNACK_CONSUMED`, `SNACK_RESTOCKED`, `VOTE_ADDED`, `VOTE_REMOVED`) broadcast lightweight JSON payloads.
- The frontend `useRealtimeEvents` hook invalidates relevant TanStack Query caches (`snacks`, `summary`, `favourites`, `admin-snacks`, `admin-activities`, `my-activities`) so open tabs stay synchronized automatically.
