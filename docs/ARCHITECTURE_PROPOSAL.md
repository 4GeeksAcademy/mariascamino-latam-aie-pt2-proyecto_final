# HealthCore Backend Architecture Proposal

**Author:** HealthCore Digital Team (AI Engineering track, Milestone 5)
**Audience:** James Osei (CTO) and the HealthCore Digital engineering team
**Status:** Draft for team review — no code has been written yet

---

## 1. Purpose

Before anyone sets up an environment or writes a first endpoint, this document lays out the reasoning behind how HealthCore's backend should be structured. It covers the architectural pattern being proposed, why it fits HealthCore specifically (not backend architecture in general), how the codebase should be divided into modules and domains, how routes should be grouped, and what could realistically go wrong if the team doesn't follow this structure.

The reasoning below is grounded in what we already know about HealthCore's operations, data, and constraints from Milestones 1–5, in the architectural patterns covered in the course (MVC, Layered Architecture, Hexagonal Architecture, and Serverless), and in research into how FastAPI applications are conventionally structured and how systems behave when frontend and backend are built as separate applications.

---

## 2. Why architecture matters here specifically

HealthCore is a 12-clinic, two-country healthcare network where seven business functions (Clinical Operations, Patient Experience & Access, Revenue Cycle & Billing, Compliance & Data Governance, People & Workforce, Technology, and Executive Leadership) each have their own data, their own stakeholders, and their own regulatory exposure (HIPAA in the US, UK GDPR in the UK). The technology team is six people.

Two facts about HealthCore matter more than any other when picking an architecture:

1. **HealthCore already depends on external systems it does not control, and those systems come in incompatible pairs.** Two different EHR platforms (US and UK) that "do not speak to each other." Separate billing/payer processes for US commercial insurance and UK private-pay/NHS. A phone-based US scheduling process and a manual UK diary, which the Patient Experience team wants replaced with a real notification system (SMS/email).
2. **Each domain carries real business rules that must be trustworthy independent of where the data comes from.** James was explicit about this in the Milestone 2 brief: "these numbers go to Tom, Marcus, and Diane every Monday morning. If they're wrong, I hear about it." The 8% denial-rate benchmark, the 20% no-show alert threshold, and the 40-hour CME requirement are business rules that must behave identically regardless of which EHR or which payer the underlying data came from.

That combination — real, swappable external integrations, plus business rules that need to stay stable and testable regardless of those integrations — is what should drive the architectural choice.

---

## 3. Proposed pattern: Layered Architecture, with Hexagonal Ports & Adapters at the integration boundary

We propose **Layered Architecture** as the overall shape of the backend — Presentation Layer, Business Logic Layer, Data Access Layer, exactly as covered in the course — organized per business domain. Within the Data Access Layer of the domains that talk to genuinely external, swappable systems (Clinical, Appointments, Billing), we apply **Hexagonal Architecture's Ports & Adapters** so that business logic never depends on which specific EHR, payer, or notification provider it's talking to.

### 3.1 Why not MVC alone

MVC's Model deliberately bundles data *and* business logic into one component — that's the whole point of the pattern, and it works well when an application is simple enough that "how we store it" and "what the rule is" don't need to be reasoned about separately. HealthCore doesn't have that luxury: the Billing domain alone needs a denial-rate rule that must stay correct whether the claim came from a US commercial payer or the UK NHS contract, and testing that rule shouldn't require a real database connection at all. Layered Architecture is the natural next step *because* it pulls "business logic" and "data access" apart into their own layer, which MVC's Model does not do on its own.

### 3.2 Why not Hexagonal everywhere

Hexagonal Architecture is the right tool for the specific problem of swappable external systems — which is exactly HealthCore's EHR and payer situation — but the course material is explicit that "for simple projects... this pattern might add unnecessary complexity." Not every part of HealthCore's backend talks to an external, swappable system. Inventory (Milestone 5) only reads and writes to our own database — wrapping it in ports and adapters would add a layer of indirection with nothing on the other end to swap. So we apply Hexagonal only where there is a real "Stripe vs. PayPal"-shaped decision to make (which EHR, which payer, which notification channel), and plain Layered Architecture everywhere else.

### 3.3 Why not Serverless, at least not as the primary pattern

