# Delete Account Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inert "Coming soon" Danger-zone button with a working permanent account-deletion flow: purge all Supabase app data via a new `DELETE /api/user/account` endpoint, then remove the Clerk identity client-side and clear local auth state.

**Architecture:** Backend adds a thin hard-delete endpoint (candidate-ID resolution → `purge_user_data()` → FK cascade wipes the data tree). Frontend extends the shared `ConfirmModal` with a type-your-email gate, calls the endpoint, then chains Clerk `user.delete()` → `signout()` → navigate. One round-trip; no config/schema changes.

**Tech Stack:** FastAPI 0.141 + supabase-py (service role) + SlowAPI; React 19 + Vite 7 + Vitest 4 + React Query 5 + Clerk 5 + Sonner + framer-motion.

## Global Constraints

- Semantics: **immediate hard delete** — no soft delete, grace period, restore, or purge scheduler.
- Clerk auth record is deleted **client-side** via Clerk `user.delete()`; `CLERK_SECRET_KEY` must **NOT** be added to `backend/config.py`.
- Confirmation gate is **client-side only**: case-insensitive, trimmed email match; the endpoint does NOT verify the typed email.
- Endpoint contract: `DELETE /api/user/account`, rate limit `@limiter.limit("5/minute")`, success = **`204` and idempotent** (204 even when no rows matched), failure = `500` generic detail (log real error server-side), `503` when `supabase is None`.
- `backend/pytest.ini` must **not** be modified (`addopts = -n 2 --dist loadscope`).
- New ProfilePage controls get `data-testid` values: `delete-account-button`, `delete-account-confirm-input`, `delete-account-confirm-button`.
- **No git on this machine** (git is not installed; workspace is not a repo): omit all commit steps. Record a change summary in the final task instead.
- Commands (exact): backend from `backend/`: `python -m pytest tests -o addopts=""`; frontend from `frontend/`: `npm run test`, `npm run lint`.
- Verified toolchain: Python 3.13.9, Node v24.12.0, npm 10.8.2. Verified green baselines: backend `2 passed`, frontend `3 passed (1 file)` (the `HTMLCanvasElement getContext` warnings are pre-existing noise — ignore them).

---

### Task 1: Backend `purge_user_data()` helper + candidate-resolution coverage

**Files:**
- Create: `backend/tests/test_delete_account.py`
- Modify: `backend/routes_user.py` (insert after `get_user_id_candidates()`, currently ends line 181)

**Interfaces:**
- Consumes: `supabase` from `config` (already imported in `routes_user.py`), `normalize_user_id` from `deps` (already imported), existing `get_user_id_candidates(user_id, email="", client=None) -> list[str]`.
- Produces: `purge_user_data(candidate_ids: list[str], client=None) -> None` — hard-deletes `interviews` rows then `user_profiles` rows for every candidate id; raises on client error; no-op when `client`/`supabase` is falsy or `candidate_ids` is empty. Task 2's endpoint calls this.

- [ ] **Step 1: Write the failing test file**

Create `backend/tests/test_delete_account.py`:

