# Architecture and product decisions

These decisions implement the baseline assumptions in SRS §23 and the functional scope in SRS §9. "Accepted" means engineering proceeds on this basis; items still requiring a product-owner answer are listed at the end and are **not** treated as decided.

## Accepted decisions

### ADR-001 — Company is the SaaS tenant
**Status:** Accepted. One company is the isolation boundary and may manage multiple societies. Users can hold memberships in more than one company/society, but access is granted explicitly per membership (SRS §6.1, §23.1). Platform Super Admin access is separate from company access.

### ADR-002 — Web-only release
**Status:** Accepted. Only a responsive web application for desktop, tablet, and mobile browsers is delivered. Modern mobile browsers are supported; no native app is implied (SRS §2, §23.2).

### ADR-003 — Local self-hosted MySQL 8
**Status:** Accepted. MySQL runs on the application server or a private network controlled by the operator, connecting via `localhost`/`127.0.0.1`. No Docker, SQLite, PostgreSQL, or mandatory managed cloud database (SRS §10, §11.3, §23.3). MySQL binds only to localhost/private addresses, uses a least-privilege app user, encrypted storage where available, and tested backups.

### ADR-004 — Next.js App Router with TypeScript
**Status:** Accepted. Next.js 16 App Router, React 19, TypeScript, and Tailwind 4, with Server Components by default and server-only Prisma access (SRS §11.1–11.2, §23.4). Pinned versions are kept in the root `package.json`.

### ADR-005 — RBAC, not "RBAS"
**Status:** Accepted. The request's "RBAS" is interpreted as Role-Based Access Control. Server-enforced RBAC supports platform, company, and society roles, custom roles, module/feature/action permissions, and data scopes (SRS §8, §23.5).

### ADR-006 — Six core capabilities cannot be disabled
**Status:** Accepted. Authentication/account management, company profile/membership, RBAC/permission administration, society/property foundation, audit logging, and security/system settings are always available (SRS §7.5, §23.6).

### ADR-007 — Fifteen business modules are independently entitlement-controlled
**Status:** Accepted. Resident Management through Integrations can be enabled/disabled per company, subject to dependencies and platform entitlements (SRS §7.1–7.5, §23.7). Stable keys are defined in [module-catalog.md](module-catalog.md).

### ADR-008 — Disabling preserves history; default read-only
**Status:** Accepted. Disabling a module stops all new activity but never deletes historical data. Authorized users retain read-only access by default unless a company contract requires full restriction (SRS §7.2, §20.2.7, §23.8). Navigation, direct URLs, APIs, Server Actions, exports, and jobs all enforce this.

### ADR-009 — Modular monolith first
**Status:** Accepted. One deployable with clear module boundaries and shared authorization/tenant/audit/validation services. Microservices require measured justification later (SRS §12, §23.11).

### ADR-010 — Argon2id and DB-backed opaque sessions
**Status:** Accepted (implementation decision consistent with SRS §15.1). Passwords are hashed with Argon2id. Sessions are opaque server-side records in `sessions` referenced by secure, HttpOnly, SameSite cookies; `Secure` is enabled in production. Session IDs rotate after login and privilege changes, support revocation/logout from all devices, and never live in `localStorage`. MFA is required for Super Admin and other privileged users.

### ADR-011 — No native mobile, guard app, or offline sync
**Status:** Accepted. Native Android/iOS apps, store distribution, a separate security-guard app, and offline-first synchronization are excluded, as is a public consumer marketplace (SRS §2.2).

### ADR-012 — No payment gateway integration yet
**Status:** Accepted. Manual/offline payment recording with approval controls is in scope; gateway integration and webhooks wait for provider and country approval. Callback-forgery controls (signature verification, provider status check, idempotency) are designed but inactive until then (SRS §2.2, §9.6, §23.10).

### ADR-013 — India-first, configurable for other countries
**Status:** Accepted. The initial market is India; currency codes, countries, timezones, and locale formatting are configuration, not hard-coded assumptions (SRS §1, §9.1, §17.5, §23.9).

### ADR-014 — Deny by default with audited elevation
**Status:** Accepted. Cross-company access, disabled modules, support elevation, and unapproved CUSTOM scope rules are denied. Support access must be time-bound, approved, visibly bannered, and immutably audited if implemented (SRS §5.1, §6.2, §8.4, §15.2, §15.5).

## Open questions — pending product owner

Every item below comes from SRS §24. Engineering does not choose an answer; the related module is implemented only after sign-off.

| # | Question | Status |
| --- | --- | --- |
| 1 | One centrally hosted self-managed server for multiple companies, or a separate local installation per customer? | pending product owner |
| 2 | Disabled module fully inaccessible, or read-only historical access for authorized users? (Baseline assumes read-only.) | pending product owner |
| 3 | May company administrators create custom roles, or only the Super Admin? | pending product owner |
| 4 | May one user belong to multiple companies and multiple societies? (Baseline supports explicit memberships.) | pending product owner |
| 5 | Do residents have individual login accounts in the first release? | pending product owner |
| 6 | Online payment integration in the first release, or payment recording first? (Baseline records payments first.) | pending product owner |
| 7 | Is SaaS subscription billing part of the first release? | pending product owner |
| 8 | Which country, currency, language, and tax rules are required at launch? | pending product owner |
| 9 | Backup retention, RPO, and RTO targets? | pending product owner |
| 10 | Which modules are mandatory for the first commercial release? | pending product owner |

Related detail requiring business-owner confirmation before implementation: financial, tax, voting, retention, and approval rules (SRS §23.12).