Serverless fits event-driven, stateless work with unpredictable traffic — the course's own example is generating a thumbnail after an image upload. Some narrow slices of HealthCore's future work could fit that shape (e.g., generating a PDF export when Claire's team receives a GDPR data-subject request). But the core of this backend — booking an appointment, logging a supply consumption that must check current stock atomically, submitting a claim — is the opposite of serverless's sweet spot: steady daily load from 12 clinics rather than spiky traffic, and multi-step operations where statelessness works against us rather than for us. We're not ruling serverless out forever, but it is not the right foundation for Milestone 5's core API.

### 3.4 The proposal in practice

Each business domain module has:

- **Presentation Layer** — the FastAPI router. Receives the HTTP request, validates its shape with a Pydantic schema, and calls into the Business Logic Layer. This is also where HealthCore's "View" lives, in MVC terms: the router's response model *is* the JSON view of the data, the same way the course describes an API's View as a JSON serializer rather than an HTML page.
- **Business Logic Layer** — the domain's `service.py`. This is where the actual rules live: the 8% denial-rate threshold, the 20% no-show threshold, the CME "at risk" calculation, the rule that a supply consumption can't push stock negative. This layer never imports anything from FastAPI or from a specific EHR/payer adapter — it only depends on the ports below it.
- **Data Access Layer** — for domains with no external counterpart (Compliance, Workforce, Inventory, Executive), this is a conventional `models.py` talking to Postgres through SQLModel. For domains where an external, swappable system is genuinely involved (Clinical, Appointments, Billing), this layer is expressed as a **port** (an abstract interface the Business Logic Layer depends on) plus one **adapter** per concrete external system.

---

## 4. Proposed folder and module structure

```text
services/
├── main.py                  # Creates the FastAPI app, configures CORS, includes every domain router
├── config.py                 # Centralized settings (env vars): DATABASE_URL, ALLOWED_ORIGINS, etc.
├── database.py                # Shared SQLModel engine + get_db dependency
├── dependencies.py            # Shared dependencies (e.g., resolving the TinyDB user_uuid from a request)
├── domains/
│   ├── clinical/               # Clinical Operations
│   │   ├── router.py            # Presentation Layer
│   │   ├── service.py           # Business Logic Layer (clinical documentation rules)
│   │   ├── schemas.py
│   │   ├── ports.py              # Port: EHRRecordsPort — "get patient record", "add clinical note"
│   │   └── adapters/             # Data Access Layer for this domain
│   │       ├── us_ehr_adapter.py    # Implements EHRRecordsPort against the US EHR platform
│   │       └── uk_ehr_adapter.py    # Implements EHRRecordsPort against the UK EHR platform
│   ├── appointments/            # Patient Experience & Access
│   │   ├── router.py
│   │   ├── service.py           # Booking rules, no-show flagging
│   │   ├── schemas.py
│   │   ├── models.py             # Appointment persistence (our own database)
│   │   ├── ports.py              # Port: NotificationSenderPort — "send reminder"
│   │   └── adapters/
│   │       ├── sms_adapter.py
│   │       └── email_adapter.py
│   ├── billing/                 # Revenue Cycle & Billing
│   │   ├── router.py
│   │   ├── service.py           # Denial-rate calculations, flagging thresholds
│   │   ├── schemas.py
│   │   ├── models.py             # Claim persistence (our own database)
│   │   ├── ports.py              # Port: ClaimsSubmissionPort — "submit claim", "check status"
│   │   └── adapters/
│   │       ├── us_payer_adapter.py   # US commercial insurance / Medicare / Medicaid
│   │       └── uk_payer_adapter.py   # UK private pay / NHS contract
│   ├── compliance/               # Compliance & Data Governance — no external adapter needed
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── models.py
│   ├── workforce/                # People & Workforce — no external adapter needed
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── models.py
│   ├── inventory/                # Technology — already scoped in Milestone 5, purely internal data
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── models.py
│   └── executive/                # Executive Leadership — no storage of its own
│       ├── router.py
│       └── service.py            # Aggregates the other domains' service layers only
└── tests/
    └── domains/                  # One test module per domain, mirroring the structure above
```

**Separation criteria:** each folder under `domains/` maps to one of HealthCore's own departments, so any stakeholder (Priya, Tom, Diane) can recognize their own area. Within a domain, the split between `router.py` / `service.py` / (`models.py` or `ports.py` + `adapters/`) is the same Presentation → Business Logic → Data Access split from the course, applied consistently. Only Clinical, Appointments, and Billing get a `ports.py` and `adapters/` folder, because those are the only three domains with a real "which external system" decision to isolate — this is a deliberate, not automatic, application of Hexagonal.

**Migration note:** Milestone 5's current flat layout (`services/models.py`, `services/schemas.py`, `services/routers/inventory.py`) is Inventory's first draft, not the shape of the whole backend. It should move into `domains/inventory/` before Billing or Clinical land on top of it.

---

## 5. Router and endpoint organization

| Domain | Prefix | Representative routes | Owned by |
|---|---|---|---|
| Clinical | `/clinical` | patient record lookups (via the EHR port), clinical note entries | Dr. Marcus Reid |
| Appointments | `/appointments` | booking, rescheduling, no-show flags, reminder triggers (via the notification port) | Priya Nair |
| Billing | `/billing` | claim submission (via the payer port), claim status, denial-rate analytics | Tom Callahan |
| Compliance | `/compliance` | audit-log queries, data-subject export requests | Claire Whitfield |
| Workforce | `/workforce` | clinician records, CME hours, licence-expiry checks | Diane Foster |
| Inventory | `/inventory` | supply catalog, inbound/outbound stock movements | James Osei's team |
| Executive | `/executive` | aggregated KPIs (no-show rate, denial rate, revenue by location) | Dr. Sandra Okonkwo |

Two cross-cutting rules apply regardless of domain:

1. **No shared "God" router.** `main.py` only imports and calls `app.include_router(...)` once per domain — it never defines a business route itself.
2. **The `executive` router never queries another domain's database or adapters directly.** It calls into the other domains' *service* functions — the same Business Logic Layer their own routers call — so a change to how Billing computes its denial rate (or which payer adapter is active) is automatically reflected on the CEO's dashboard without the dashboard needing to know about it.

---

## 6. What FastAPI's own conventions tell us

Two sources were used to validate the structure above, mapped onto the layers from the course rather than invented from scratch:

**FastAPI's official documentation** on [structuring bigger applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/) recommends one `APIRouter` per logical area, kept in its own file, with a shared `dependencies.py`, and a `main.py` that only imports and registers routers. This is the Presentation Layer from the course, expressed in FastAPI's own idiom — the router is the equivalent of Flask's Blueprints, which the docs reference directly.

**The community-maintained [`fastapi-best-practices`](https://github.com/zhanymkanov/fastapi-best-practices) guide** groups everything about one domain into one folder (`router.py`, `models.py`, `schemas.py`, `service.py`), explicitly recommending against a single global `models.py` once a project has more than one or two domains. That `service.py` file is exactly where this proposal's Business Logic Layer lives, and it's the reason we adopted a domain-per-folder layout instead of the official tutorial's flatter `routers/` directory — HealthCore already has seven identified domains, not two.

---

## 7. Frontend and backend as separate systems

HealthCore's monorepo already keeps interfaces (`uis/`) and backend services (`services/`) in separate top-level folders. Living in the same repository does not make them the same runtime system — they are two applications that only talk to each other over HTTP.

**CORS.** FastAPI does not allow cross-origin requests by default. Because HealthCore's frontends will be deployed on different domains than the API, and those domains differ between local development, staging, and US/UK production, `CORSMiddleware`'s `allow_origins` list must be read from an environment variable, never hardcoded — following FastAPI's own [CORS tutorial](https://fastapi.tiangolo.com/tutorial/cors/). Hardcoding one origin is the most common reason a backend that works locally breaks the moment it's deployed.

**Environment variables.** `config.py` should centralize every value that changes between environments — database URL, allowed CORS origins, secrets — rather than letting individual domains read `os.environ` directly. Given Claire Whitfield's compliance mandate, having one auditable list of configuration matters more here than in a typical project.

**Type-sharing risk.** The monorepo's `packages/shared/` (`@repo/shared-types`) is TypeScript; this backend is Python. If both sides hand-maintain matching definitions of a `Claim` or `Appointment`, they will drift. FastAPI generates an OpenAPI schema automatically — treating that schema as the source of truth for the frontend's generated types is lower-risk than writing them twice.

---

## 8. Risks and points of attention

**1. Compliance boundaries can leak silently across domain lines.** HIPAA governs US clinical and billing data; UK GDPR governs UK data. If the `appointments` service reached directly into the `clinical` domain's EHR adapter instead of calling its public service function, a bug in one domain could expose protected data across that boundary — possibly not caught until an audit.

**2. Applying Hexagonal everywhere would be over-engineering, not rigor.** The course is explicit that ports and adapters add unnecessary complexity for simple, non-swappable dependencies. If a future contributor adds a `ports.py` to Compliance or Workforce "for consistency" even though there's no second implementation ever likely to exist, the team pays an indirection cost for a flexibility nobody needs.

**3. The flat Milestone 5 structure will not scale past one domain.** If entities keep landing in a single `models.py` and `schemas.py` as Billing and Clinical come online, the files become unsafe to edit without reading unrelated code. Migrating Inventory into `domains/inventory/` now is cheap; doing it after three more domains land on top of it is not.

**4. The executive dashboard can become a hidden coupling point.** If `domains/executive/` queries other domains' adapters or tables directly "to save a step," any future change to Billing's payer adapter or Appointments' notification adapter risks silently breaking the CEO's dashboard with nothing catching it until Dr. Okonkwo notices a wrong number.

**5. Identity is intentionally external, and someone will eventually be tempted to duplicate it.** Per the Milestone 5 CONTEXT, user identity lives in TinyDB, and this backend does not own a `User` table. If a future domain creates its own local `User` model "to make a join easier," HealthCore ends up with two, potentially inconsistent, sources of truth for who a person is.

---

## 9. Summary

We propose **Layered Architecture** (Presentation → Business Logic → Data Access, organized per business domain) as the backbone of HealthCore's backend, with **Hexagonal Ports & Adapters** applied specifically inside the three domains — Clinical, Appointments, Billing — that genuinely depend on swappable external systems (two EHR platforms, US/UK payers, notification channels). MVC alone doesn't separate business logic from data access cleanly enough for domains with real, high-stakes rules; Serverless doesn't fit the steady-load, multi-step nature of booking, billing, and inventory operations; and applying Hexagonal everywhere would add complexity the course itself warns against, where no real "swap" will ever happen.

This structure is meant to support HealthCore through the milestones still ahead (Telemetry, RAG, Agents, Workflows, Real-time) without needing another rewrite: each of those adds new routes and, likely, new domains or adapters — not a new architecture.