# Backend Documentation

## Overview

The backend is a FastAPI service that powers AI Interviewer. It verifies JWTs via Clerk's JWKS endpoint, generates AI interview feedback via OpenRouter, persists interview data to Supabase, manages subscription plans, and handles Razorpay payments.

## Tech Stack

- **Python 3.13+**
- **FastAPI** with Starlette middleware
- **Pydantic v2** models with field validators
- **Supabase Python client** (`supabase-py`) for PostgreSQL access
- **PyJWT** for Clerk JWT verification against JWKS endpoint
- **OpenAI Python SDK** (`openai>=1.99.9`) for OpenRouter LLM calls
- **Razorpay Python SDK** for payment order management

## Architecture

```
backend/
├── app.py                 # FastAPI app, CORS middleware, router registration
├── server.py              # Uvicorn entry point
├── config.py              # Env loading, shared supabase/logger instances
├── deps.py                # Auth deps: Clerk JWKS + Supabase fallback
├── models.py              # Pydantic models + PLAN_LIMITS + PLAN_RANK
├── routes_auth.py         # Sign up/in/out, password reset, token refresh
├── routes_user.py         # Profile, interviews, dashboard stats, subscriptions
├── routes_interview.py    # Interview feedback endpoint
├── routes_payments.py     # Razorpay order creation, verification, webhook
├── feedback.py            # LLM prompt building, feedback generation, DB persistence
├── requirements.txt       # Python dependencies
└── schema.sql             # PostgreSQL schema + RLS policies
```

## Authentication (`deps.py`)

Token verification runs in this order:

1. **Clerk JWT verification** — uses `PyJWT` library's `PyJWKClient` to fetch Clerk's JWKS endpoint (`{CLERK_JWT_ISSUER}/.well-known/jwks.json`). Verifies RS256 signature and issuer claim. Extracts `sub` (user ID), `email`, `name`.

2. **Supabase fallback** — `supabase.auth.get_user(token)` for Supabase-issued tokens (legacy support).

3. If both fail → HTTP 401.

**Security:**
- The old `_extract_from_jwt_payload()` function (which base64-decoded the JWT without signature verification) has been removed — unverified tokens are rejected.
- `normalize_user_id()` converts Clerk user IDs to UUID-compatible form using `uuid.uuid5()` for non-UUID IDs.

## Request Flow

### Interview Feedback (`POST /api/interview/feedback`)

```
Request → auth check (deps) → quota check (check_interview_quota)
  → LLM prompt → OpenRouter (60s timeout) → parse JSON
  → ensure_user_profile → insert interview → save normalized data (6 tables)
  → consume_interview_credit (atomic, 3 retries) → return FeedbackReport
```

**Atomic credit consumption:**
- Reads `interviews_used` from `user_subscriptions`
- Updates with `.eq("interviews_used", current_used)` — optimistic concurrency
- Retries up to 3 times on conflict
- Calls `refund_interview_credit()` on any save/credit failure

**Fallback report:** If OpenRouter key is missing or LLM call fails, generates a deterministic `fallback_report()` with default scores and an explanatory message.

### Dashboard Stats (`GET /api/user/dashboard-stats`)

Aggregates across `candidate_ids` (user_id + normalized email lookups) for cross-device/historical user merging.

## Routes

### Auth Routes (`routes_auth.py`)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account via Supabase Auth + auto-create user profile |
| `POST` | `/api/auth/signin` | Sign in with email/password |
| `POST` | `/api/auth/signout` | Sign out (current session only — uses `supabase.auth.sign_out()`) |
| `POST` | `/api/auth/reset-password` | Send password reset email |
| `POST` | `/api/auth/update-password` | Update password using access token |
| `POST` | `/api/auth/refresh` | Refresh auth session token |

### User Routes (`routes_user.py`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/user/profile` | Get or auto-create user profile |
| `PUT` | `/api/user/profile` | Update display name, bio, avatar |
| `GET` | `/api/user/interviews` | Paginated interview history (with candidate_id merging) |
| `GET` | `/api/user/interviews/{id}` | Interview detail with transcript + report |
| `POST` | `/api/user/feedback` | Submit tool feedback (calls `ensure_user_profile` for FK integrity) |
| `GET` | `/api/user/subscription` | Current subscription details + auto period reset |
| `GET` | `/api/user/subscription/usage` | Quick quota check (can start interview?) |
| `GET` | `/api/user/dashboard-stats` | Aggregated dashboard metrics |

### Payment Routes (`routes_payments.py`)

| Method | Path | Purpose | Security |
|---|---|---|---|
| `POST` | `/api/payments/create-order` | Create Razorpay order | Duplicate plan check |
| `POST` | `/api/payments/verify-payment` | Verify HMAC signature + activate plan | Checks `notes.user_id` matches authenticated user |
| `POST` | `/api/payments/webhook` | Razorpay webhook | HMAC webhook signature |
| `GET` | `/api/payments/config` | Public Razorpay key ID | None |

