# Backend Documentation

## Overview

The backend is a FastAPI service that powers the interview experience for AI Interviewer. It receives transcript data, generates interview feedback, authenticates requests, and persists interview results to Supabase.

## Tech Stack

- Python 3.13+
- FastAPI
- Pydantic models
- Supabase Python client
- Clerk JWT validation
- OpenRouter API for LLM-based feedback

## Main Entry Points

- app.py: creates the FastAPI app and registers routers
- server.py: server startup entry point
- routes_interview.py: interview feedback endpoint
- routes_user.py: profile and interview history endpoints
- routes_auth.py: authentication-related endpoints
- feedback.py: feedback generation and database persistence
- deps.py: request authentication and user resolution
- config.py: environment configuration and shared service initialization

## Request Flow

### Interview feedback flow

1. The frontend sends a POST request to /api/interview/feedback.
2. The request includes the interview transcript and metadata.
3. The backend builds an LLM prompt from the transcript.
4. The OpenRouter API returns a structured feedback report.
5. The backend persists the interview and related data to Supabase.

### User profile and history flow

1. The frontend sends a request with a Clerk access token.
2. deps.py validates the token and resolves the authenticated user.
3. routes_user.py reads or writes user-specific data in Supabase.

## Authentication

Authentication is currently handled with Clerk-issued JWTs.

### How it works

- The frontend obtains a Clerk access token.
- The token is sent in the Authorization header as a Bearer token.
- deps.py validates the token using Clerk’s JWKS endpoint and issuer URL.
- The decoded subject claim is used as the authenticated user identity.

### Important note

Because Clerk user IDs are not always UUIDs, the backend normalizes the subject into a UUID-compatible form before using it for Supabase persistence.

## API Routes

### Interview routes

- POST /api/interview/feedback
  - Accepts transcript and interview metadata
  - Returns the generated feedback report
  - Saves interview data to Supabase

### User routes

- GET /api/user/profile
  - Returns the current user profile
- PUT /api/user/profile
  - Updates the current user profile
- GET /api/user/interviews
  - Returns interview history for the current user
- GET /api/user/interviews/{interview_id}
  - Returns a single saved interview record
- GET /api/user/dashboard-stats
  - Returns dashboard summary metrics

### Auth routes

- POST /api/auth/signup
- POST /api/auth/signin
- POST /api/auth/signout
- POST /api/auth/reset-password
- POST /api/auth/update-password
- POST /api/auth/refresh

## Persistence Model

The backend writes interview-related records into Supabase tables such as:

- interviews
- transcript_turns
- skill_scores
- question_evaluations
- interview_strengths
- interview_improvements
- learning_suggestions

The schema is defined in schema.sql.

## Feedback Generation

The backend uses OpenRouter to generate structured feedback from the transcript.

The returned feedback includes:

- overall score
- skill breakdown
- strengths
- improvements
- per-question evaluations
- final recommendation
- summary

If the LLM call fails, the backend falls back to a deterministic placeholder report so the app can still continue.

## Error Handling

The backend uses FastAPI exception handling and returns clear HTTP error responses for:

- missing authentication
- invalid or expired tokens
- missing transcript data
- failed persistence operations

## Environment Variables

The backend expects configuration values for:

- CLERK_SECRET_KEY
- CLERK_JWT_ISSUER
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OPENROUTER_API_KEY
- OPENROUTER_MODEL
- VAPI_PUBLIC_KEY
- VAPI_ASSISTANT_ID

## Current Status

The backend currently supports:

- Clerk-authenticated requests
- interview report generation
- interview persistence to Supabase
- profile and history retrieval
- dashboard statistics aggregation
