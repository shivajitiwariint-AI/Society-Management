# Society Management — Architecture & Functionalities

## 1. Architecture

### 1.1 Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Lucide icons, react-hook-form + Zod |
| Backend | Next.js Route Handlers (`/api/v1/*`), React Server Components, server-side service layer |
| Authentication | Opaque DB sessions, CSRF bound to session, Argon2id password hashing, RBAC + module entitlements |
| Data | Prisma 7 with `@prisma/adapter-mariadb`; MySQL-compatible TiDB Cloud (production), local MySQL (development) |
| Testing | Vitest (unit), Playwright (E2E) |
| Deployment | GitHub → Vercel (monorepo build), TiDB Cloud database |

### 1.2 Repository layout

```
Society Management/
├── apps/web/
│   ├── src/app/
│   │   ├── (app)/            # Authenticated workspace
│   │   │   ├── dashboard/
│   │   │   ├── societies/    # list, create, [id] property setup
│   │   │   ├── residents/
│   │   │   ├── finance/      # Billing & Dues
│   │   │   ├── payments/     # Payments & Receipts
│   │   │   ├── accounting/
│   │   │   ├── maintenance-expenses/
│   │   │   ├── reports/
│   │   │   ├── companies/    # platform tenant management
│   │   │   ├── admin/        # users, roles, audit, settings
│   │   │   ├── operations/   # 10 workflow-style modules
│   │   │   └── help/
│   │   ├── (auth)/           # login, admin/login, register, session-expired, unauthorized
│   │   ├── api/v1/           # REST route handlers
│   │   └── globals.css       # design tokens and component styles
│   ├── src/components/       # shell, sidebar, topbar, panels, dialogs, UI primitives
│   ├── src/lib/              # services, auth/session, API guard, expenses, helpers
│   └── src/data/             # bundled illustrative expense sample
├── packages/
│   ├── shared/               # module keys, permission catalog, operations catalog, money
│   ├── validation/           # Zod schemas shared by UI and API
│   ├── authorization/        # authorize(), data scopes, entitlement checks
│   └── database/             # Prisma schema, migrations, seed, context builder, audit
├── tests/e2e/                # Playwright specs
├── docs/                     # architecture, DB design, RBAC catalog, runbook
└── vercel.json               # monorepo build configuration
```

### 1.3 Request flow

```
Browser
  → Next.js middleware (proxy.ts): security headers, per-request CSP nonce
  → Route Handler / Server Component
      → guardRequest():
          CSRF → session lookup → loadRequestContext → authorize → audit
      → Service layer:
          tenant-scoped queries; companyId / societyId derived server-side
      → Prisma adapter (TLS connection to TiDB Cloud)
  → JSON response / rendered HTML
```

### 1.4 Security boundaries

- Tenant isolation is enforced in every query using server-derived `companyId` and `societyId`.
- Composite foreign keys in the Prisma schema are the final isolation boundary.
- Every mutating API re-checks permission and writes an append-only audit entry.
- Client Components receive only plain serializable data — no functions or class instances.
- Platform administrators have a focused menu (Companies + Society Setup); operational modules belong to the company-side workspace.

### 1.5 Database domains

| Domain | Key entities |
|---|---|
| Platform | Company, User, Session, Role, Permission, UserRole, UserMembership, AuditLog, LoginHistory, SecurityEvent |
| Tenant foundation | Society, Building, Floor, Flat, Resident, Ownership, Tenancy, FamilyMember, Vehicle |
| Finance | BillingCharge, Invoice, InvoiceItem, Payment, Refund, Account, JournalEntry, JournalLine, FinancialPeriod, MaintenanceExpense, ExpenseAttachment |
| Operations | Single `OperationalRecord` table keyed by `(moduleKey, resourceKey)` with metadata JSON |
| Entitlements | Module, CompanyModule, ModuleDependency, ModuleFeatureLimit |

---

## 2. Functionalities

### 2.1 Identity & access

- Public company self-registration: creates tenant, first administrator, membership, role assignment and starter module bundle in one transaction.
- Separate company sign-in (`/login`) and platform sign-in (`/admin/login`).
- Password change and administrative password reset with session revocation and audit.
- Opaque DB sessions with rotation on login, 12-hour TTL, `HttpOnly`/`SameSite` cookies.
- CSRF tokens bound to the session token; all non-GET API calls validate them.
- Failed-login lockout, login history, security events.
- RBAC: 694 permissions, 11 system roles, PLATFORM/COMPANY/SOCIETY scopes, data scopes (PLATFORM, COMPANY, SOCIETY, OWN, ASSIGNED).
- Module entitlements: FULL / READ_ONLY / DISABLED, with dependency enforcement on enable.

