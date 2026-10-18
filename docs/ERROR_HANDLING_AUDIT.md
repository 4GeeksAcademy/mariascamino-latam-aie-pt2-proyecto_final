# Error handling audit

Scope: `uis/backoffice` (Next.js), `services/api` (FastAPI) and the Python scripts
(`scripts/`, `services/api/seed.py`, `skills/data-analysis/scripts/`). No new
features were added: only error handling and error communication changed.

Severity: CRITICAL > HIGH > MEDIUM > LOW.

## Findings and fixes

| # | Sev. | Layer | Category | Where | Problem | Fix |
|---|------|-------|----------|-------|---------|-----|
| 1 | HIGH | API | Sensitive data leak | FastAPI default 422 | The default validation response echoes the submitted `input`, which can include passwords | `RequestValidationError` handler in `main.py` returns only field location + a clean Spanish message |
| 2 | HIGH | API | Sensitive data leak | `email_service.py` | The "SendGrid not configured" branch printed the reset link (contains the token); the send failure printed the raw exception text | Use `logger`; no link/token logged; failure logs only the exception type |
| 3 | HIGH | Frontend | Raw error exposure | `lib/api.ts`, suppliers, profile, change-password | Messages like `Error 500 al cargar proveedores`, `(código 422)`; a 422 `detail` list became `[object Object]` | `friendlyMessage(status)`; 5xx bodies are never shown; one `requestJson()` helper turns every failure into a readable `ApiError` |
| 4 | HIGH | Frontend | Missing error state / no CTA | `suppliers/page.tsx` | Load failure showed a red line with no way forward | `ErrorState` component with **Reintentar**, home link and support note |
| 5 | HIGH | Frontend | No error boundary | `app/` | No `error.tsx`, `global-error.tsx` or `not-found.tsx`: a render crash left a blank/raw Next.js error page | Added the three files (generic message, retry, home link; `error.message` never rendered) |
| 6 | MEDIUM | Frontend | Network failures | `apiFetch`, `fetch` in login/register/forgot/reset | A `fetch` failure surfaced as a raw `TypeError` / "Failed to fetch" | `safeFetch()` wraps only the network call and throws a readable `ApiError` |
| 7 | MEDIUM | Frontend | Undefined state | `auth-context.tsx`, `(app)/layout.tsx` | If `/auth/me` failed (5xx/network) the user was silently treated as logged out and bounced to `/login` | Session check distinguishes 401 (log in again) from server/network errors (shows error + retry) |
| 8 | MEDIUM | Frontend | Unguarded JSON parse | `auth-context.tsx` login, `incidents.ts` | `res.json()` on a success response could throw a `SyntaxError` | `readJson()` / scoped try/catch with a readable message |
| 9 | MEDIUM | Frontend | Undefined rendering | `suppliers/page.tsx`, summary page | `supplier.categories.map`, `monthly_rate.toLocaleString()`, `Object.entries(counts)` crash on missing data | Optional chaining and fallbacks (`?? []`, `?? 0`, `?? {}`) |
| 10 | MEDIUM | API | Startup crash | `database.py` | A corrupt `db.json` crashed on import with a raw traceback | Clear message on stderr, exit code 1 |
| 11 | MEDIUM | API | Unhandled exception | `security.verify_password` | A malformed stored hash raised and became a 500 on login | Scoped `try/except` returns `False` (login rejected) |
| 12 | HIGH | Script | Missing input checks / exit code | `scripts/seed_incidents.py` | Missing, empty, wrong-encoding or wrong-columns CSV ended in a traceback | Read errors handled one by one, header/empty checks, messages on stderr, `sys.exit(1)` |
| 13 | MEDIUM | Script | Missing try/except / exit code | `services/api/seed.py` | One invalid supplier aborted with a traceback; always exit 0 | Per-row validation + DB-write handling, failures reported on stderr, exit 1 |
| 14 | MEDIUM | Script | Missing try/except / exit code | `skills/data-analysis/scripts/pandas_clean.py` | `read_csv` failures and missing pandas crashed with a traceback | Specific handlers, empty-data check, stderr + exit 1 |
| 15 | LOW | Frontend | Inconsistent copy | login, register, forgot/reset | "No se pudo conectar con la API" (technical wording) | Plain-language messages |

## Already correct (left unchanged)

- Backend global 500 handler returns a generic message and logs the detail server-side only.
- `finally` blocks already cleared `loading` / `submitting` in every page.
- Incident endpoints already validate manually and return 400 naming the field.
- `src/*.ts` and `validation.js` are pure utilities (no I/O); `console.log` there is demo output.

## Known limitation

Responses produced by Starlette's outermost `ServerErrorMiddleware` (the generic 500)
do not carry CORS headers, so a browser can report them as a network error. The frontend
handles both cases with the same readable "couldn't reach the server" message and a retry.
