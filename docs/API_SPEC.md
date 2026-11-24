# REST API Specification

Base URL: `http://localhost:4000/api`  
Health Check: `GET http://localhost:4000/health`

## Authentication & CSRF

- Sessions are stored in PostgreSQL and transmitted via an `HttpOnly`, `SameSite=Lax` cookie (`snack_session`).
- All state-changing endpoints (`POST`, `PATCH`, `DELETE`) require:
  - Valid `Origin` / `Referer` matching `FRONTEND_URL`
  - `X-CSRF-Token` header matching the `snack_csrf` cookie (fetched via `GET /api/auth/csrf-token`)

## Error Contract

Every error response uses the same structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation"
  }
}
```

Common status codes: `400` (validation/bad request), `401` (unauthenticated), `403` (role/CSRF forbidden), `404` (not found), `409` (insufficient stock, duplicate resource, idempotency payload mismatch), `429` (rate limit exceeded).

## Endpoints

### Auth
- `GET /api/auth/csrf-token` — Issue/refresh CSRF token.
- `GET /api/auth/register-status` — Returns `{ registrationEnabled: boolean }`.
- `POST /api/auth/register` — Body: `{ name, email, password, confirmPassword }`. Rate-limited. Always assigns `MEMBER`.
- `POST /api/auth/login` — Body: `{ email, password }`. Sets `snack_session` cookie.
- `POST /api/auth/logout` — Revokes session (`revokedAt = NOW()`) and clears cookie.
- `GET /api/auth/me` — Returns authenticated user metadata.

### Snacks
- `GET /api/snacks` — Query params: `page`, `limit`, `category` (`SWEET | SAVOURY | DRINK | HEALTHY_ISH`), `status` (`STOCKED | RUNNING_LOW | GONE`), `search`, `sortBy` (`name | quantity | votes`), `sortOrder` (`asc | desc`).
- `GET /api/snacks/summary` — Returns `totalSnackTypes`, `totalPackets`, `stockedCount`, `runningLowCount`, `goneCount`, `snackOfTheWeek`, `alerts`, and `recentActivities`.
- `GET /api/snacks/favourites` *(Member)* — Paginated list of snacks voted by the current user.
- `GET /api/snacks/:id` — Single snack with derived `status`, `voteCount`, and `hasVoted`.
- `POST /api/snacks` *(Admin)* — Body: `{ name, category, quantity, lowStockThreshold? }`.
- `PATCH /api/snacks/:id` *(Admin)* — Body: `{ name?, category?, lowStockThreshold? }`.
- `DELETE /api/snacks/:id` *(Admin)* — Deletes snack; preserves `activities` rows via `SET NULL`.
- `POST /api/snacks/:id/consume` *(Member)* — Body: `{ amount }`. Optional header: `Idempotency-Key: <uuid>`.
- `POST /api/snacks/consume-basket` *(Member)* — Body: `{ items: [{ snackId, amount }] }`. Optional header: `Idempotency-Key: <uuid>`.
- `POST /api/snacks/:id/restock` *(Admin)* — Body: `{ amount }`.
- `POST /api/snacks/:id/vote` *(Member)* — Casts one vote for the snack.
- `DELETE /api/snacks/:id/vote` *(Member)* — Removes the member's vote.

### Activities & Real-Time Events
- `GET /api/activities` *(Admin)* — Paginated pantry-wide audit log (`page`, `limit`).
- `GET /api/activities/me` *(Member)* — Paginated personal consumption history (`page`, `limit`).
- `GET /api/events` *(Auth)* — `text/event-stream` SSE channel broadcasting stock and vote updates.
