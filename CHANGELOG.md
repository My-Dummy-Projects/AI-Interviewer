# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — Codebase Cleanup Pass (2026-09-05)

A "startup-grade" cleanup of the working tree on branch `test`: dead code
and dev artifacts removed, codebase commented for maintainability, config
and docs corrected. No user-facing functionality or design was changed.

**Diff summary:** 74 files — 607 insertions(+), 104,370 deletions(−);
the deletion volume is dominated by stale test/audit artifacts being removed.

---

### Removed

#### Build & runtime artifacts
- `backend/tmp_check_supabase.py` — one-off DB check script.
- `backend/__pycache__/`, `backend/tests/__pycache__/`, `backend/.pytest_cache/`
  — compiled bytecode caches.
- `frontend/build/` — stale production build output (gitignored; regenerated
  by `npm run build` when needed).
- `test_reports/*.json` (25 files) — one-shot Lighthouse audit dumps,
  eslint report snapshots, and iteration run artifacts. Kept
  `test_reports/.gitkeep` + `test_reports/pytest/` because
  `npm run lint` writes `../test_reports/eslint-report.json` there.
- `.worktrees/perf-a11y/` — stale git worktree (278.5 MB) duplicating the
  whole repo: `node_modules/`, `build/`, `.env` secret copies, superseded
  files (`routes_auth.py`, `db.py`, `netlify.toml`, `serve.log`) and stale
  audit JSONs. Removed via `git worktree remove`; the `perf-a11y` branch and
  all its commits remain in git history.

#### Backend dead code
- `backend/models.py` — removed orphaned auth models leftover from the
  deleted `routes_auth.py`: `SignUpRequest`, `SignInRequest`,
  `ResetPasswordRequest`, `UpdatePasswordRequest`, `RefreshTokenRequest`,
  `AuthResponse`.
- `backend/feedback.py` — removed unused imports (`SimpleNamespace`,
  `PLAN_LIMITS`) and the dead `_resolve_user()` stub and its call; fixed
  misindentation in the save block (behavior unchanged).
- `backend/routes_user.py` — removed unused `try_get_user` import.
- `backend/config.py` — removed unused `CLERK_SECRET_KEY` and `FRONTEND_URL`.
- `backend/tests/test_interview_persistence.py` — removed unused import.

#### Frontend dead code
- `frontend/src/lib/api.js` — removed unused methods `getPlanConfig`,
  `validateSetup`, `getPaymentConfig`.
- `frontend/src/hooks/useApiQueries.js` — removed dead `planConfig` /
  `paymentConfig` query keys.
- `frontend/src/hooks/useApiMutations.js` — removed unused
  `useSubmitFeedbackMutation`.
- `frontend/src/context/InterviewContext.jsx` — removed orphaned
  `setTranscript`/`getTranscript` accessors and `transcriptRef`.
- `frontend/src/pages/InterviewPage.jsx` — removed unused `configRef` and the
  no-op `onVolumeLevel` handler plus its `vapi` event registrations.
- `frontend/src/index.css` — removed unused Poppins font imports, the `.noise`
  overlay class, and the unused `.fade-up` animation (`@keyframes fadeup`);
  removed `.fade-up` from the `prefers-reduced-motion` block.
- `frontend/vite.config.mjs` — removed the now-dead `preloadHeadingFont()`
  plugin (it preloaded a Poppins variant that no longer exists) and its
  unused `fs` import.
- `frontend/package.json` — removed `@fontsource/poppins`, the
  Create-React-App-era `browserslist` block, and the
  `"**/react-scripts/postcss"` resolution override.
- `frontend/src/pages/LandingPage.jsx` — removed a commented-out external
  "Maidensail" badge block (dead markup).

### Changed / Documented

#### Backend (comments + structure)
- `backend/config.py` — rewritten with section comments; removed the two
  unused settings (see above).
- `backend/deps.py`, `backend/rate_limit.py`, `backend/server.py` — rewritten
  with module docstrings (`server.py` now exports `__all__ = ["app"]`).
- `backend/app.py`, `backend/routes_interview.py` — module docstrings added.
- `backend/feedback.py` — module docstring + note on the intentional circular
  import (SQL generation live next to Supabase rows).