```python
"""Unit tests for the delete-account data purge (no live database)."""
from types import SimpleNamespace

import pytest

from deps import normalize_user_id
from routes_user import get_user_id_candidates, purge_user_data


class FakeDB:
    """Minimal stand-in for the supabase client used by the delete flow."""

    def __init__(self, profile_rows=None):
        self.calls = []
        self.profile_rows = profile_rows or []

    def table(self, name):
        return FakeTable(self, name)


class FakeTable:
    def __init__(self, db, name):
        self._db = db
        self._name = name

    def delete(self):
        db, table = self._db, self._name

        class _DeleteQuery:
            def in_(_self, column, values):
                db.calls.append(("delete", table, column, list(values)))
                return _self

            def execute(_self):
                return SimpleNamespace(data=[])

        return _DeleteQuery()

    def select(self, *_args, **_kwargs):
        db, table = self._db, self._name

        class _SelectQuery:
            def eq(_self, column, value):
                db.calls.append(("select", table, column, value))
                return _self

            def execute(_self):
                rows = db.profile_rows if table == "user_profiles" else []
                return SimpleNamespace(data=rows)

        return _SelectQuery()


def test_purge_deletes_interviews_then_profiles_for_all_candidates():
    db = FakeDB()
    candidates = [
        "aaaaaaaa-1111-1111-1111-111111111111",
        "bbbbbbbb-2222-2222-2222-222222222222",
    ]

    purge_user_data(candidates, client=db)

    assert db.calls == [
        ("delete", "interviews", "user_id", candidates),
        ("delete", "user_profiles", "user_id", candidates),
    ]


def test_purge_is_a_noop_without_candidates():
    db = FakeDB()

    purge_user_data([], client=db)

    assert db.calls == []


def test_purge_propagates_client_errors():
    class BrokenDB:
        def table(self, _name):
            raise RuntimeError("connection lost")

    with pytest.raises(RuntimeError, match="connection lost"):
        purge_user_data(["aaaaaaaa-1111-1111-1111-111111111111"], client=BrokenDB())


def test_candidates_include_email_matched_legacy_profiles():
    db = FakeDB(profile_rows=[{"user_id": "legacy-row-id"}])

    candidates = get_user_id_candidates("user_abcDEF123", "user@example.com", client=db)

    assert candidates == [
        normalize_user_id("user_abcDEF123"),
        normalize_user_id("legacy-row-id"),
    ]
    assert ("select", "user_profiles", "email", "user@example.com") in db.calls
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `python -m pytest tests/test_delete_account.py -o addopts="" -v`
Expected: FAIL — `ImportError: cannot import name 'purge_user_data' from 'routes_user'` (the other 3 tests fail on the same import).

- [ ] **Step 3: Write the minimal implementation**

In `backend/routes_user.py`, insert immediately after `get_user_id_candidates()` (after line 181, before `normalize_interview_record`):

```python
def purge_user_data(candidate_ids: list[str], client=None) -> None:
    """Hard-delete every app-owned row for the given user IDs.

    Interviews are deleted first so orphan rows (no parent
    ``user_profiles`` row) are still removed; deleting ``user_profiles``
    afterwards cascades the remaining children (subscriptions, feedback,
    and any leftover interview children).
    """
    db = client or supabase
    if not db or not candidate_ids:
        return
    db.table("interviews").delete().in_("user_id", candidate_ids).execute()
    db.table("user_profiles").delete().in_("user_id", candidate_ids).execute()
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `backend/`: `python -m pytest tests/test_delete_account.py -o addopts="" -v`
Expected: `4 passed`.

- [ ] **Step 5: Run the neighboring unit tests for regressions**

Run from `backend/`: `python -m pytest tests/test_delete_account.py tests/test_interview_persistence.py -o addopts=""`
Expected: `6 passed`.

---

### Task 2: Backend `DELETE /api/user/account` endpoint

**Files:**
- Modify: `backend/routes_user.py` — line 8 (add `Response` import) and after `update_profile()` (after line 309)
- Modify: `backend/tests/test_delete_account.py` — append one test

**Interfaces:**
- Consumes: `purge_user_data(candidate_ids)` and `get_user_id_candidates(current_user.id, email)` from Task 1; `get_current_user`, `normalize_user_id` from `deps`; `limiter` from `rate_limit`; `supabase`, `logger` from `config`.
- Produces: HTTP route `DELETE /api/user/account` → `204` (empty body), `503` if unconfigured, `500` on purge failure, `401` via auth dependency. Task 4's `api.deleteAccount()` targets this path.

- [ ] **Step 1: Write the failing route-registration test**

Append to `backend/tests/test_delete_account.py`:

