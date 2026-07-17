# Frontend Documentation

## Overview

The frontend is a React 19 single-page application built with CRACO (Create React App Configuration Override). It provides the user-facing experience for AI Interviewer: authentication, interview setup, live voice interviews, feedback viewing, and historical report browsing.

## Tech Stack

- **React 19** with hooks and functional components
- **React Router** for client-side routing
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Clerk React SDK** (`@clerk/clerk-react`) for authentication
- **Vapi SDK** (`@vapi-ai/web`) for realtime voice interviews
- **Razorpay SDK** (`@razorpay/checkout`) for payment processing
- **Axios** for HTTP requests
- **Sonner** for toast notifications
- **Framer Motion** for animations

## Main Structure

### Pages

| Page | Route | Purpose |
|---|---|---|
| `LandingPage` | `/` | Product overview, pricing, FAQ |
| `SignInPage` | `/signin` | Sign in with email + password |
| `SignUpPage` | `/signup` | Create account with email verification (OTP) |
| `ForgotPasswordPage` | `/forgot-password` | Password reset flow (email → OTP → new password) |
| `SetupPage` | `/setup` | Configure interview (role, level, duration) |
| `InterviewPage` | `/interview` | Live voice interview with Aria |
| `ReportPage` | `/report` (or `/report/:id`) | Feedback report and score breakdown |
| `DashboardPage` | `/dashboard` | Stats, history, subscription management |
| `ProfilePage` | `/profile` | Edit display name, bio, change password |
| `FeedbackPage` | `/feedback` | Submit product feedback |

### Context Providers

- **AuthContext** — wraps Clerk hooks (`useUser`, `useAuth`, `useSignIn`, `useSignUp`). Exposes `user`, `loading`, `signup`, `signin`, `signout`, `verifySignupOtp`, `refreshProfile`, `getFreshToken`. On mount: fetches Clerk token, sets up Axios bearer token, fetches user profile from backend. Falls back to Clerk user data on profile fetch failure (error logged).

- **InterviewContext** — holds current interview `setup` (jobRole, experienceLevel, durationMinutes), `report` (FeedbackReport), and `reset()` function. Initialized from SetupPage, consumed by InterviewPage and ReportPage.

### Shared UI

- `components/ui/` — shadcn-style primitives: `Button`, `Input`, `Label`, `Select`, `Accordion`
- `components/Navbar.jsx` — top navigation bar with left/right slots
- `components/VoxaLogo.jsx` — app logo component
- `components/LoadingScreen.jsx` — full-page loading state with message + submessage
- `components/ErrorBoundary.jsx` — React error boundary + global error handler (`preventDefault` only in dev)

### Helpers

- `lib/api.js` — Axios-based API client with automatic bearer token injection and 401 retry via `setTokenRefresher`. Methods: `getProfile`, `updateProfile`, `getDashboardStats`, `getInterviews`, `getInterview`, `submitFeedback`, `submitToolFeedback`, `getSubscription`, `createOrder`, `verifyPayment`.
- `lib/vapiClient.js` — singleton Vapi instance manager (`getVapi`, `resetVapi`). Ensures only one Vapi instance per session.
- `lib/razorpay.js` — Razorpay checkout modal integration.
- `lib/utils.js` — shared utility functions.

## Authentication Flow

1. App wrapped in `<ClerkProvider>` with publishable key from `REACT_APP_CLERK_PUBLISHABLE_KEY`
2. `AuthContext` uses Clerk hooks to detect sign-in state → fetches JWT via `getToken()` → sets Axios bearer token
3. Backend verifies JWT via Clerk JWKS endpoint (`RS256` signature, issuer check)
4. On sign out: clears Clerk session via `clerkSignOut()`, clears bearer token, navigates to `/`
5. Token refresher callback auto-retries 401 responses with a fresh Clerk token

## Interview Flow

### Setup Page (`SetupPage.jsx`)

- Collects: job role (text input, min 2 chars), experience level (select), duration (select, filtered by plan max duration)
- Fetches subscription on mount to determine available durations and remaining interviews
- **Navigation guard** — if user is not authenticated, uses `useEffect` + `navigate()` instead of inline `<Navigate>` to avoid render flash
- Button states: disabled → upgrade CTA (if 0 remaining) → start interview

### Interview Page (`InterviewPage.jsx`)

- Fetches Vapi config via `GET /api/config` on mount (cached in `useRef` per component instance — **not** module-level, preventing cross-user session leaks)
- Connects to Vapi voice call with assistant ID, passes role/level/duration as variables
- Manages: connection state, microphone mute, elapsed timer, auto-end at duration limit
- **Transcript handling**: builds `displayTranscript` from `transcriptRef` + partials (debounced at 300ms)
- On end: builds payload with transcript, calls `POST /api/interview/feedback`, navigates to report
- Error extraction uses a named helper `extractErrorMessage(e)` instead of fragile nested ternary chains

### Report Page (`ReportPage.jsx`)

- Displays overall score, skill scores (radar chart), strengths, improvements, per-question evaluations (accordion)
- Conditional: learning plan shown only if `hasLearningPlan` is true (paid plans)
- Links: new interview, dashboard, landing page

## Dashboard Page (`DashboardPage.jsx`)

- Loads 4 data sources in parallel via `Promise.all`: profile, stats, interviews, subscription
- Layout: welcome hero (2/3) + weekly goal ring (1/3) → subscription plan banner → stats grid (4 cards) → score trend chart + skill radar → progress cards → interview history (searchable, filterable, paginated)
- Weekly goal persisted in `localStorage` with inline editing (+/- controls)
- Subscription banner shows plan name, credits used/remaining, reset date, upgrade buttons
- Empty state for new users (no stats section, "Start new interview" CTA)

## Styling

- Dark theme (`bg-[#050505]` base, `#0a0a0a` card surfaces)
- Cyan/emerald accent palette with glass-morphism borders
- Ambient glow effects, grid background patterns, animated orbs
- Responsive: mobile-first with stacked layouts on small screens

## Current Status

| Feature | Status |
|---|---|
| Clerk-based authentication | ✅ Stable |
| Protected API requests with auto-retry | ✅ Stable |
| Interview setup (role, level, duration) | ✅ Stable |
| Live voice interview (Vapi) | ✅ Stable |
| AI feedback report viewing | ✅ Stable |
| Interview history + dashboard stats | ✅ Stable |
| Subscription management | ✅ Stable |
| Razorpay payment integration | ✅ Stable |
| Profile editing + password change | ✅ Stable |
| Product feedback submission | ✅ Stable |
