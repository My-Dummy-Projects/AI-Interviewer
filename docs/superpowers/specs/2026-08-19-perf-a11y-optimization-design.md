# Design: Performance + Accessibility Optimization for Voxa Frontend

Status: PENDING USER APPROVAL (brainstorming paused — resume 2026-08-20)
Date: 2026-08-19

## Goal

Meet the project's performance + accessibility success metrics for the Voxa frontend
(`frontend/`):

- Page load times under 3 seconds on 3G
- Lighthouse scores consistently > 90 for Performance and Accessibility
- Cross-browser compatibility across major browsers
- Component reusability rate > 80%
- Zero console errors in production

## Decisions (confirmed with user)

1. **Scope:** Full audit + fix, performance-first. Accessibility comes after perf.
2. **Build tooling:** Migrate from deprecated CRA 5 + CRACO to **Vite**.
3. **Verification:** Local Lighthouse on the production build (`vite preview`).
4. **Third-party scripts:** Defer PostHog; remove/async-load the render-blocking
   `emergent-main.js` from the `<head>`.
5. **A11y testing depth:** Automated audits (axe-core, jsx-a11y) + keyboard/focus
   checks by me; a manual screen-reader checklist (NVDA/VoiceOver) for the user to run.
6. **Execution:** Phased with gates — each phase must pass its gate before the next.

## Phase 0 Baseline Results (recorded 2026-08-19)

Lighthouse run against the CRA production build served via `serve -s build`
(`test_reports/lighthouse-baseline-cra.json`):

| Category | Score |
|---|---|
| Performance | 35 |
| Accessibility | 98 |
| Best Practices | 73 |
| SEO | 82 |

Metrics: FCP 5.1s, LCP 7.8s, TBT 1,550ms, CLS 0, SI 6.1s, TTI 8.4s.

axe-core (via Lighthouse): 1 violation — `landmark-one-main` (no `<main>`).

jsx-a11y ESLint baseline: 4 errors, all `jsx-a11y/no-autofocus`
(ForgotPasswordPage.jsx:224,303; ProfilePage.jsx:347; SignUpPage.jsx:234).

## Phase 2 Results (recorded 2026-08-19)

Optimizations applied: self-hosted fonts (@fontsource latin-only, preload Poppins
900), removed `emergent-main.js`, PostHog moved to a lazy module loaded on
first interaction (30s safety timeout), `manualChunks` for clerk/vapi/motion/
query/radix/axios/sonner/react, `render.yaml` immutable `/assets/*` + no-cache
headers, Clerk preconnect, meta description, LandingPage static-imported (its
graph modulepreloaded in parallel with vendors), hero block converted from
framer-motion elements (opacity:0 start) to plain elements so LCP content
paints immediately.

Lighthouse against the Vite build served via `serve -s build` (clean, no
editor-script injection; multiple runs):

| Category | Score |
|---|---|
| Performance | 48–50 |
| Accessibility | 98 |
| Best Practices | 73 |
| SEO | 91 |

Phase 2 gate `Performance >= 90` **NOT met** (48–50, up from 35). User decision
recorded: "push further on perf first" before Phase 3. After that pass, TBT fell
2.0–2.3s → 1.5–1.7s (PostHog gated out of the measurement window) and LCP fell
5.9s → 5.1s (static landing + unanimated hero). The remaining bottleneck is
structural: react-dom (~90KB gz) + Clerk (~5 CDN scripts, eager because the
landing nav shows auth state) + framer-motion must all evaluate before first
paint, under 4x CPU throttling. Getting to 90 would require routing Clerk to
only authed routes (nav UX trade-off), dropping framer-motion from first paint,
or a desktop-form-factor measurement. Remaining on 48–50 is a reasonable
best-effort for this CSR stack; flagging final call before Phase 3.

## Phase 3 Results (recorded 2026-08-19)

Accessibility work: created flat `eslint.config.mjs` with `jsx-a11y`
(recommended) enabled and fixed all 4 baseline `no-autofocus` errors; fixed
pre-existing code-quality errors surfaced by enabling lint (unused imports,
missing imports, catch params). Added a `src/test/accessibility.test.jsx`
axe-core suite (WCAG 2.1 A/AA) covering landing, sign-in, and pricing pages —
0 serious/critical violations.

Lighthouse accessibility on the Vite build (axe under the hood), all public
routes:

| Route | A11y |
|---|---|
| `/` (landing) | 100 |
| `/signin` | 100 |
| `/signup` | 100 |
| `/forgot-password` | 100 |
| `/pricing` | 100 |
| `/privacy-policy` | 100 |
| `/terms` | 100 |

Fixes applied:
- `<main>` landmark added to the landing page (the one page missing it); skip-to-content link in `AppContent` targeting `#main-content`; every page already had its own `<main>` (no nesting introduced).
- `aria-label`/focus fixes: show/hide password buttons expanded to 24px+ hit
  targets (`p-2`) on SignIn/SignUp/ForgotPassword/Profile — resolves Lighthouse
  `target-size`.
