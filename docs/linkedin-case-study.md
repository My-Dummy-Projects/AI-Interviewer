# Case Study: Building Voxa — An AI-Powered Voice Interview Coach

**Role:** Full-stack developer  
**Stack:** React 19 + FastAPI + Supabase + Vapi + OpenRouter + Razorpay  
**Timeline:** 6 weeks  
**Team:** Solo

---

## The Problem

Mock interview tools fall into two buckets: text-only chatbots that feel nothing like a real interview, or expensive human coaching that doesn't scale. Job seekers preparing for technical interviews needed a way to practice realistic, conversational voice interviews with instant, structured feedback — without scheduling or paying per session.

## The Goal

Build a production-grade SaaS platform where a candidate can:

1. Configure a role and level (e.g., "Senior Backend Engineer")
2. Speak through a natural voice interview with an AI that listens and adapts
3. Receive an instant hiring-manager-grade scorecard with per-question evaluation
4. Track progress over time with analytics and a personalized learning plan

All while keeping it affordable (Free tier available) and accessible from a browser.

## Architecture Decisions

### Frontend: React 19 + Tailwind + Framer Motion

Chose React 19 with craco for the SPA. Tailwind CSS allowed rapid iteration on a dark-mode-first design system without fighting CSS specificity. Framer Motion handled entrance animations, the live interview waveform, and the pulsing "listening" orb.

Key decisions:
- **Lazy-loaded routes** via `React.lazy` to keep the initial bundle small
- **TanStack React Query** for server state — automatic cache invalidation after payments and profile updates
- **Clerk** for auth — JWKS-based token verification meant the backend could validate sessions without a database lookup

### Backend: FastAPI + Supabase

FastAPI's async support was essential for the interview feedback pipeline — an LLM call via OpenRouter with a 60-second timeout that needed to not block other requests.

The Supabase schema has 10 normalized tables with Row-Level Security. Every interview, transcript turn, skill score, and learning suggestion is stored in its own table with proper foreign keys. A dual-write strategy writes the full LLM response as JSONB alongside the normalized rows for backup.

The trickiest part was **atomic interview credit consumption**. Multiple rapid requests could race on the same user's subscription row. Solved with an optimistic retry loop (up to 3 attempts) that re-reads the current count and updates only if the row hasn't changed — plus a refund path for abandoned interviews.

### Voice: Vapi SDK

Vapi handles the realtime voice conversation. The frontend opens a WebSocket connection, Vapi streams audio, and the AI interviewer ("Aria") generates responses via a prompt-engineered assistant. The full transcript is saved and sent to the LLM for scoring after the call ends.

### Payments: Razorpay

Indian market pricing (₹299/₹499 per month). The flow: frontend requests an order → backend creates a Razorpay order → frontend opens Razorpay checkout → webhook + client-side verification updates the subscription. Cache invalidation on the subscription query key triggers an immediate UI update.

## What Went Well

**The scoring pipeline.** The LLM prompt is structured to return a tightly validated JSON schema — 4 skill scores (0–100), per-question evaluations, a Hire/No Hire decision, and learning suggestions. Parsing this reliably took iteration, but once stable it meant zero manual review.

**The interview experience.** Test users consistently reported that the voice interaction felt more realistic than they expected. Aria's contextual follow-ups (pressing on weak answers, moving past strong ones) made each run unique.

**The dark-mode design system.** Establishing a single source of truth in `design_guidelines.json` — with exact color tokens, spacing scales, and motion curves — prevented drift as the UI grew to 10 pages.

## What I'd Do Differently

**Seed the plan limits from the backend.** Plan definitions (Free/Starter/Pro limits) are duplicated in both frontend constants and backend Python dicts. A single `/api/config` endpoint that serves plan config would eliminate the mismatch risk.

**Add a text-only fallback earlier.** Voice is the core differentiator, but microphone access is a barrier. A text-input mode would have expanded the addressable market from day one.

**More comprehensive testing on the payment webhook.** Razorpay's webhook retry logic and idempotency required careful handling. Several edge cases around the "user closes browser before success callback" scenario were caught late.

## Results

- **3-tier subscription model** with Free entry point, Starter (₹299/mo), and Pro (₹499/mo)
- **End-to-end interview flow** from role configuration to scored report in under 10 minutes
- **10 database tables** with Row-Level Security enforcing user data isolation
- **20+ API endpoints** covering auth, profiles, interviews, subscriptions, payments, and feedback
- **30+ documented edge cases** across auth, payments, concurrency, and UX

## Key Takeaways

1. **Voice interactions are harder than text** — but the realism gap is worth it. Users tolerate higher latency when the interaction feels natural.
2. **Atomic credit consumption needs a retry strategy.** Optimistic locking with a retry loop prevented double-spending without the complexity of database-level locks.
3. **A normalized data model + JSONB backup** is a pragmatic middle ground. Structured queries work for dashboards and analytics; the raw JSONB is there for debugging and re-scoring.
4. **Prompt engineering is a first-class concern.** The difference between "good enough" scoring and genuinely useful feedback was entirely in the prompt structure and the validation layer around the LLM output.

---

*Built with React 19, FastAPI, Supabase, Clerk, Vapi, OpenRouter, Razorpay, and a lot of late-night prompt tweaking.*
