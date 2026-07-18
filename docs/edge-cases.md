# Edge Cases & Code Review

## Critical

| # | File:Line | Issue |
|---|---|---|
| **C1** | `feedback.py:249-262` | `_resolve_user` accepts a client-supplied `userId` with zero authentication. Any caller can impersonate any user by sending `{ "userId": "<any-uuid>" }`. |
| **C2** | `feedback.py:301-309` | Unauthenticated requests skip the quota check entirely (line 301 `if not current_user: ...`). Then `_resolve_user` at line 309 creates a spoofed identity and the interview is saved + credit consumed under it. Complete quota bypass. |
| **C3** | `feedback.py:320, 347-349, 350-355` | `refund_interview_credit` called when `consume_interview_credit` was never called — gives the user a free extra interview. Three code paths have this bug. |
| **C4** | `.env` file | Live secrets (`SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY`, `RAZORPAY_KEY_SECRET`, `OPENROUTER_API_KEY`) in the codebase. If committed, all infra is compromised. |
| **C5** | `routes_payments.py:157-159` | Webhook processes payment events with NO signature verification when `RAZORPAY_WEBHOOK_SECRET` is empty/missing. Anyone who knows the webhook URL can activate subscriptions for free. |
| **C6** | `feedback.py:180-181` | `req.jobRole` and `req.experienceLevel` are interpolated directly into the LLM prompt with no sanitization. Prompt injection allows arbitrary instruction override. |
| **C7** | `config.py:22` | `SUPABASE_SERVICE_ROLE_KEY` (full admin bypass of RLS) used everywhere instead of the anon key with RLS. |

---

## Payment / Subscription

| # | File:Line | Issue |
|---|---|---|
| **P1** | `routes_payments.py:52-53` | Blocks order creation if `current_plan == req.planId AND status == "active"`. User whose subscription **expired** can't re-purchase the same plan — status check has no fallback for `"expired"`/`"cancelled"`. |
| **P2** | `routes_payments.py:59` | `current_user.id[-6:]` crashes with `IndexError` if Clerk user ID is shorter than 6 characters. |
| **P3** | `routes_payments.py:91-98` | No check that `RAZORPAY_KEY_SECRET` is non-empty before HMAC computation. Empty key = trivially forgeable signature. |
| **P4** | `routes_payments.py:107` | `notes.get("user_id") != current_user.id` — if both are `None`/empty, `None != None` is `False`, so ownership check passes. |
| **P5** | `routes_payments.py:120-144 vs 197-213` | **Race condition**: `verify-payment` endpoint and `webhook` handler can execute concurrently for the same payment. Both update the subscription — last writer wins, potentially with stale data. |
| **P6** | `routes_payments.py:143` | `current_period_end = now + 30 days`. Upgrades truncate remaining days on the old plan instead of prorating. |
| **P7** | `models.py:191` | `"free_priority": True` exists only on the `pro` plan config. Any code doing `plan_config["free_priority"]` on `free` or `starter` crashes with `KeyError`. |
| **P8** | `routes_payments.py:135-144, 204-213` | Update queries reference `razorpay_order_id` and `razorpay_payment_id` columns. If migration `002_razorpay.sql` was not run, these queries crash with column-not-found error. |

---

## Auth / Token

| # | File:Line | Issue |
|---|---|---|
| **A1** | `deps.py:70` | `authorization.split(" ")[1]` — if header is `"Bearer"` (no token), `[1]` raises `IndexError` → **500** instead of 401. Same bug at `deps.py:86` in `try_get_user`. |
| **A2** | `deps.py:23-45` | All Clerk JWT verification exceptions are silently caught and return `None`. Missing `PyJWT` package, empty `CLERK_JWT_ISSUER`, network failure to JWKS endpoint — all invisible in logs. |
| **A3** | `deps.py:9-11` | If `supabase` is `None`, `supabase.auth.get_user(token)` raises `AttributeError` caught by broad `except`, but the error message is confusing — no explicit null check. |
| **A4** | `AuthContext.jsx:42-45` | If `getToken()` keeps failing, the 2-second `setTimeout` retries **indefinitely** with no max retry count or back-off. Memory leak / infinite loading. |
| **A5** | `AuthContext.jsx:32-49` | **Race**: If `isSignedIn` changes while `init()` is in-flight, `setBearerToken`/`setTokenReady` may have already fired before `cancelled` is checked. Brief window with stale token. |
| **A6** | `AuthContext.jsx:66` | If `clerkUser` is null (during session transition), `clerkUser.username \|\| ...` crashes with `TypeError`. |
| **A7** | `AuthContext.jsx:148` | If profile fetch never runs (query disabled) and the fallback effect (line 61-69) doesn't fire because `profileError` is false, `user` stays `null` and `loading` stays `true` forever. App unusable. |

