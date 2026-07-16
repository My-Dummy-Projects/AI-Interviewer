# Frontend Documentation

## Overview

The frontend is a React-based single-page application that provides the user-facing experience for AI Interviewer. It handles authentication, interview setup, live voice interviews, feedback viewing, and historical report browsing.

## Tech Stack

- React 19
- React Router
- Tailwind CSS
- Lucide icons
- Clerk React SDK
- Axios
- Sonner for toast notifications
- Vapi client integration

## Main Structure

### Pages

- LandingPage: entry point and product overview
- SignInPage / SignUpPage: authentication UI
- SetupPage: interview configuration
- InterviewPage: live voice interview experience
- ReportPage: feedback and interview summary
- DashboardPage: saved interviews and progress summary
- ProfilePage: user profile view
- FeedbackPage: product feedback submission

### Context Providers

- AuthContext: manages Clerk auth state and exposes login, signup, signout, and verification helpers
- InterviewContext: holds the current interview setup, transcript, and report state during a session

### Shared UI and Helpers

- components/: reusable UI primitives and layout components
- lib/api.js: central API client for backend requests
- lib/vapiClient.js: Vapi integration helper
- lib/utils.js: app utility functions

## Authentication Flow

The frontend uses Clerk for authentication.

### Current behavior

- The app wraps the app in ClerkProvider with the publishable key from frontend/.env
- AuthContext uses Clerk hooks to detect sign-in state
- When a user is signed in, the frontend requests a Clerk access token
- That token is attached to API requests through the shared API client

## Interview Flow

### Setup

The SetupPage collects:

- job role
- experience level
- interview duration

These values are stored in InterviewContext and used to initialize the session.

### Live interview

The InterviewPage connects to Vapi and starts a voice-based mock interview.

It handles:

- microphone/audio state
- transcript collection
- timer tracking
- end-of-interview submission

When the interview ends, the frontend sends the transcript and metadata to the backend via the shared API client.

## Report and Dashboard Experience

After the backend returns the feedback report:

- the user is taken to the ReportPage
- the report is stored in context and displayed in the UI
- the dashboard can load historical interviews from the backend for review

## API Integration

The frontend uses a shared API wrapper in lib/api.js.

It exposes methods for:

- getProfile
- updateProfile
- getDashboardStats
- getInterviews
- getInterview
- submitFeedback
- submitToolFeedback

These functions attach the current bearer token automatically when the user is authenticated.

## Routing

The app uses React Router for navigation between:

- home
- sign in / sign up
- setup
- interview
- report
- dashboard
- profile

## Styling

The UI is built with Tailwind CSS and custom component styling.

The app uses:

- dark theme styling
- custom motion and layout patterns
- reusable button/input/label components

## Current Status

The frontend currently supports:

- Clerk-based authentication
- protected API requests
- interview setup and execution
- AI feedback report viewing
- interview history loading and display