```python
def test_delete_account_route_is_registered():
    from app import app

    paths = app.openapi()["paths"]
    assert "delete" in paths.get("/api/user/account", {})
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `python -m pytest tests/test_delete_account.py::test_delete_account_route_is_registered -o addopts="" -v`
Expected: FAIL — `KeyError`/`AssertionError`: `"/api/user/account"` not in `paths`.

- [ ] **Step 3: Implement the endpoint**

3a. In `backend/routes_user.py` line 8, change the FastAPI import to include `Response`:

```python
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
```

3b. Insert after `update_profile()` (after line 309, before `@api_router_user.get("/interviews")`):

```python
@api_router_user.delete("/account", status_code=204)
@limiter.limit("5/minute")
async def delete_account(request: Request, current_user=Depends(get_current_user)):
    """Permanently delete the caller's account and all app data."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    email = current_user.email or ""
    candidates = get_user_id_candidates(current_user.id, email)
    try:
        purge_user_data(candidates)
    except Exception as e:
        logger.error(f"delete-account failed for {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account")
    logger.info(f"delete-account: purged {len(candidates)} candidate(s) for {current_user.id}")
    return Response(status_code=204)
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `backend/`: `python -m pytest tests/test_delete_account.py -o addopts="" -v`
Expected: `5 passed`.

- [ ] **Step 5: Run all backend unit tests**

Run from `backend/`: `python -m pytest tests/test_delete_account.py tests/test_interview_persistence.py -o addopts=""`
Expected: `7 passed`. (Do NOT run `tests/test_api.py` — it hits a live server and is unrelated to this feature.)

---

### Task 3: Frontend `ConfirmModal` gate/loading/destructive extension

**Files:**
- Create: `frontend/src/test/confirm-modal.test.jsx`
- Modify: `frontend/src/components/ui/confirm-modal.jsx` (full rewrite of the component body)

**Interfaces:**
- Consumes: existing `Button` (`@/components/ui/button`), plus `Input` (`@/components/ui/input`) and `Label` (`@/components/ui/label`) — all already used elsewhere; framer-motion, lucide-react.
- Produces: `ConfirmModal` props — existing `{open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel}` unchanged (DashboardPage logout usage keeps working with no gate) plus new optional `{requireText, inputLabel, inputPlaceholder, inputTestId = "confirm-modal-input", confirmTestId = "confirm-modal-confirm", loading = false, destructive = false}`. Confirm stays disabled until `text.trim().toLowerCase() === String(requireText).trim().toLowerCase()` (or `requireText` falsy). Task 5 passes `inputTestId="delete-account-confirm-input"` and `confirmTestId="delete-account-confirm-button"`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/test/confirm-modal.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "@/components/ui/confirm-modal";

function renderModal(props = {}) {
  render(
    <ConfirmModal
      open
      title="Delete account"
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />
  );
}

describe("ConfirmModal", () => {
  it("renders no gate and an enabled confirm when requireText is omitted", () => {
    renderModal({ confirmLabel: "Sign out" });

    expect(screen.queryByTestId("confirm-modal-input")).toBeNull();
    expect(screen.getByTestId("confirm-modal-confirm")).toBeEnabled();
  });

  it("keeps confirm disabled until typed text matches (case-insensitive, trimmed)", async () => {
    const onConfirm = vi.fn();
    renderModal({ requireText: "user@example.com", onConfirm });

    const input = screen.getByTestId("confirm-modal-input");
    const confirm = screen.getByTestId("confirm-modal-confirm");

    expect(confirm).toBeDisabled();
    await userEvent.type(input, "other@example.com");
    expect(confirm).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, "  User@Example.COM ");
    expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables the input and confirm while loading", () => {
    renderModal({ requireText: "user@example.com", loading: true });

    expect(screen.getByTestId("confirm-modal-input")).toBeDisabled();
    expect(screen.getByTestId("confirm-modal-confirm")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("disables confirm while loading even without a gate", () => {
    renderModal({ loading: true });

    expect(screen.getByTestId("confirm-modal-confirm")).toBeDisabled();
  });

  it("uses destructive styling when destructive is set", () => {
    renderModal({ requireText: "x@y.z", destructive: true });

    expect(screen.getByTestId("confirm-modal-confirm").className).toContain("bg-red-500");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `frontend/`: `npx vitest run src/test/confirm-modal.test.jsx`
Expected: all 5 FAIL — the current modal has no `data-testid` on the confirm button (so even test 1 fails with "Unable to find an element by: [data-testid=confirm-modal-confirm]") and never renders an input (tests 2-3 fail on `confirm-modal-input`).

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `frontend/src/components/ui/confirm-modal.jsx` with:

```jsx
/**
 * Animated confirmation dialog (custom, not from shadcn): dims the screen,
 * shows a title/message, and exposes confirm/cancel callbacks.
 *
 * Optional typed-text gate: pass `requireText` to keep the confirm button
 * disabled until the user types that exact text (case-insensitive,
 * trimmed). `loading` disables both buttons and shows a spinner on
 * confirm. `destructive` styles the confirm button red.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  requireText,
  inputLabel,
  inputPlaceholder,
  inputTestId = "confirm-modal-input",
  confirmTestId = "confirm-modal-confirm",
  loading = false,
  destructive = false,
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const matches =
    !requireText || text.trim().toLowerCase() === String(requireText).trim().toLowerCase();
  const confirmDisabled = !matches || loading;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl"
          >
            <button
              onClick={onCancel}
              disabled={loading}
              aria-label="Close"
              className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all disabled:opacity-40"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <div className="text-center">
              <h3
                className="text-lg font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {title}
              </h3>
              {message && (
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{message}</p>
              )}
            </div>

            {requireText && (
              <div className="mt-5 text-left">
                <Label htmlFor="confirm-modal-gate" className="label-overline mb-2 block">
                  {inputLabel || `Type "${requireText}" to confirm`}
                </Label>
                <Input
                  id="confirm-modal-gate"
                  data-testid={inputTestId}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={inputPlaceholder || ""}
                  autoComplete="off"
                  disabled={loading}
                  className="h-11 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-sm text-white placeholder:text-zinc-600"
                />
              </div>
            )}

            <div className="mt-7 flex items-center gap-3">
              <Button
                onClick={onCancel}
                disabled={loading}
                variant="outline"
                className="flex-1 rounded-full h-11 px-5 bg-transparent border-white/15 hover:bg-white/5 text-white text-sm font-medium disabled:opacity-40"
              >
                {cancelLabel || "Cancel"}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={confirmDisabled}
                data-testid={confirmTestId}
                className={`flex-1 rounded-full h-11 px-5 text-sm font-semibold disabled:bg-white/10 disabled:text-zinc-600 ${
                  destructive
                    ? "bg-red-500 hover:bg-red-400 text-white"
                    : "bg-cyan-500 hover:bg-cyan-400 text-black"
                }`}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {confirmLabel || "Confirm"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run from `frontend/`: `npx vitest run src/test/confirm-modal.test.jsx`
Expected: `5 passed`.

- [ ] **Step 5: Verify the Dashboard logout modal still works**

Run from `frontend/`: `npm run test`
Expected: `2 files passed`, `8 passed` total (5 new + 3 existing accessibility tests). The logout modal at `DashboardPage.jsx:1052` passes no new props, so it renders gate-free — covered by test 1.

---

### Task 4: Frontend `api.deleteAccount()` + `useDeleteAccountMutation()`

**Files:**
- Create: `frontend/src/test/api.test.js`
- Modify: `frontend/src/lib/api.js` (after `updateProfile`, line 87)
- Modify: `frontend/src/hooks/useApiMutations.js` (append)

**Interfaces:**
- Consumes: axios wrapper internals (`authHeaders()`, `API` base, module-level `_bearerToken` via `setBearerToken`).
- Produces: `api.deleteAccount(): Promise<void>` — `DELETE {API}/user/account` with bearer header, resolves on 204, rejects on error; `useDeleteAccountMutation()` — React Query mutation with `mutationFn: () => api.deleteAccount()` and no cache invalidation (signout clears the cache). Task 5 calls `deleteAccount.mutateAsync()`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/test/api.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import api, { setBearerToken } from "@/lib/api";

describe("api.deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setBearerToken("test-token");
  });

  it("sends DELETE /api/user/account with the bearer token", async () => {
    axios.delete.mockResolvedValue({ status: 204, data: null });

    await api.deleteAccount();

    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/user\/account$/),
      { headers: { Authorization: "Bearer test-token" } }
    );
  });

  it("propagates failures so the caller can keep the modal open", async () => {
    axios.delete.mockRejectedValue(new Error("network down"));

    await expect(api.deleteAccount()).rejects.toThrow("network down");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `frontend/`: `npx vitest run src/test/api.test.js`
Expected: FAIL — `TypeError: api.deleteAccount is not a function`.

- [ ] **Step 3: Implement the API method and mutation**

3a. In `frontend/src/lib/api.js`, insert after `updateProfile` (after line 87), still inside the `api` object:

```js
  async deleteAccount() {
    await axios.delete(`${API}/user/account`, {
      headers: authHeaders(),
    });
  },
```

3b. In `frontend/src/hooks/useApiMutations.js`, append:

```js
export function useDeleteAccountMutation() {
  return useMutation({
    mutationFn: () => api.deleteAccount(),
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `frontend/`: `npx vitest run src/test/api.test.js`
Expected: `2 passed`.

- [ ] **Step 5: Run the whole frontend suite**

Run from `frontend/`: `npm run test`
Expected: `3 files passed`, `10 passed` total.

---

### Task 5: ProfilePage danger-zone wiring

**Files:**
- Modify: `frontend/src/pages/ProfilePage.jsx` — imports (lines 32-37), state (near line 74), new handler (after `handleSignOut`), Danger zone button (lines 453-459), modal at end of JSX (before closing `</div>` at line 466)

**Interfaces:**
- Consumes: `ConfirmModal` props from Task 3; `useDeleteAccountMutation()` from Task 4; `useAuth().signout` (existing, line 58), `useUser().user` as `clerkUser` (existing, line 66), `useNavigate()` (existing, line 57), `toast` from sonner (existing).
- Produces: no new exports — page-level behavior only. Testids: `delete-account-button`, `delete-account-confirm-input`, `delete-account-confirm-button`.

- [ ] **Step 1: Add imports and state**

1a. Change the mutations import (line 35) to:

```jsx
import { useUpdateProfileMutation, useDeleteAccountMutation } from "@/hooks/useApiMutations";
```

1b. Add next to the existing modal imports (after line 32, `useAuth` import):

```jsx
import { ConfirmModal } from "@/components/ui/confirm-modal";
```

1c. Add state after `const updateProfile = useUpdateProfileMutation();` (line 74):

```jsx
const [deleteOpen, setDeleteOpen] = useState(false);
const [deleting, setDeleting] = useState(false);
const deleteAccount = useDeleteAccountMutation();
```

- [ ] **Step 2: Add the deletion handler**

Insert after `handleSignOut` (after line 103):

```jsx
const handleDeleteAccount = async () => {
  if (deleting) return;
  setDeleting(true);
  try {
    await deleteAccount.mutateAsync();
  } catch {
    toast.error("Couldn't delete account — nothing was changed");
    setDeleting(false);
    return;
  }
  try {
    await clerkUser?.delete();
  } catch {
    toast.warning("Your data is deleted, but your sign-in couldn't be removed — sign out to finish.");
  }
  try {
    await signout();
  } catch {
    // Local auth state below is cleared regardless; a stale Clerk session is harmless.
  }
  setDeleting(false);
  setDeleteOpen(false);
  navigate("/");
};
```

- [ ] **Step 3: Replace the Danger zone button**

Replace the disabled "Coming soon" `Button` (lines 453-459) inside the danger-zone row with:

```jsx
<Button
  onClick={() => setDeleteOpen(true)}
  variant="outline"
  data-testid="delete-account-button"
  className="rounded-full h-9 px-4 text-xs font-medium bg-transparent border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-300 shrink-0"
>
  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
  Delete account
</Button>
```

- [ ] **Step 4: Mount the confirmation modal**

Insert immediately before the final closing `</div>` of the component return (after the Danger zone block, before line 466 `</div>` / 467 `);`):

```jsx
<ConfirmModal
  open={deleteOpen}
  destructive
  loading={deleting}
  title="Delete account"
  message="This permanently deletes your profile, all interview history, your subscription record, and your account. This cannot be undone."
  confirmLabel="Delete forever"
  cancelLabel="Cancel"
  requireText={profile?.email || clerkUser?.primaryEmailAddress?.emailAddress || user?.email || ""}
  inputLabel="Type your email to confirm"
  inputPlaceholder={profile?.email || "you@example.com"}
  inputTestId="delete-account-confirm-input"
  confirmTestId="delete-account-confirm-button"
  onConfirm={handleDeleteAccount}
  onCancel={() => { if (!deleting) setDeleteOpen(false); }}
/>
```

Note: if `requireText` resolves to `""` (no email anywhere — practically impossible for a signed-in Clerk user), the modal renders with no gate rather than being permanently blocked. Do not add extra handling.

- [ ] **Step 5: Lint**

Run from `frontend/`: `npm run lint`
Expected: exit code 0 (report written to `../test_reports/eslint-report.json`). Fix any new errors in `ProfilePage.jsx`/`confirm-modal.jsx` before proceeding.

- [ ] **Step 6: Full frontend test run**

Run from `frontend/`: `npm run test`
Expected: `3 files passed`, `10 passed`.

- [ ] **Step 7: Manual verification checklist**

Run from `frontend/`: `npm run dev`, then in the browser (requires a real signed-in account):

1. `/profile` → Danger zone shows an enabled red **Delete account** button (no "Coming soon").
2. Click it → modal opens; typing a wrong email keeps **Delete forever** disabled; typing the exact account email (case-insensitive) enables it.
3. Cancel closes the modal; clicking the backdrop closes it; neither deletes anything (sign back in → data intact).
4. Confirm → spinner, input/buttons disabled → signed out and redirected off `/profile`.
5. Sign back in → profile is empty (display name reset), interview history gone, plan back to Free.
6. `/dashboard` → logout `ConfirmModal` still opens, confirms, and signs out (backward compatibility).

Record the observed results in the final summary.

---

### Task 6: CHANGELOG entry + final verification

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: nothing runtime.
- Produces: documented feature entry under `[Unreleased]`.

- [ ] **Step 1: Update the changelog**

In `CHANGELOG.md`:

1a. Replace the heading `## [Unreleased] — Codebase Cleanup Pass (2026-09-05)` with `## [Unreleased]`.

1b. Insert an `### Added` block after the `**Diff summary:** ...` line and before the existing `---` separator:

```markdown
### Added

- **Delete account** (Settings → Danger zone): `DELETE /api/user/account`
  hard-deletes the caller's Supabase data (profiles, interviews and their
  child rows, subscriptions, feedback — via FK cascade); the frontend then
  removes the Clerk identity via `user.delete()`, clears local auth state,
  and redirects to `/`. The confirm dialog requires typing the account
  email. Rate-limited to 5/minute; success is an idempotent `204`.
```

- [ ] **Step 2: Run all verification commands**

Run in order:

1. From `backend/`: `python -m pytest tests/test_delete_account.py tests/test_interview_persistence.py -o addopts=""` → `7 passed`.
2. From `frontend/`: `npm run test` → `3 files passed`, `10 passed` (canvas warnings are pre-existing noise).
3. From `frontend/`: `npm run lint` → exit 0.

- [ ] **Step 3: Spec-conformance checklist (read-only)**

Verify each line by reading the diff (no git available — re-read the touched files):

- [ ] `routes_user.py`: `DELETE /account` route, `5/minute` limit, `204` idempotent, generic `500`, logs real error, no email verification.
- [ ] `config.py` untouched (no `CLERK_SECRET_KEY`).
- [ ] No new tables/columns/migrations; `schema.sql` untouched.
- [ ] `pytest.ini` untouched.
- [ ] `ProfilePage.jsx`: three required `data-testid` values present; orchestration order is deleteAccount → `clerkUser.delete()` → `signout()` → `navigate("/")`.
- [ ] Confirm gate is case-insensitive + trimmed; backend does not check it.
- [ ] CHANGELOG has the `### Added` entry under `[Unreleased]`.

- [ ] **Step 4: Final summary (in lieu of commits)**

Summarize for the user: files changed/created, all three command results, manual-verification outcome from Task 5 Step 7, and note that no git commits were made because git is not installed on this machine.
