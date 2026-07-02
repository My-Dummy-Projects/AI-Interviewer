# AI Voice Mock Interview MVP — PRD

## Original Problem Statement
Build a simple MVP web application for conducting AI-powered voice mock interviews.
The application should be lightweight and focused on the core interview experience.
Do not implement authentication, user management, payments, dashboards, or non-essentials.

Flow: setup form (job role, experience level, duration) → Vapi voice interview → structured feedback report.

## User Personas
- **Job seeker preparing for a technical/behavioral interview** — wants quick, honest feedback without signup.
- **Career coach demoing structured evaluation** — needs a clean, professional output.

## Core Requirements (static)
- Interview setup form (Job Role, Experience Level, Duration)
- Live voice interview via Vapi (natural conversation, turn-taking, contextual follow-ups)
- Interview ends when target duration is reached OR user clicks End
- Post-call structured feedback report (Overall Score, per-skill scores, strengths, improvements, question-by-question evaluation, final recommendation, learning suggestions)
- Loading, error, completion states
- No auth, no persistence, no history

## Tech Stack
- Frontend: React 19 + React Router 7 + Shadcn UI + Tailwind + `@vapi-ai/web` v2.5.2 + sonner + framer-motion
- Backend: FastAPI + Motor (unused for MVP) + OpenAI SDK pointed at OpenRouter
- LLM: OpenRouter → `google/gemma-3-27b-it:free` (configurable)
- Voice: Vapi Web SDK using dashboard-configured Assistant (Public Key + Assistant ID)

## What's Been Implemented (2026-02-07)
- [x] `GET /api/config` — exposes Vapi public key + assistant id + `ready` flag
- [x] `POST /api/interview/feedback` — accepts transcript + metadata, calls OpenRouter, returns structured `FeedbackReport`; falls back to heuristic report when key missing / LLM errors
- [x] SetupPage — Swiss high-contrast design, job role input, experience level select, duration select, Start Interview CTA
- [x] InterviewPage — pulsing orb (AI/User states), live transcript with partials, timer w/ auto-end, Mute + End controls, dynamic variable + system prompt override sent to Vapi
- [x] ReportPage — overall score, 4 skill score cells, strengths/improvements, question-by-question accordion, learning plan, "New Interview" reset
- [x] InterviewContext for cross-page state (setup, transcript, report)
- [x] Design guidelines applied: Outfit / IBM Plex Sans / JetBrains Mono fonts, rounded-none surfaces, monochrome palette

## Backlog / Next Steps
- **P0 — Configure real keys:** user must add `VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `OPENROUTER_API_KEY` in `/app/backend/.env` for end-to-end voice + real feedback. Without these, config endpoint reports `ready: false` and feedback endpoint returns the fallback report.
- **P0 — Assistant configuration on Vapi dashboard:** create an assistant with a mock-interview system prompt that references `{{role}}`, `{{experienceLevel}}`, and `{{duration}}` variables (already passed by frontend).
- **P1 — Persistence** (session history, download report as PDF).
- **P1 — Retry mechanism** on transient LLM failures with visible error state.
- **P2 — Multiple concurrent interviewers, difficulty knob, coding-question tool integration via Vapi client-side tools.**

## Known Limitations
- Full transcript is captured client-side from Vapi's `message` events (final segments); no server-side fetch.
- MongoDB is provisioned but intentionally unused (MVP scope).
- If OpenRouter model refuses / returns malformed JSON, the fallback report is returned so UI never breaks.
