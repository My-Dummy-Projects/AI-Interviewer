# AI Interviewer Documentation Index

This project now has separate documentation for the two main parts of the application:

- [Backend Documentation](BACKEND_DOCUMENTATION.md)
- [Frontend Documentation](FRONTEND_DOCUMENTATION.md)
- [User Flow](USER_FLOW.md)

## Quick Summary

AI Interviewer is a full-stack application for practicing interviews through voice sessions, receiving AI-generated feedback, and reviewing saved interview reports.

### Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Tailwind CSS + CRACO |
| **Backend** | FastAPI + Pydantic v2 |
| **Auth** | Clerk (JWT via JWKS verification) |
| **Database** | Supabase / PostgreSQL |
| **Voice** | Vapi SDK (realtime voice) |
| **LLM** | OpenRouter (AsyncOpenAI) |
| **Payments** | Razorpay |
| **Dependencies** | PyJWT, supabase-py, razorpay, openai |

### Key Architectural Decisions

- **Clerk-first auth** with Supabase fallback — JWTs verified via RS256 against Clerk's JWKS endpoint
- **Atomic credit consumption** — optimistic concurrency with conditional update + 3 retries + refund path
- **Normalized data model** — interview artifacts stored across 6 normalized tables (not just JSONB) for queryability
- **Dual-write strategy** — JSONB columns `report`/`transcript` written alongside normalized tables for backward compatibility
- **Environment safety** — `.env` contains only placeholder values; secrets injected at deploy time

### Recent Security & Quality Fixes

- JWT signature bypass (raw payload decode) removed
- Live secrets redacted from `.env`
- Credit race condition fixed (read-then-write → optimistic lock)
- Credit refund path added on save failure
- CORS wildcard no longer paired with credentials
- Password validation enforced at Pydantic model level
- `datetime.utcnow()` replaced with timezone-aware UTC
- Module-level cross-user state moved to `useRef`