---

## Frontend Data / State

| # | File:Line | Issue |
|---|---|---|
| **F1** | `DashboardPage.jsx:854-876` | Starter button has no loading state. **Double-click creates two Razorpay orders**. Same bug on Pro button (line 881) and Upgrade button (line 917). |
| **F2** | `DashboardPage.jsx:869-871` | Payment captured by Razorpay but `verifyPayment.mutateAsync` throws — user is charged but subscription not activated. "Verification failed." toast is the only recourse. |
| **F3** | `LandingPage.jsx:443-472` | `openRazorpayCheckout` is not awaited. `finally { setLoading(false) }` runs immediately after `openRazorpayCheckout` returns (while script is still loading). User can click again → second order. Double-payment vulnerability. |
| **F4** | `api.js:44-55` | Axios 401 interceptor `catch {}` silently swallows ALL errors from `ensureFreshToken` (network down, refresh endpoint unreachable). No logging, no user notification. |
| **F5** | `api.js` (all methods) | No `AbortController`/signal support. Component unmount while request is in-flight → React state update on unmounted component. |
| **F6** | `api.js:18-30` | `ensureFreshToken()` race window: if two concurrent calls pass `!_refreshPromise` check before either sets it, both call `_tokenRefresher()` simultaneously. |
| **F7** | `razorpay.js:50` | `(amount / 100).toFixed(0)` — if `amount` is `undefined` (malformed API response), `(undefined / 100)` is `NaN`, and `NaN.toFixed(0)` throws. |
| **F8** | `razorpay.js:58-59` | `handler(response)` is synchronous. If `onSuccess` calls `verifyPayment.mutateAsync` and it throws, the error is unhandled (no try/catch). |
| **F9** | `razorpay.js:61-71` | If payment fails AND modal closes, both `payment.failed` and `ondismiss` fire. `onError` is called twice. |
| **F10** | `DashboardPage.jsx:506` | Accessing `stats.totalInterviews` without optional chaining. If `stats` is `undefined` (query disabled), crashes with `TypeError` before the auth redirect can fire. |
| **F11** | `DashboardPage.jsx:842` | Date formatting uses `"en-IN"` locale while other dates use `"en-US"`. Inconsistent. |
| **F12** | `hooks/useApiMutations.js:15-20` | `useSubmitFeedbackMutation` does NOT invalidate `queryKeys.interviews` or `queryKeys.dashboardStats` after submission. Dashboard shows stale data for up to 30s. |
| **F13** | `hooks/useApiMutations.js:22-30` | `useSubmitToolFeedbackMutation` invalidates `queryKeys.profile` on success. Submitting feedback does not change the profile — unnecessary refetch + flicker. |
| **F14** | `App.js:34` | `clerkPubKey` defaults to `""` if `REACT_APP_CLERK_PUBLISHABLE_KEY` is missing. Clerk silently fails. No meaningful error shown to user. |
| **F15** | `SignUpPage.jsx:62` | OTP input: `value.slice(-1)` takes only the last character. Users **cannot paste** OTP codes — must type each digit individually. |

---

## Backend Logic / Error Handling

