# AI Interviewer

Practice technical & behavioral interviews through real-time voice sessions, get AI-generated feedback scores, and review past reports from your dashboard.

## Tech Stack

| Layer       | Technology                                             |
| ----------- | ------------------------------------------------------ |
| Frontend    | React 19 + Vite + Tailwind CSS                         |
| Backend     | FastAPI + Pydantic v2                                  |
| Auth        | Clerk (JWT via JWKS verification)                      |
| Database    | Supabase / PostgreSQL                                  |
| Voice       | Vapi SDK (realtime voice interviews)                   |
| LLM         | OpenRouter (AsyncOpenAI)                               |
| Payments    | Razorpay                                               |
| Analytics   | PostHog                                                |

## Architecture

```
frontend/   React SPA (Vite). Clerk auth, Vapi voice, React Query data layer.
backend/    FastAPI service. AuthN via Clerk JWKS, Supabase persistence,
            OpenRouter report generation, Razorpay subscriptions.
docs/       Design & flow documentation (BACKEND/FRONTEND_DOCUMENTATION.md).
```

Key design decisions (details in `docs/`):

- **Clerk-first auth** — JWTs verified with RS256 against Clerk's JWKS endpoint; backend never sees password credentials.
- **Atomic credit consumption** — interview credits spent via optimistic concurrency (conditional update + retries + refund path on failure).
- **Normalized data model** — interview artifacts live in six normalized tables, mirrored into JSONB `report`/`transcript` columns for fast reads and backward compatibility.
- **Environment safety** — `.env` files contain placeholders only; real secrets are injected at deploy time.

## Setup

Both apps require environment variables before they will run. Templates:

- Frontend: `frontend/.env` — `REACT_APP_CLERK_PUBLISHABLE_KEY`, `REACT_APP_BACKEND_URL` (read by Vite at startup; see `frontend/src/lib/api.js`).
- Backend: `backend/.env` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`, `CLERK_*` keys, `VAPI_PUBLIC_KEY`/`VAPI_ASSISTANT_ID`, etc.

> Use placeholder values locally; inject real secrets in the deployment environment only.

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate    # Windows
pip install -r requirements.txt
# fill in backend/.env from the .env.example template
uvicorn server:app --reload --port 8000
```

Schema migration to a fresh Supabase project:

```bash
python scripts/migrate.py            # prompts for the Supabase DB password
```

### Frontend (Vite)

```bash
cd frontend
npm install
# fill in frontend/.env
npm run dev                          # http://localhost:5173
```

## Scripts

| Command              | Where     | Description                                  |
| -------------------- | --------- | -------------------------------------------- |
| `npm run dev`        | `frontend`| Vite dev server                              |
| `npm run build`      | `frontend`| Production build to `build/`                 |
| `npm run test`       | `frontend`| Vitest suite (uses jsdom)                    |
| `npm run lint`       | `frontend`| ESLint; writes JSON report to `test_reports/`|
| `python scripts/migrate.py` | `backend`| Apply the full DB schema to Supabase   |

Backend tests:

```bash
cd backend
python -m pytest tests -o addopts=""    # pytest.ini forces xdist by default
```

## Deployment

- Backend: containerized FastAPI via `render.yaml` (Render). See `backend/` env vars above.
- Frontend: static Vite build; deploy `frontend/build/` to any host/CDN.

## License

Private / proprietary.