### 2.2 Platform administration (super admin)

- Company list with status enable/disable and permanent delete (type-to-confirm code + audit reason).
- Per-company module entitlement configuration with dependency validation.
- Company user management (create, change email/password, status).
- Roles & permissions, audit log viewer, system settings.
- Topbar company selector for switching the active tenant context.
- Focused navigation: Companies and Society Setup.

### 2.3 Company workspace

- Dashboard: company/society/flat/module metrics, setup progress with 3 steps, quick actions, enabled-module chips, sparklines.
- Collapsible sidebar with searchable menu.
- Sticky topbar: company chip/selector, breadcrumb, workspace search with `⌘/Ctrl + K`, notifications, profile menu.

### 2.4 Society & property setup

- Societies table with search panel, records panel, register and delete actions.
- Dedicated `/societies/create` page with redirect after creation.
- `/societies/[id]`: guided setup progress (Society → Building → Floors → Flats).
- Modal dialogs for adding buildings, floors and flats.
- Delete APIs for society, building, floor and flat with verified database cascades, audit logs and session cleanup.

### 2.5 Residents

- Resident directory with search, resident-type and status filters, add and archive.
- Resident detail: ownerships, tenancies, family members, vehicles, documents.

### 2.6 Finance

- **Billing & Dues**: charge types, invoice issuance (charge picker prefills description/amount), dues summary.
- **Payments & Receipts**: payment recording linked to unpaid invoices with auto-filled outstanding amount, approve/reject of pending receipts, refunds.
- **Accounting**: chart of accounts, structured journal entry editor with account dropdowns and live debit/credit balance check, period locking, trial balance.
- **Reports**: dues, trial balance and invoices with tabbed record views and permission-gated exports.

### 2.7 Maintenance expenses (OVH workbook support)

- Exact 12 expense heads from the OVH illustrative workbook.
- 672 sample rows across 56 months (April 2022 – November 2026), total ₹8,006,000.
- XLSX import with preview, row validation, idempotent upsert and error report.
- CSV/XLSX export for detail, month-wise, year-wise and category-wise summaries.
- Styled exported workbooks: title banner, highlighted caption, colored headers, total row, footer caption, frozen panes, autofilter, page footer.
- Month-wise and financial-year pivot grids with sorting and filtering.
- Supporting-document attachments stored in DB, with document kinds (bill, invoice, AMC agreement, work order, approval, bank statement, receipt, other), download/delete and audit.
- Vendor-master linkage with 12 sample vendors and vendor selection on the expense form.

### 2.8 Operations modules

Visitors, Complaints & Maintenance, Amenities & Bookings, Parking & Vehicles, Staff & Attendance, Vendors & Contracts, Notices & Communication, Documents, Meetings & Voting, Integrations.

Each provides:

- Create/edit/delete within a modal form driven by an operations catalog.
- Status workflow with inline status selection.
- Search, status filter and society selector.
- Server-enforced permissions and complete audit trail.
- Consistent "search panel + records panel + empty state" design.

### 2.9 Design system

- Color tokens: Indigo `#4F46E5`, navy sidebar `#111827`, active menu `#312E81` / `#A5B4FC`, main background `#F8FAFC`, borders `#E5E7EB`, state colors.
- Typography: Inter + Plus Jakarta Sans, eight-size scale (12–24px).
- Reusable cards, buttons, status pills, tables, empty states, skeletons, alerts and modal dialogs.
- Landing page with hero, product mock, features, modules, security, CTA and animated scroll reveals.

### 2.10 Deployment & operations

- GitHub repository: `https://github.com/shivajitiwariint-AI/Society-Management.git`
- Vercel production URL: `https://society-management-zeta-eight.vercel.app`
- TiDB Cloud database `society_management`, all migrations applied and catalog seeded.
- TLS-enabled Prisma adapter with serverless pool tuning (pool size 2, 30s timeouts).
- Environment variables managed through the Vercel API.
- `npm run typecheck`, `npm run lint`, `npm run build` all pass (32 routes).

---

## 3. Verification highlights

- Login works end-to-end on Vercel with the seeded super-admin credentials.
- Society/floor deletion cascades verified against live data with no orphan records.
- XLSX import parsed all 672 workbook rows with zero errors.
- Export workbook inspected: merged banners, four theme colors, autofilter and frozen panes present.
- Sidebar search, pivot sorting, modal dialogs and admin/company navigation verified in browser.