| # | File:Line | Issue |
|---|---|---|
| **B1** | `app.py:36` | `CORS_ORIGINS.split(',')` when `CORS_ORIGINS=""` produces `['']` (list with one empty string). Invalid origin breaks all CORS requests. |
| **B2** | `config.py:21-22` | `create_client()` can throw (invalid URL, network error) at **module import time**. No try/except → server fails to start entirely. |
| **B3** | `config.py:28` | `OPENROUTER_MODEL` defaults to `"openai/gpt-oss-20b:free"` — this model does not exist at OpenRouter. Likely a typo. |
| **B4** | ~30 locations | `supabase` null checks missing across `routes_user.py` (lines 18, 24, 32, 46, 56, 59, 62, 73, 150, 159, 165, 171, 195, 234, 259, 342, 356, 379, 398, 403, 463), `routes_payments.py` (lines 120, 135, 197, 204), `feedback.py` (lines 30, 319, 331), `routes_interview.py`. If env vars are missing, `supabase` stays `None` and every endpoint crashes with `AttributeError`. |
| **B5** | `models.py:158, 160-192` | `PLAN_RANK` and `PLAN_LIMITS` are module-level mutable dicts. Any code can accidentally mutate them, affecting all subsequent requests. |
| **B6** | `models.py:7` | `TranscriptTurn.text` is `str` with no max length. Malicious client can send gigabytes per turn. |
| **B7** | `models.py:46-49` | `FeedbackEntryRequest.rating` is `Optional[int]` with no range check (should be 1–5). |
| **B8** | `routes_user.py:171` | `supabase.table("user_profiles").update(...).eq("email", email)` — updates ALL profiles matching the email, not just the current user's. Multiple users sharing the same email get their `user_id` silently overwritten. |
| **B9** | `routes_user.py:172-173` | `except Exception: pass` — silently swallows ALL profile update errors. Network failure, constraint violation — all invisible. |
| **B10** | `routes_user.py:178, 201` | `current_user.email.split("@")[0]` crashes with `AttributeError` if `current_user.email` is `None`. |
| **B11** | `routes_user.py:205` | `profile = result.data[0]` — if `result.data` is empty (race: insert succeeded but select returns nothing), raises `IndexError` → 500. |
| **B12** | `routes_user.py:378-392` | `consume_interview_credit` optimistic locking: if a network blip loses the UPDATE response, the retry loop reads stale `interviews_used` and increments AGAIN (double-charge). Then `refund_interview_credit` only decrements once → net over-charge. |
| **B13** | `feedback.py:88-143` | `save_normalized_data`: no transaction. If `skill_scores` insert fails, the earlier `interview` and `transcript_turns` inserts are NOT rolled back. DB left in inconsistent state. |
| **B14** | `feedback.py:147-148` | All transcript turns concatenated into a single LLM prompt. Thousands of turns → prompt exceeds token limit → LLM call fails. |

---

## Security

| # | File:Line | Issue |
|---|---|---|
| **S1** | `routes_auth.py:83-84` | `supabase.auth.admin.update_user_by_id` uses the service role key to update passwords. If `access_token` validation is bypassed, an attacker could change any user's password. |
| **S2** | `routes_payments.py:25-27` | `GET /api/payments/config` is unauthenticated — exposes `RAZORPAY_KEY_ID`. While the key ID is public-facing, the unauthenticated endpoint leaks config details. |
| **S3** | All routes | No request rate limiting on any endpoint (signup, signin, password reset). Vulnerable to brute-force and DoS. |
| **S4** | All routes | No request body size limits. Endpoints accepting transcripts can receive arbitrarily large payloads → OOM. |

---

## UX / UI

| # | File:Line | Issue |
|---|---|---|
| **U1** | `DashboardPage.jsx:474-478` | Auth redirect is an effect — the full dashboard JSX renders BEFORE the redirect fires. Flash of protected content. Same pattern in SetupPage, ProfilePage, FeedbackPage. |
| **U2** | `DashboardPage.jsx:447-449` | `stats`, `subscription`, `interviews` are `undefined` while queries load. Page renders sections before data arrives, causing layout shifts. |
| **U3** | `ReportPage.jsx:238-241` | `report.skills.technical`, `report.skills.communication` — no optional chaining. If `report.skills` is undefined, crashes with `TypeError`. |
| **U4** | `InterviewPage.jsx:210-216` | If `cfg.vapiPublicKey` is missing but `cfg.ready` is true, `getVapi()` returns `null`. Then `vapi.on(...)` called on `null` → `TypeError`. |
| **U5** | `App.js:44` | Loading screen replaces ALL routes including public LandingPage. Unauthenticated users see a spinner before they can access the landing page. |