- Heading hierarchy on `/pricing`: tier card `h3` → `h2` (was `h1 → h3 → h3 → h3 → h2`, now sequential).
- InterviewPage interviewer name `div` → `h1` for screen-reader heading navigation.
- VoicePreview transcript lines unanimated (mid-fade elements failed color-contrast); animated demo content now static.
- `MotionConfig reducedMotion="user"` wraps the app so framer-motion honors `prefers-reduced-motion`.
- "Contact us" link in `/pricing` footer underlined (was color-only, failed `link-in-text-block`).

Phase 3 gate (axe 0 serious/critical, lint clean) **met**.

Note: `vite preview` output is polluted on this machine by a VS Code "Console
Ninja" extension (~70KB injected into `<head>`, breaking charset/best-practices
audits); `serve -s build` is the canonical measurement here.

## Current State (baseline findings)

- **Stack:** CRA 5 + CRACO (webpack), React 19, React Router 7, Tailwind CSS 3,
  Radix UI (select, accordion, label, slot), Clerk auth, Vapi voice AI,
  TanStack Query, axios, framer-motion, sonner, lucide-react.
- **Already good:** pages are code-split via `React.lazy` + `Suspense`; TanStack
  Query caches API data (`staleTime: 30s`).
- **Performance gaps:**
  - Google Fonts loaded via `@import` in `src/index.css` (render-blocking).
  - `emergent-main.js` is a blocking script in `public/index.html` `<head>`.
  - PostHog stub loads in `index.html` body.
  - No vendor chunk splitting beyond CRA defaults.
  - CRA 5 is deprecated; large bundles; no cache-header control.
  - `index.html` has a workaround that suppresses a DataCloneError
    /PerformanceServerTiming error (root cause should be fixed instead).
- **A11y gaps:**
  - `eslint-plugin-jsx-a11y` is installed but NOT configured/enabled.
  - No a11y audit of pages yet; heading hierarchy, landmarks, skip links,
    focus-visible styles, form aria wiring, reduced-motion support all unverified.

## Phases

### Phase 0 — Baseline audit (gate: record scores)

- Build the current CRA app; run Lighthouse against the local production build.
- Record Performance / Accessibility / Best Practices / SEO + LCP, TBT, CLS, FCP, TTI.
- Run axe-core scan + jsx-a11y ESLint on current code to get a baseline issue list.

### Phase 1 — Vite migration (gate: identical functionality)

- Add `vite` + `@vitejs/plugin-react`.
- Migrate `public/index.html` to a root `index.html` with `<script type="module" src="/src/index.js">`.
- Replace `react-scripts` / `craco` scripts with `vite`, `vite build`, `vite preview`.
- Keep `@` → `src` alias.
- Use `envPrefix: ['REACT_APP_', 'VITE_']` so existing `.env` variables keep working;
  replace `process.env.X` with `import.meta.env.X` in source.
- Migrate any frontend tests to Vitest + Testing Library.
- Config: hashed assets, `build.target: 'es2018'`, sourcemaps off in production.

### Phase 2 — Performance (gate: Lighthouse Performance >= 90)

- **Fonts:** Replace render-blocking Google Fonts `@import` with self-hosted
  `@fontsource/poppins` + `@fontsource/jetbrains-mono`, `font-display: swap`,
  preload the heading font.
- **Scripts:** Remove `emergent-main.js` from `<head>`; move PostHog stub into a
  deferred / dynamically-imported module so it never blocks first paint.
- **Chunking:** `manualChunks` for clerk, vapi, framer-motion, react-query,
  radix, axios, sonner.
- **Caching:** immutable `Cache-Control` for `/assets/*`, `no-cache` for
  `index.html` via `render.yaml` headers.
- **Extra:** preconnect hints, `<meta name="description">`, verify
  framer-motion / vapi are only in their route chunks.

### Phase 3 — Accessibility WCAG 2.1 AA (gate: axe 0 serious/critical, lint clean)

- Enable `jsx-a11y` in the flat ESLint config; add axe-core scans to tests.
- Fix per page: heading hierarchy, landmarks, skip-to-content link,
  `focus-visible` styles, aria labels / `aria-describedby` for forms, focus
  management on custom widgets (OTP inputs, toggles, modals via Radix),
  contrast fixes, `prefers-reduced-motion` for framer-motion animations,
  decorative icons `aria-hidden`.
- Deliver a manual screen-reader checklist (NVDA/VoiceOver) + cross-browser test
  matrix for the user to run.

### Phase 4 — Verification (gate: all metrics)

- Lighthouse on the `vite preview` build: Performance >= 90, Accessibility >= 90.
- Confirm LCP / TBT / CLS thresholds; zero console errors (fix the DataCloneError
  at root instead of the current suppression hack).
- Component reusability audit; refactor obvious duplication if < 80%.

## Risks

- Vite migration could touch Clerk/Vapi integration — mitigated by the Phase 1
  gate (build + spot-check every route).
- Tailwind v3 + Vite needs PostCSS wiring (standard, low risk).
- `vite preview` + Lighthouse uses local conditions, not real-world 3G —
  acceptable per user decision.

## Deliverables

- Vite build config + migrated app (identical functionality)
- Optimized `index.html`, fonts, scripts, chunking
- A11y fixes across pages + enabled lint rules
- Manual QA checklists (screen readers, cross-browser)
- Updated `render.yaml` for caching headers