### Interview Routes (`routes_interview.py`)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/interview/feedback` | Submit transcript → generate feedback (see flow above) |
| `POST` | `/api/interview/validate-setup` | Validate setup against plan limits |
| `GET` | `/api/interview/plan-config` | Plan-specific configuration |

## Database Persistence

### Tables and Relationships

| Table | Purpose | Key FK |
|---|---|---|
| `user_profiles` | User display info | — |
| `user_subscriptions` | Plan, usage, billing period | `user_profiles.user_id` |
| `feedback_entries` | Product feedback | `user_profiles.user_id` |
| `interviews` | Interview records (JSONB `report` + `transcript`) | `user_profiles.user_id` |
| `transcript_turns` | Normalized transcript rows | `interviews.id` |
| `skill_scores` | 4 skill scores per interview | `interviews.id` |
| `question_evaluations` | Per-question scores + feedback | `interviews.id` |
| `interview_strengths` | Identified strengths | `interviews.id` |
| `interview_improvements` | Areas to improve | `interviews.id` |
| `learning_suggestions` | Personalized learning plan | `interviews.id` |

### Dual-Write Strategy

Both JSONB columns on `interviews` (`report`, `transcript`) and normalized tables are written for backward compatibility. JSONB writes use a separate `UPDATE` that gracefully handles missing columns (caught exception).

### Row-Level Security

All tables have RLS enabled with policies restricting access to `auth.uid()` matching the row's `user_id` (or derived via subquery for child tables).

## Subscription & Plan Management

### Plan Definitions (`models.py`)

```python
PLAN_LIMITS = {
    "free":  {"interviews_allowed": 2,  "max_duration_minutes": 15, "lifetime": True,  ...},
    "starter": {"interviews_allowed": 10, "max_duration_minutes": 15, "lifetime": False, ...},
    "pro":   {"intervals_allowed": 20, "max_duration_minutes": 30, "lifetime": False, ...},
}
PLAN_RANK = {"free": 0, "starter": 1, "pro": 2}
```

### Key Functions

| Function | File | Purpose |
|---|---|---|
| `get_or_create_subscription()` | `routes_user.py:339` | Fetch or create free plan subscription |
| `check_and_reset_period()` | `routes_user.py:310` | Auto-reset usage if billing period expired |
| `check_interview_quota()` | `routes_user.py:358` | Compare used vs allowed before interview |
| `consume_interview_credit()` | `routes_user.py:373` | Atomic increment with optimistic lock (3 retries) |
| `refund_interview_credit()` | `routes_user.py:390` | Decrement on save failure |

## Error Handling

| Scenario | HTTP Status | Behavior |
|---|---|---|
| Missing/invalid auth token | 401 | `"Not authenticated"` or `"Invalid or expired token"` |
| Interview quota exceeded | 403 | `"You have used all N interviews on your X plan"` |
| Empty transcript | 400 | `"No transcript data provided"` |
| Missing OpenRouter key | — | Falls back to `fallback_report()` with explanation |
| DB save failure | — | Credit refunded, report still returned |
| Duplicate plan purchase | 400 | `"You are already on the X plan."` |
| Invalid payment signature | 400 | `"Invalid payment signature"` |
| Order user_id mismatch | 403 | `"Order does not belong to this user"` |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (bypasses RLS) |
| `CLERK_JWT_ISSUER` | Yes | Clerk issuer URL (e.g. `https://xxx.clerk.accounts.dev`) |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for LLM calls |
| `OPENROUTER_MODEL` | No | Default: `openai/gpt-oss-20b:free` |
| `VAPI_PUBLIC_KEY` | Yes | Vapi public key for voice calls |
| `VAPI_ASSISTANT_ID` | Yes | Vapi assistant ID |
| `CORS_ORIGINS` | No | Comma-separated origins or `*` (credentials disabled with `*`) |
| `RAZORPAY_KEY_ID` | Yes | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | Razorpay webhook signing secret |
| `FRONTEND_URL` | No | Default: `http://localhost:3000` |

\* The committed `.env` file contains **placeholder values only**. Actual secrets must be set via deployment environment variables.

## Current Status

| Feature | Status |
|---|---|
| Clerk JWT verification (JWKS, RS256) | ✅ Stable |
| Interview feedback generation (OpenRouter) | ✅ Stable |
| Atomic credit consumption + refund | ✅ Stable |
| Interview persistence (JSONB + normalized) | ✅ Stable |
| Profile and history retrieval | ✅ Stable |
| Dashboard statistics aggregation | ✅ Stable |
| Razorpay order creation + verification | ✅ Stable |
| Payment webhook processing | ✅ Stable |
| Subscription period auto-reset | ✅ Stable |
| Password validation (Pydantic) | ✅ Stable |
| CORS with wildcard safety | ✅ Stable |
