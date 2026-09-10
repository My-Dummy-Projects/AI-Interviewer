# Frontend (AI Interviewer)

React 19 SPA built with Vite + Tailwind CSS. Handles Clerk auth, Vapi voice
sessions, the React Query data layer, Razorpay checkout, and PostHog analytics
(async-loaded).

## Scripts

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Vite dev server (http://localhost:5173)            |
| `npm run build`   | Production build to `build/`                       |
| `npm run preview` | Serve the production build locally                 |
| `npm run test`    | Vitest suite (jsdom environment)                   |
| `npm run lint`    | ESLint; writes a JSON report to `../test_reports/` |

## Structure

```
src/
  App.js              Route definitions + auth guard
  pages/              Route-level pages (Landing, Dashboard, Interview, ...)
  components/         Shared UI (Navbar, LoadingScreen, ui/* primitives)
  context/            AuthContext (Clerk) + InterviewContext (session state)
  hooks/              React Query query/mutation wrappers
  lib/                api (axios), vapiClient, razorpay, analytics, utils
```

## Environment

`frontend/.env`:

```
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_...
REACT_APP_BACKEND_URL=https://your-backend.example.com
```

Vapi public keys and assistant IDs are served by the backend at
`/api/interview/config` (configured in `backend/.env`), so no Vapi key is
needed client-side. PostHog's key is baked into `src/lib/analytics.js`.
Use placeholders locally; inject real values at deploy time.

## Testing

Vitest runs in a jsdom environment (see `vite.config.mjs`). Tests live in
`src/test/` and mock Clerk + the API client.