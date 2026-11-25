# Society Management SaaS

Multi-company society management web application. Web-only, self-hosted MySQL, modular monolith.

The product requirements are in [`requirements.md`](./requirements.md). Implementation deliverables and decisions are indexed in [`docs/README.md`](./docs/README.md).

## Stack (pinned)

Next.js 16 (App Router) · React 19 · TypeScript 5.9 · Tailwind CSS 4 · Prisma 7 with `@prisma/adapter-mariadb` · MySQL 8 on localhost/private network · Argon2id + database-backed opaque sessions · Zod · React Hook Form · Vitest · Playwright.

No Docker, SQLite, PostgreSQL or managed cloud database is used (SRS 11.3).

## Repository layout

```text
apps/web/                  Next.js application (App Router, server components by default)
packages/shared/           Stable module keys, permission catalogue, money/ID utilities
packages/validation/       Shared Zod schemas for all trust boundaries
packages/database/         Prisma schema, migrations, client, audit and context loaders
packages/authorization/    RBAC, entitlement and tenant-scope enforcement
docs/                      Architecture, decisions, database design, threat model, runbooks
infrastructure/            Native host, nginx and backup configuration
```

## Current implementation status

- [x] Phase 1 — project setup, pinned stack, local MySQL configuration, CI scaffold
- [x] Phase 2 foundation — sessions, Argon2id, CSRF, rate limiting, audit, server-derived tenant context
- [x] Phase 3 foundation — per-company module entitlements with dependency/core checks
- [x] Core screens — sign-in, dashboard, company administration, entitlement management, tenant context switching
- [x] Initial MySQL migration committed under `packages/database/prisma/migrations`
- [ ] Phases 4–10 — property, residents, finance, operations, reporting, hardening (per SRS §21)

Business modules are deliberately disabled by default for new companies: hidden in navigation, rejected on pages/APIs, with no new activity. Historical data is preserved when a module is disabled.

## Quick start

1. Install Node.js 24 and MySQL 8 locally. See [`docs/setup.md`](./docs/setup.md).
2. Copy `.env.example` to `.env` and set all `CHANGE_ME` values.
3. `npm install`
4. `npm run prisma:generate && npm run prisma:migrate && npm run db:seed`
5. `npm run dev` → <http://localhost:3000>

## Verification

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

Security tests must cover cross-company access, disabled-module API access, RBAC matrices and IDOR before release (SRS 15.6).
