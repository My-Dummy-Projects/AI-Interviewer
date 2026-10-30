# Delete Account Feature — Design

Date: 2026-10-30
Status: Approved

## Goal

Replace the inert "Coming soon" Delete account button in the Profile Danger zone with a working, permanent account-deletion flow: purge all app data from Supabase and remove the Clerk auth identity, with a type-your-email confirmation gate.

## Decisions (confirmed with user)

- **Semantics:** immediate hard delete. No soft delete, no grace period, no purge scheduler.
- **Confirmation UX:** user must type their exact email in a modal before the confirm button enables.
- **Auth-record deletion:** client orchestrates — backend purges Supabase rows, frontend then calls Clerk `user.delete()`, then cleans up local auth state. Backend does NOT call the Clerk Backend API; `CLERK_SECRET_KEY` stays out of `config.py`.
- **Approach:** single delete endpoint (no preview/counts endpoint, no data-export step).

## Backend

### Endpoint

`DELETE /api/user/account` in `backend/routes_user.py` (existing `api_router_user`, prefix `/api/user`).

- **Auth:** `Depends(get_current_user)` (same as other `routes_user.py` routes).
- **Rate limit:** `@limiter.limit("5/minute")` with `request: Request` param, mirroring `POST /api/user/sync-profile`.
- **Body:** none. Optional `email` confirmation field is NOT verified server-side — the typed-email gate is UX friction only (the caller already holds a valid session for that user).

### ID resolution

Reuse the existing candidate logic: call `get_user_id_candidates(normalize_user_id(current_user.id), current_user.email)` (`backend/routes_user.py:152-181`, `normalize_user_id` from `backend/deps.py`) — the same helper `GET /api/user/profile` uses. Every delete targets **all** returned candidate `user_id` values so legacy Clerk-ID rows and email-matched profile rows are removed — no orphans.

### Deletion (hard, service-role client, one try/except)

1. `DELETE FROM interviews WHERE user_id IN candidates` — safety net for orphan interviews (rows whose profile row is missing, which FK cascade would miss). Deleting first also removes all interview children (`transcript_turns`, `skill_scores`, `question_evaluations`, `interview_strengths`, `interview_improvements`, `learning_suggestions`) via their FK cascades.
2. `DELETE FROM user_profiles WHERE user_id IN candidates` — FK `ON DELETE CASCADE` wipes `user_subscriptions`, `feedback_entries`, and any remaining `interviews` rows.

No schema changes, no migrations: the cascade graph in `schema.sql` already covers the full data tree. `feedback_entries` is covered by its `user_id` FK (its denormalized `email` column needs no separate handling).

### Response

- `204 No Content` on success — idempotent: return 204 even if zero rows matched (account already gone).
- `500` with generic detail on unexpected failure; log the real error server-side.
- Existing `401` from `get_current_user` for invalid/expired tokens.

### Out of scope (backend)

- No changes to `deps.py`, `config.py`, `app.py`, or Clerk configuration.
- No Razorpay cancellation (payments are one-time orders, not recurring subscriptions).
- No Supabase Storage cleanup (no buckets/uploads exist; `avatar_url` is a plain URL).

## Frontend

### Confirmation modal

- Extend `frontend/src/components/ui/confirm-modal.jsx` with an optional controlled text input and a `requireText` prop (gate confirm on `input.trim().toLowerCase() === requireText.trim().toLowerCase()`), plus optional `inputPlaceholder`/`inputLabel`. Keep the existing API backward-compatible for the logout usage at `DashboardPage.jsx:1052`.
- Danger zone in `frontend/src/pages/ProfilePage.jsx` (lines ~436-462): replace the `disabled` "Coming soon" button with an active red "Delete account" button (`Trash2` icon per existing danger-zone styling) that opens the modal.
- Modal copy states everything deleted permanently: profile, all interviews and history, subscription record; no recovery.
- Confirm button disabled until email matches (case-insensitive, trimmed).
- `data-testid` attributes: `delete-account-button`, `delete-account-confirm-input`, `delete-account-confirm-button` (follows existing ProfilePage testid convention).
- `isDeleting` state: spinner on confirm button, inputs disabled while in flight.

### Orchestration

Implemented as a mutation following existing conventions (`frontend/src/hooks/useApiMutations.js`), called from ProfilePage:

1. `api.deleteAccount()` — new method in `frontend/src/lib/api.js`:
   `axios.delete(`${API}/user/account`, { headers: authHeaders() })`.
2. On backend success, in order:
   a. Clerk `user.delete()` via `useUser()`.
   b. Call `signout()` from `useAuth()` (it already runs `clerkSignOut()`, `setBearerToken(null)`, `setUser(null)`, `queryClient.clear()` — a `clerkSignOut()` on an already-deleted account is a harmless no-op).
   c. `navigate('/')`.

   On a Clerk `user.delete()` failure, skip (a) but still run (b) and (c).

### Error handling

| Failure | Behavior |
|---|---|
| Backend delete fails (network/500) | Toast error ("Couldn't delete account — nothing was changed"); modal stays open; nothing deleted. |
| 401 (expired token mid-flow) | Same as backend failure path. |
| Clerk `user.delete()` fails after backend success | Still run local cleanup + navigate `/`; toast warning that sign-in removal partially failed. Re-sign-in would create a fresh empty account. |

## Testing

- **Backend unit:** pure tests for candidate-ID resolution / delete-target logic in `backend/tests/` (style of `test_interview_persistence.py`; no live DB).
- **Backend live:** destructive route test NOT added to `test_api.py` by default (would destroy a real account); skip unless explicitly gated.
- **Frontend:** Vitest + Testing Library — modal gate test (confirm disabled → enabled only on matching email) under `frontend/src/test/`.
- **Commands:**
  - `cd backend && python -m pytest tests -o addopts=""`
  - `cd frontend && npm run test && npm run lint`
  - `pytest.ini` must not be modified.
- **Docs:** `CHANGELOG.md` entry under `[Unreleased]`.

## Explicit non-goals

- Soft delete / recovery window / account restore.
- Data export or GDPR download before deletion.
- Server-side verification of the typed confirmation email.
- Deleting via Clerk Backend API (`CLERK_SECRET_KEY` remains unused by `config.py`).
- Cancelling Razorpay payments.
