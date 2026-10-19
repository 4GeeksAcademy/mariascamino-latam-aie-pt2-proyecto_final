# Testing

Ticket **AUTH-088** (unit tests for the authentication API), plus the optional
**API-042** (backoffice endpoints) and **FE-019** (frontend utilities).

All tests assert **business logic** (what an endpoint *decides*), not HTTP
serialisation or framework behaviour.

## How to run

### Backend (pytest) — from `services/api`

```bash
cd services/api
uv sync                       # installs pytest, pytest-cov and httpx (dev group)
uv run pytest                 # run the whole suite
uv run pytest --cov           # same, with a coverage report per module
uv run pytest tests/test_token.py   # a single file
```

The tests never touch your real data: `tests/conftest.py` points the app at a
temporary database file, sets a fixed JWT secret, and replaces the reset-email
sender with a recorder (no real e-mail is ever sent).

### Frontend (Jest) — from `uis/backoffice`

```bash
cd uis/backoffice
npm install
npx jest --coverage           # or: npm run test:coverage
```

## Test plan

Written before the tests. Every endpoint has at least one **happy path**, one
**edge case** and one **failure mode**.

| Endpoint / unit | Happy path | Edge cases | Failure modes |
|---|---|---|---|
| `POST /users` (register) | account created, role `user`, password stored as bcrypt hash, profile created | password length boundary (8 ok / 7 rejected); duplicate e-mail (also with different letter case); client sends `role: admin` (must be ignored); no optional profile fields | invalid e-mail; empty password; missing fields — nothing is stored |
| `POST /auth/login` | valid credentials → token that identifies the user | wrong password vs unknown e-mail give the *same* answer (no user enumeration); inactive user; password is not trimmed; e-mail letter case | empty password; missing fields; corrupted stored hash → clean 401, not a 500 |
| Tokens + `GET /auth/me` | create/decode round-trip; `/auth/me` returns the owner | **lifetime matches configured expiry**; token that expired a minute ago; token valid for one more minute; token of a deleted user | malformed strings; wrong secret; no `sub`; non-numeric `sub`; `alg: none` attack; no token |
| `POST /auth/forgot-password` | one e-mail with a working link; only a hash of the token is stored | unknown e-mail looks identical and sends nothing; e-mail letter case; a new request kills the previous link | malformed e-mail |
| `POST /auth/reset-password` | emailed token changes the password (old one stops working) | token is single-use; expired token; a successful reset invalidates other pending tokens | unknown token; empty token; too-short password (and the link must *not* be burned by a typo) |
| `POST /auth/change-password` | correct current password → changed | exactly 8 characters; pending reset links die after a change | wrong current password; too-short new password; no login; one user cannot use another user's password |
| `email_service` | right recipient and link | no credentials → nothing is sent | SendGrid failure never breaks the response and never leaks the error text |
| `security` / `password_reset` helpers | salted hashes verify only the right password; tokens are long and unique | consume returns the user id once, then `None` | malformed hash → `False`, never an exception |

**API-042 — backoffice groups (extra):** `/users/{id}` permissions, `/profiles/me`,
`/suppliers` and `/api/incidents` (+ the shared rules in `incident_rules.py`),
each with the same three tiers, plus `tests/test_error_handlers.py` for what the
client is allowed to see in an error (no echoed passwords, no stack traces).

**FE-019 — frontend utilities (extra), Jest:** `lib/auth-storage.ts` (token
helpers), `lib/api.ts` (error translation, `safeFetch`, `apiFetch`, `requestJson`)
and `lib/incidents.ts` (labels, lifecycle rules, API error mapping). Each function
has a happy-path and a failure-mode test.

## What each file covers

| File | Covers |
|---|---|
| `tests/test_register.py` | `POST /users` |
| `tests/test_login.py` | `POST /auth/login` |
| `tests/test_token.py` | token creation/expiry/rejection, `GET /auth/me`, password hashing |
| `tests/test_password_reset.py` | forgot/reset flow and the token module |
| `tests/test_change_password.py` | `POST /auth/change-password` |
| `tests/test_email_service.py` | reset e-mail sender |
| `tests/test_users_endpoints.py`, `test_profiles.py`, `test_suppliers.py`, `test_incidents.py`, `test_incident_rules.py`, `test_error_handlers.py` | API-042 extras |
| `uis/backoffice/__tests__/*.test.ts` | FE-019 extras |

## Results

**pytest:** 114 tests passing.

| Module | Coverage |
|---|---|
| `security.py` | 98% |
| `password_reset.py` | 100% |
| `auth_models.py` | 100% |
| `email_service.py` | 100% |
| `routes/auth.py` | 94% |
| `routes/users.py` (registration + users) | 97% |
| `routes/suppliers.py` | 100% |
| `routes/incidents.py` | 98% |
| `routes/profiles.py` | 100% |
| **All app code** | **97%** (target: 70% on auth, 60% on the extra modules) |

**Jest:** 32 tests passing, 99% of lines in `lib/api.ts`, `lib/auth-storage.ts`
and `lib/incidents.ts`.

## AI-assisted workflow

The plan above was drafted with an AI coding assistant (Claude) from the endpoint
code, and then reviewed case by case. Cases the AI suggested that were not on the
first list: the `alg: none` token attack, a token that belongs to a deleted user,
a typo in the new password must not burn the reset link, a client sending
`role: admin` at registration, and "wrong password and unknown e-mail must be
indistinguishable". Each generated test was read before being kept, and every test
asserts a decision (who may do what, what is stored, what is rejected), not HTTP shape.

## Bugs the tests found (and the fixes)

1. **E-mail was case-sensitive.** `Maria@x.com` and `maria@x.com` could be
   registered as two different accounts, and someone who registered with capital
   letters could not log in typing lowercase. Fixed with `find_user_by_email()`
   in `database.py` (case-insensitive lookup, so older accounts still work) and
   new e-mails are now stored lowercase. Used by register, login, forgot-password
   and user update.
2. **The reset e-mail went to the text the visitor typed** instead of the
   address registered on the account. It now uses the stored address.
3. **A malformed stored password hash caused a 500 on login.** `verify_password`
   now treats it as a failed login (found during the error-handling audit; kept
   as a regression test in `test_login.py` and `test_token.py`).

## Known gaps

- `/api/incidents` endpoints do not require a logged-in user (they were built to
  be open to everyone in the company). No test covers this; it is flagged here.
- Frontend React components are not tested; only the TypeScript utility logic.
