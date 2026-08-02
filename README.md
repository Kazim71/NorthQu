# NorthQu

NorthQu is a technology company that designs and builds software, AI
automation, lead management systems and digital experiences for
businesses. This repository holds **LeadPulse**, NorthQu's own
lead-tracking and identity-resolution platform — the one fully-built
product under the NorthQu name today, not the company's whole identity.
The public site also describes three other services (Automation, Web
Services, CRM) that are in development — see [Product surface](#product-surface)
below for what's real versus planned.

_(Folder/repo names throughout stay `leadpulse` — this codebase is
LeadPulse specifically, the flagship product, while the public marketing
site at `frontend/src/app/(marketing)/` presents NorthQu as the broader
company with LeadPulse as one of several services. See
`docs/CHANGELOG.md` for the full history of how the positioning got
here.)_

LeadPulse is a multi-tenant lead-capture platform for e-commerce
storefronts. A small tracking snippet sits on a client's site and
records anonymous visitor behavior (page views, product views, searches,
cart actions) against that client's own tenant. When the visitor later
gives up a phone number or email — at checkout, in a form — the backend
links that identity to everything they did anonymously before, so a
business ends up with real leads and full context instead of just a
form submission. A super-admin layer lets the platform owner onboard new
client companies, manage their admins/agents, and see aggregate activity
across all of them; each client's own admins only ever see their own
data, enforced at the database level, not just in the UI.

---

## Table of contents

- [Architecture](#architecture)
- [Product surface](#product-surface) — what's real vs. planned
- [Flows](#flows) — how a request actually moves through the system
- [Folder structure](#folder-structure)
- [Current status](#current-status)
- [Where to find things](#where-to-find-things)
- [Local setup](#local-setup)
- [CI/CD](#cicd)
- [Docs convention](#docs-convention-standing-instruction)

---

## Architecture

```
┌───────────────────┐    x-api-key       ┌───────────────────┐   service_role   ┌──────────────┐
│  Client storefront │ ──────────────────▶│    Express API     │─────────────────▶│   Supabase   │
│  (Shopify, Woo…)   │  POST /api/events  │    (backend/)       │  bypasses RLS,   │  Postgres +  │
│  + tracking snippet│  POST /api/identify│  deployed on Render │  writes on any   │  Auth + RLS  │
└───────────────────┘                    └───────────────────┘  tenant's behalf  └──────┬───────┘
                                                                                          │
                                                                                   anon_key + RLS
                                                                                          │
                                                                                          ▼
                                                                                  ┌──────────────────┐
                                                                                  │ Next.js dashboard │
                                                                                  │   (frontend/)      │
                                                                                  │  /app   (hub)       │
                                                                                  │  /dashboard (org)   │
                                                                                  │  /super-admin       │
                                                                                  │  Vercel-connected,   │
                                                                                  │  prod deploy TBD     │
                                                                                  └──────────────────┘
```

Two distinct trust boundaries, and this distinction is load-bearing throughout the codebase:

- **Backend API** (`backend/`) uses the Supabase **service_role** key. It is the only thing allowed to write ingestion data on a tenant's behalf, because an anonymous website visitor has no Supabase Auth session to be constrained by RLS in the first place. It resolves which tenant a request belongs to via the `x-api-key` header, cached in memory (60s TTL) so ingestion doesn't cost a DB round-trip per event — the same cache also carries the tenant's `ingestion_paused` flag, so a platform admin's kill switch takes effect within that same TTL window.
- **Dashboard** (`frontend/`) uses the Supabase **anon** key exclusively for everything an org admin does — every read and write is a logged-in human acting as themselves, constrained by Postgres Row Level Security. The one exception: a small set of platform-admin-only writes (provisioning organizations, inviting/editing/deleting admins, pausing ingestion, toggling service flags) go through server-only Route Handlers using the **service_role** key, gated by `getPlatformAdminOrNull()` *before* that client is ever constructed — see `frontend/src/lib/supabase/admin.ts`.

## Product surface

The `/app` service hub (see [Flows](#flows)) shows a card per NorthQu
service. Only one is real today:

| Service | Status | Where |
|---|---|---|
| **LeadPulse** | Built, live | `/dashboard` |
| **Automation** | In development | marketing page only: `/services/automation` |
| **Web Services** | In development | marketing page only: `/services/web-services` |
| **CRM** | In development | marketing page only: `/services/crm` |

`organizations.has_automation` / `has_web_services` / `has_crm` exist in
the schema (migration `0010`) and a platform admin can flip them per org,
but the hub only makes a service's card clickable when the product is
*also* actually built (`ServiceDef.builtYet` in `frontend/src/app/app/page.tsx`)
— flipping a flag on ahead of the product existing shows "Coming soon,"
never a broken link into nothing.

## Flows

### Auth → landing page

```
sign in ──▶ getViewer() reads admin_users / platform_admins
              │
              ├─ platform_admin  ──▶ /super-admin
              ├─ org_admin       ──▶ /app  (service hub — NOT straight into LeadPulse)
              │                        │
              │                        └─ click a service card ──▶ /dashboard (LeadPulse)
              ├─ unassigned            ──▶ /pending  ("waiting for assignment" or
              │                                       "access revoked", depending on why)
              └─ anonymous             ──▶ /login
```

The destination is always decided **server-side** from the database
(`frontend/src/lib/auth.ts`'s `getViewer()`), never trusted from the
client — see that file's own comments for why. `/app` exists specifically
so a client who only has, say, Automation enabled once it ships doesn't
get routed into a LeadPulse dashboard they never asked for.

### Event ingestion → identity resolution

```
tracking snippet (anonymous visitor)
   │  POST /api/events  { visitor_id, event_type, ... }
   ▼
resolveOrg middleware ── x-api-key → organization_id (cached)
   │                                     │
   │                            ingestion_paused? ──▶ 503, event dropped
   ▼
events table  (organization_id, visitor_id, event_type, ...)

  ... later, same visitor identifies themselves (checkout / form) ...

   │  POST /api/identify  { visitor_id, phone|email, ... }
   ▼
identify_visitor() — one atomic Postgres RPC:
   1. match an existing contact by phone OR email within this org
   2. upsert the contact (new fields win, existing non-null fields kept)
   3. backfill every prior anonymous event for this visitor_id onto that contact
```

Steps 1–3 happen in a single RPC specifically so there's no window where a
contact exists but their prior browsing history hasn't been linked yet —
see `supabase/migrations/0002_identify_fn.sql`.

### Platform-admin controls (super-admin → one org)

```
/super-admin/org/[id]
   ├─ Ingestion pause toggle ──▶ PATCH /api/admin/organizations/[id]  { ingestion_paused }
   ├─ Service flags toggle   ──▶ PATCH /api/admin/organizations/[id]  { has_leadpulse, ... }
   └─ Admins & agents table
        ├─ Edit name / toggle access ──▶ PATCH /api/admin/users/[userId]  { name, is_active }
        ├─ Delete                    ──▶ DELETE /api/admin/users/[userId]  (removes admin_users row + auth user)
        └─ Invite                    ──▶ POST /api/admin/invite  (creates auth user + admin_users row)
```

`is_active = false` doesn't delete anyone — it's the reversible "revoke
access" action; the account still exists but `getViewer()` treats them as
unassigned on their next request, landing them on `/pending` with an
explicit "access revoked" message rather than a bare error.

## Folder structure

```
leadpulse/
├── supabase/
│   ├── migrations/       Schema history (SQL, applied via Supabase SQL editor, numeric order)
│   ├── seed.sql          Test orgs, contacts, events, admin users for local dev
│   └── verify.sql        Manual RLS verification queries
├── backend/               Express + TypeScript ingestion API — deployed on Render, service_role
├── tracking-snippet/      Standalone JS tracker, esbuild, ~2.4kb gzipped, no runtime deps
└── frontend/              Next.js 14 site (App Router) — anon key + RLS, Vercel-connected
    └── src/app/
        ├── (marketing)/   Public NorthQu site — home, /services (+ /services/leadpulse,
        │                  /services/automation, /services/web-services, /services/crm),
        │                  /about, /pricing, /insights, /contact
        ├── login/, signup/, pending/    Auth entry points (LeadPulse customers)
        ├── app/           Post-login service hub — routes into whichever product
        ├── dashboard/     Org-admin workspace (LeadPulse leads/events)
        ├── super-admin/   Platform-operator workspace (cross-tenant oversight,
        │                  org provisioning, admin management, ingestion pause)
        └── api/admin/     Platform-admin-only Route Handlers (service_role, never client-exposed)
```

## Current status

**Built, deployed, and verified** (against live Supabase + live Render, not mocked; the frontend runs and is verified locally — see the deployment note below):

- **Schema** (`supabase/migrations/0001`–`0010`): `organizations`, `admin_users`, `contacts`, `events`, `visitor_identity_map`, `platform_admins`, `contact_inquiries`, RLS on every table. Adds (over time) IP/device enrichment, unified visitor view, dashboard analytics RPCs, and — most recently — `admin_users.name`/`is_active`, `organizations.ingestion_paused`, and the four `has_*` service flags.
- **Backend API** (`backend/`): `POST /api/events`, `POST /api/identify`, `POST /api/webhooks/shopify/checkout`, deployed on Render. Rate limiting, org-resolution caching (now also caching `ingestion_paused`), IP geolocation + device enrichment, structured logging, `helmet` security headers, centralized error handling.
- **Tracking snippet** (`tracking-snippet/`): a few kb minified, visitor-id persistence, first-touch attribution capture, client-side debounce, public `window.leadpulse.track()/.identify()` API. Live on a real client storefront (WooCommerce, via WPCode) in addition to a Shopify test store.
- **Dashboard + marketing site** (`frontend/`): three-tier landing (`/app` hub → `/dashboard` or `/super-admin`), a NorthQu-branded design system shared between the marketing site and the dashboard (same Tailwind tokens — `cinnamon`/`brick`/`brand.*`), dark mode, a conversion-funnel/attribution/lead-scoring analytics package, platform-admin management of organizations, admins/agents, ingestion pause, and per-org service flags. **Deployment note:** a Vercel project is connected to this repo (PR preview builds run automatically), but there is no confirmed production deployment — `npm run dev`/`npm run start` locally is the verified path today.
- **CI/CD**: GitHub Actions runs typecheck + build for all three deployable packages on every push/PR, plus a dedicated check that fails the build if the tracking snippet's and backend's `EVENT_TYPES` lists drift. `main` is branch-protected — a PR can't merge until all checks pass.

**Explicitly not built** — see `docs/TODO.md` for the full list with context. Highlights: Automation/Web Services/CRM have no real backend yet (marketing pages only, deliberately — see [Product surface](#product-surface)); no idempotency keys on ingestion; `inviteUserByEmail` is blocked on SMTP configuration so admin invites hand back a temp password instead of sending an email; no dedicated staging deployment wired up yet (a genuinely separate staging Supabase project exists and is schema-verified, but has no Render/Vercel target pointed at it).

## Where to find things

| what | where |
|---|---|
| Live backend API | `https://leadpulse-api-m52p.onrender.com` (health check: `/health`) |
| Supabase project (production) | Project ref in `backend/.env` / `frontend/.env.local` |
| Supabase project (staging) | Schema-only, not yet wired to a deployment — see `docs/TODO.md` |
| Backend source | `backend/src/` |
| Frontend source (marketing site + dashboard) | `frontend/src/` |
| Schema history | `supabase/migrations/` (apply in numeric order via the Supabase SQL editor) |
| CI workflow | `.github/workflows/ci.yml` |

## Local setup

Requires Node ≥ 20 (the codebase depends on the `ws` package as a Node-20-compatible transport for `@supabase/supabase-js`'s realtime client — see comments in `backend/src/config/supabaseClient.ts` and `frontend/src/lib/supabase/server.ts` for why).

1. **Database**: in the Supabase SQL editor, run every file in `supabase/migrations/` in numeric order (`0001` through the highest number present). Optionally run `supabase/seed.sql` for test data (read the comments inside it — it needs a real `auth.users` UUID pasted in before the `platform_admins` insert will work).
2. **Backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
   npm run dev             # http://localhost:4000
   ```
3. **Tracking snippet** (optional, only needed if working on the snippet itself):
   ```bash
   cd tracking-snippet
   npm install
   npm run build            # -> dist/leadpulse-tracker.min.js
   ```
4. **Frontend** (marketing site + dashboard):
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
                                        # and SUPABASE_SERVICE_ROLE_KEY (server-only, powers /super-admin)
   npm run dev                         # http://localhost:3000
   ```

## CI/CD

Every push and PR against `main` runs four independent GitHub Actions jobs
(`.github/workflows/ci.yml`): typecheck + build for `backend/`, `frontend/`,
and `tracking-snippet/`, plus a fourth check (`event-types-sync`) that fails
if the backend's and tracking snippet's event-type lists have drifted —
see `.github/ci-checks/verify-event-types-sync.mjs`. `main` is
branch-protected: a PR needs every check green before it can merge, and
direct pushes to `main` are blocked.

## Docs convention (standing instruction)

At the end of every task performed in this repo, append a dated entry to `docs/CHANGELOG.md` summarizing what changed, and update `docs/TODO.md` if anything was resolved or newly flagged as deferred/blocked. This happens automatically, without being asked each time — it is not optional per-task documentation, it is how this project tracks its own history. `docs/` is gitignored (internal working notes, not meant for the public repo) but still maintained locally for exactly this reason.