- `backend/routes_user.py` — docstrings for `fetch_transcript`,
  `fetch_report`, `get_user_id_candidates`, `normalize_interview_record`;
  comments for the `range()`-inclusive pagination and the ownership checks.
- `backend/routes_payments.py` — extracted a shared `_activate_subscription()`
  helper, removing duplicated subscription-activation logic between
  `verify_payment` and `razorpay_webhook`; added docstrings.

#### Frontend (comments + structure)
- `frontend/src/index.js` — documented the deferred PostHog analytics load
  (idle-timer + first-interaction trigger).
- `frontend/src/lib/api.js` — JSDoc comments across the client and data
  layer; documented the anonymous-interview fallback path.
- `frontend/src/lib/{utils,razorpay,vapiClient,analytics}.js` — header
  docs; noted the PostHog key is a public client key.
- `frontend/src/components/{VoxaLogo,LoadingScreen,ErrorBoundary}.jsx`,
  `frontend/src/components/Navbar.jsx`,
  `frontend/src/components/ui/confirm-modal.jsx` — header docs; Navbar also
  got a leading-blank-line fix.
- `frontend/src/context/AuthContext.jsx`,
  `frontend/src/context/InterviewContext.jsx`, both `useApi*` hooks — header
  docs.
- Frontend pages — header docblocks + key inline comments: `App.js`,
  `LandingPage`, `DashboardPage`, `InterviewPage`, `SetupPage`, `ReportPage`,
  `ProfilePage`, `PricingPage`, `SignInPage`, `SignUpPage`,
  `ForgotPasswordPage`, `FeedbackPage`, `ResetPasswordPage`,
  `PrivacyPolicyPage`, `TermsOfServicePage`.
- Removed decorative `import React` statements (React 17+ JSX transform) from
  components/pages that don't reference `React` directly; kept it where it is
  required (`index.js`, `ErrorBoundary.jsx`, `DashboardPage.jsx`,
  `LandingPage.jsx`, and the shadcn `ui/*` primitives that use
  `React.memo`/`forwardRef`/`StrictMode`).

### Docs & config
- `README.md` — replaced the agent-instruction placeholder with a real
  project overview: stack, architecture, setup, scripts, deployment.
- `frontend/README.md` — replaced stale Create-React-App boilerplate with
  accurate Vite documentation; env vars verified against code
  (`REACT_APP_CLERK_PUBLISHABLE_KEY`, `REACT_APP_BACKEND_URL`; Vapi keys are
  served by the backend via `/api/interview/config`).
- `docs/PROJECT_OVERVIEW.md` — corrected the frontend stack row from "CRACO"
  to "Vite".

### Verification
- Backend: `python -m py_compile` clean across all modules; pytest passes
  (`tests/test_interview_persistence.py` → 2 passed). Note: run pytest with
  `-o addopts=""` because `backend/pytest.ini` forces xdist by default.
- Frontend: `npx eslint src` exit 0; `npm run test` (vitest) 3 passed;
  `npm run build` succeeds.

### Intentionally left alone
- `.gitconfig`, `.emergent/`, `memory/`, `test_result.md` — agent tooling /
  workflow infra, not product code.
- `docs/` and `render.yaml` — deployment + design documentation.
- Maidensail badge in `frontend/index.html` — removing it would change the
  live page.
- `buttonVariants` export in `frontend/src/components/ui/button.jsx` —
  standard shadcn/ui convention.
- Duplicate `data-testid` on `LandingPage` — test-related, low value.
- `Outfit`/`DM Sans` declared but not bundled in `index.css` — kept as-is so
  page rendering is unaffected; noted in a CSS comment for a future fix.
- `.env` files — local placeholders/secrets, gitignored; not part of this diff.

### Known follow-ups
- Commit this work (branch `test`) once reviewed: 74 files, +607/−104,370.
- Optional: bundle `Outfit`/`DM Sans` fonts to match the declared design
  tokens; the app currently falls back to `system-ui`.
- Optional: rotate/rotate-out the worktree `.env` secret copies (already
  removed with the worktree).