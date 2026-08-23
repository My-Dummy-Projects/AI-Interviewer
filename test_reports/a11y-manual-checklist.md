# Manual QA — Screen Reader & Cross-Browser Checklist

Project: Voxa (AI-Interviewer) frontend
Phase: 3 (Accessibility WCAG 2.1 AA) — manual verification for the user to run.

Automated coverage already passing: Lighthouse a11y 100 on all public routes,
axe-core (WCAG 2.1 A/AA) 0 serious/critical in `src/test/accessibility.test.jsx`,
`eslint` + `jsx-a11y` clean.

---

## 1. Screen Reader Checks

Pick one desktop combo to run through:

| Combo | How to launch |
|---|---|
| **NVDA (Windows + Chrome/Edge)** | Install NVDA, open app, use NVDA+Browse mode |
| **VoiceOver (macOS + Safari/Chrome)** | Cmd+F5, use VO cursor (Cmd+Opt+Arrows) |

For each task below, note PASS/FAIL and any spoken output that is confusing.

### A. Landing page (`/`)
- [ ] Page announces document title and "main" landmark; heading navigation (H)
      finds exactly one `h1` ("Speak to your future.") first.
- [ ] "Skip to main content" link is first focusable element; Tab reveals it
      (visually visible), Enter jumps to main content.
- [ ] Hero CTA buttons ("Sign in to start", "See a sample report") have
      sensible accessible names; logo icons are decorative (not announced).
- [ ] Voice preview demo is announced as static content; the rotating transcript
      does not cause disruptive live-region chatter.

### B. Sign in / Sign up (`/signin`, `/signup`)
- [ ] Each text input announces its label; password visibility toggle button
      announces "Show password"/"Hide password" and toggles on Enter.
- [ ] Error messages are announced (programmatically associated with the field
      or via `aria-live`).
- [ ] Email verification OTP step: each digit box focusable via Tab, typed
      digits move focus forward, no `autoFocus` steals focus on load.
- [ ] Link "Forgot password?" reachable and labeled.

### C. Forgot password (`/forgot-password`)
- [ ] Email → OTP → new password steps each start on the first field (no
      focus-stealing autoFocus).
- [ ] Show/hide password buttons are reachable and labeled.

### D. Pricing (`/pricing`)
- [ ] Heading navigation order: h1 ("Simple, transparent pricing.") → h2 for
      each plan (Free / Starter / Pro) → h2 "Compare plans side by side".
- [ ] "Contact us" link is distinguishable (underlined) and reachable.
- [ ] Plan subscription buttons announced with action + plan name.

### E. Dashboard / Interview / Report (authenticated — requires backend)
- [ ] After login, page has a single `h1`; stat cards use real headings or
      proper label/aria semantics (no heading soup).
- [ ] Interview page announces interviewer ("Aria") as an h1; mute/end-call
      buttons have accessible names; transcript region has `aria-label`
      "Live interview transcript".
- [ ] Report page headings navigable; score not read as meaningless numeric blob.

---

## 2. Keyboard-Only Checks (no mouse)

- [ ] Full task flow operable with Tab/Shift+Tab/Enter/Space/Arrows/Escape.
- [ ] Visible `focus-visible` ring on every interactive element (inputs, buttons,
      links, Radix accordion/select).
- [ ] Radix Accordion (Report page) expands/collapses and moves focus correctly.
- [ ] Sonner toasts are announced and dismissible via their close button.
- [ ] No element traps focus (modal-free paths; confirm-modal opens/closes with
      Escape and restores focus).

---

## 3. Cross-Browser Matrix

| Browser | Version tested | Landing | SignIn/SignUp | Pricing | Console errors |
|---|---|---|---|---|---|
| Chrome | latest | | | | |
| Edge | latest | | | | |
| Firefox | latest | | | | |
| Safari | latest | | | | |
| Mobile Chrome (Android) | latest | | | | |
| Mobile Safari (iOS) | latest | | | | |

Known/environmental: backend not running locally → 401 profile call is expected
during local testing and unrelated to the UI. `vite preview` is polluted by the
local Console Ninja extension; use `npx serve -s build` for clean measurement.

---

## 4. Contrast & Motion Spot Checks

- [ ] `prefers-reduced-motion: reduce` (OS setting) disables framer-motion
      enter/exit animations (wrapped via `MotionConfig reducedMotion="user"`).
- [ ] Body text on `#0a0a0a`/`#050505` backgrounds passes 4.5:1; UI/large text
      passes 3:1 (Lighthouse `color-contrast` passes on all public routes).
- [ ] Focus ring visible against both light CTA buttons and dark backgrounds.

Return results here (or mark issues as new GitHub issues) so Phase 4 can verify
remaining items.