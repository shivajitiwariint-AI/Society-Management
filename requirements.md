Society Management SaaS -- Software Requirements Specification
Document type: Product Requirements / Software Requirements
Specification (SRS)
Version: 1.0
Status: Initial baseline for development
Product: Multi-company Society Management Web Application
Target market: India initially, with an architecture that can
support other countries
Application scope: Web application only
Primary technology: Next.js
Database approach: Self-hosted/local database deployment
Authorization model: Role-Based Access Control (RBAC) +
company-level module entitlements
1. Purpose
This document defines the functional, technical, security, data, and
operational requirements for a multi-company Society Management SaaS web
application.

The system will allow multiple independent companies (customers) to
manage one or more housing societies, apartments, residential
communities, or managed properties from a single web platform.

Each company must have its own users, societies, buildings, flats,
residents, financial records, operational records, settings, and
documents. Company data must be isolated from other companies.

The platform administrator must be able to enable or disable modules for
each company. A company must only see and use modules that are enabled
for it and that its users are authorized to access.
2. Scope
2.1 Included in this release
- Responsive web application for desktop, tablet, and mobile browsers.
- Super Admin / SaaS administration portal.
- Company administration portal.
- Society administration portal.
- Resident and owner management through the web application.
- Staff, security, and vendor management through role-specific web
  screens.
- RBAC permissions at module, feature, action, and data-scope levels.
- Company-specific module enablement and disablement.
- Society/property hierarchy.
- Maintenance billing, payments recording, expenses, and accounting
  records.
- Visitor management.
- Complaints and maintenance work orders.
- Amenities and bookings.
- Parking and vehicles.
- Staff and vendor operations.
- Notices, announcements, documents, meetings, and reports.
- Audit logs, security controls, backups, and administrative
  monitoring.
- Local/self-hosted database support.
2.2 Explicitly excluded from this release
- Native Android application.
- Native iOS application.
- Play Store or App Store distribution.
- Separate security-guard mobile application.
- Offline-first mobile synchronization.
- Public consumer marketplace.
- AI-based features unless separately approved.
- Mandatory third-party cloud database.
- Automatic integration with banks or payment providers until provider
  and country requirements are approved.
The web application must be responsive and usable in modern mobile
browsers, but this does not make it a native mobile application.
3. Terminology
  Term                                Meaning
  Platform                            The complete Society Management
SaaS product

  Super Admin                         Platform-level administrator

  Company                             A SaaS customer / property
management organization

  Society                             A residential society or community
managed by a company

  User                                A person who can sign in to the
application

  Role                                A named set of permissions

  Permission                          An allowed action on a resource

  Module                              A functional area such as Finance
or Visitor Management

  Module entitlement                  Whether a module is enabled for a
company

  RBAC                                Role-Based Access Control

  Tenant isolation                    Preventing one company from
accessing another company's data
Local database                      A database deployed and operated on
the customer's or application's own
server/network, rather than
requiring a managed cloud database
4. Product goals
1. Provide one platform for managing multiple companies and their
   societies.
2. Keep each company's data securely separated.
3. Allow the platform administrator to enable or disable modules per
   company.
4. Allow each company to define roles and permissions within the limits
   granted by the platform.
5. Provide reliable finance, billing, payment-recording, and audit
   capabilities.
6. Make the application configurable for different society structures
   and operating rules.
7. Support local/self-hosted deployment and database operation.
8. Keep the architecture maintainable and scalable without starting
   with unnecessary microservices.
5. User types and access boundaries
5.1 Platform-level users
Super Admin - Manage companies and their status. - Create and
configure subscription plans. - Enable or disable modules for each
company. - Set company-level feature limits. - Manage platform-level
configuration. - View platform-level operational metrics. - Access
platform audit logs. - Manage support access through a controlled,
audited process.

Platform Support - View permitted company support information. -
Handle support tickets. - Must not automatically receive access to
resident personal data or financial records. - Any elevated access must
be time-bound, approved, and audited.
5.2 Company-level users
A company may have one or more societies.

Company Owner / Company Admin - Manage company profile and
settings. - Manage societies under the company. - Invite users and
assign roles. - Configure company-level roles and permissions. - Use
only modules enabled for the company. - View company-level reports
permitted by their role.

Society Manager - Manage assigned societies. - Manage property
structure, residents, operations, and society settings according to
permissions.

Accountant / Treasurer - Manage invoices, receipts, payments,
expenses, and accounting records according to permissions.

Committee Member - View or approve selected operational and
financial activities.

Security Operator - Register visitors, process approvals, and record
entry/exit using the authorized web screens.

Maintenance Staff - View assigned work orders and update their
progress.

Vendor - Access only assigned work orders and permitted documents,
if vendor portal access is enabled.

Resident / Owner / Tenant - View their own profile, permitted flat
information, invoices, receipts, notices, complaints, and bookings. -
Cannot access another resident's private information unless explicitly
authorized.
6. Multi-company and data isolation requirements
6.1 Company hierarchy
The data hierarchy shall be:
Platform
  └── Company
       ├── Company Users
       ├── Company Settings
       ├── Enabled Modules
       ├── Society A
       │    ├── Buildings / Towers
       │    │    ├── Floors
       │    │    └── Flats / Units
       │    ├── Residents / Owners / Tenants
       │    ├── Finance and Operations
       │    └── Documents
       └── Society B
            └── ...
A company may manage multiple societies. A user may have membership in
more than one company or society, but access must be explicitly granted
for each membership.
6.2 Mandatory isolation rules
- Every company-owned business record must be associated with a
  company_id.
- Society-level records must also carry or be securely traceable to a
  society_id.
- The server must derive company context from the authenticated user's
  verified membership and active selection.
- The application must never trust a company ID supplied only by a
  browser request.
- All reads, updates, deletes, exports, background jobs, and file
  downloads must enforce company scope.
- Database constraints should prevent invalid cross-company
  relationships.
- Cross-company access must be denied by default.
- Super Admin access must use separate platform-level authorization.
- Support impersonation, if implemented, must require explicit
  authorization, show a visible support banner, expire automatically,
  and create immutable audit events.
- Automated tests must attempt cross-company access for every major
  resource.
6.3 Tenant isolation implementation
Recommended initial model: - One MySQL database. - Shared schema
with company_id on company-scoped tables. - MySQL Row-Level
Security (RLS) as an additional isolation layer where compatible with
the selected connection and transaction model. - Application-level
authorization and scoped repository queries. - Composite foreign keys or
equivalent constraints for company-scoped relationships. - A documented
path to dedicated database deployment for enterprise customers.

RLS must not be treated as a replacement for application authorization.
If connection pooling is used, company context must be set safely within
each transaction and reset reliably.
7. Module entitlement system
7.1 Requirement
The Super Admin must be able to enable or disable each supported module
separately for each company.

Example:

  Module                  Company A   Company B   Company C
  Society Setup             Enabled     Enabled     Enabled
Resident Management       Enabled     Enabled     Enabled
Finance                   Enabled     Enabled    Disabled
Visitor Management        Enabled    Disabled     Enabled
Complaints                Enabled     Enabled     Enabled
Amenities                Disabled     Enabled     Enabled
Parking                   Enabled    Disabled     Enabled
Staff Management          Enabled     Enabled    Disabled
Vendor Management        Disabled     Enabled    Disabled
Meetings & Voting         Enabled    Disabled     Enabled
Advanced Reports          Enabled    Disabled    Disabled

This table is illustrative. Actual entitlements are configured by the
Super Admin.
7.2 Module entitlement behavior
When a module is disabled for a company: - Hide its navigation item and
entry points for that company. - Reject direct URL access on the
server. - Reject its APIs on the server. - Reject background jobs that
attempt to perform disabled-module actions. - Prevent new records and
transactions in that module. - Preserve historical data; do not delete
it. - Provide a clear message that the module is unavailable or
disabled. - Keep platform-level audit history of entitlement changes.

The product owner must define whether a disabled module is fully
inaccessible or available in read-only mode. The default requirement is
no new activity, with historical records available read-only to
specifically authorized users, unless the company contract requires
full restriction.
7.3 Module dependency rules
The platform must support module dependencies. For example: - Finance
may depend on Society Setup and Resident/Flat records. - Amenity Booking
may depend on Society Setup and Resident Management. - Visitor
Management may depend on Society Setup and resident/flat records. -
Advanced Reports may depend on the underlying modules whose data is
reported.

The Super Admin must not be able to enable a module if required
dependencies are disabled. The UI must explain the dependency.
7.4 Module configuration data model
Suggested tables:

modules - id - module_key (unique, stable key) - name -
description - is_core - is_active - created_at - updated_at

module_dependencies - id - module_id - depends_on_module_id

company_modules - id - company_id - module_id -
is_enabled - access_mode (FULL, READ_ONLY, DISABLED) -
enabled_at - disabled_at - changed_by - reason - Unique
constraint on (company_id, module_id)

module_feature_limits - id - company_id - module_id -
feature_key - limit_value - configuration_json

Module keys must be stable identifiers and must not depend on display
labels.
7.5 Core modules
Core platform capabilities that cannot be disabled: - Authentication and
account management. - Company profile and membership. - RBAC and
permission administration. - Society/property foundation. - Audit
logging. - Security and system settings.

Business modules that can be enabled or disabled per company: 1.
Resident Management. 2. Finance and Maintenance Billing. 3. Payments and
Receipts. 4. Accounting. 5. Visitor Management. 6. Complaints and
Maintenance. 7. Amenities and Bookings. 8. Parking and Vehicles. 9.
Staff and Attendance. 10. Vendor and Contract Management. 11. Notices
and Communication. 12. Documents. 13. Meetings and Voting. 14. Advanced
Reports. 15. Integrations.

The product owner may split or combine these modules before
implementation.
8. RBAC -- Role-Based Access Control
8.1 Requirements
The system must implement server-enforced RBAC. Hiding buttons in the
frontend is not sufficient security.

RBAC must support: - Platform roles. - Company roles. - Society-specific
role assignments. - Custom roles. - Multiple roles per user where
allowed. - Module-level permissions. - Feature/resource-level
permissions. - Action-level permissions. - Data scope restrictions. -
Role assignment and revocation. - Permission change audit history.
8.2 Permission actions
Standard actions: - CREATE - READ - UPDATE - DELETE -
APPROVE - REJECT - EXPORT - IMPORT - ASSIGN - CLOSE -
REFUND - MANAGE_SETTINGS

Sensitive actions such as refunds, financial approvals, user
administration, and role changes must have separate permissions.
8.3 Permission examples
  Role                  Finance View   Create Invoice   Approve Expense         Refund
  Company Admin                  Yes              Yes      Configurable   Configurable
Accountant                     Yes              Yes                No             No
Treasurer                      Yes               No               Yes   Configurable
Resident          Own records only               No                No             No
Security                        No               No                No             No
8.4 Data scopes
Permissions must support: - PLATFORM - COMPANY - SOCIETY - OWN -
ASSIGNED - CUSTOM (only if a safe, testable rule engine is approved)

Examples: - A Society Manager may read records for assigned societies. -
A Resident may read only their own permitted flat and account records. -
Maintenance Staff may read only work orders assigned to them. - A
Company Admin may manage all societies within their company, subject to
platform entitlements.
8.5 Suggested RBAC schema
roles - id - scope_type (PLATFORM, COMPANY, SOCIETY) -
company_id nullable for platform roles - society_id nullable where
applicable - name - role_key - is_system_role - created_at

permissions - id - module_key - resource_key - action -
description

role_permissions - role_id - permission_id - data_scope -
Unique constraint on (role_id, permission_id)

user_memberships - id - user_id - company_id - society_id
nullable - status - created_at

user_roles - id - user_id - role_id - company_id -
society_id nullable - assigned_by - assigned_at - expires_at
nullable

A permission evaluation must verify, in order: 1. The user is
authenticated and active. 2. The user's membership is active. 3. The
requested company and society are within that membership. 4. The module
is enabled for the company. 5. The user has the required permission. 6.
The requested record falls within the permission's data scope. 7. Any
additional business approval rule is satisfied.
9. Functional modules
9.1 Platform / Super Admin
- Dashboard for company counts, active companies, module usage, and
  system status.
- Create, view, update, activate, suspend, and archive company
  accounts.
- Configure company limits and module entitlements.
- Manage platform roles and support users.
- View platform audit logs.
- Configure global defaults, supported currencies, countries, and
  timezones.
- View subscription and platform billing information if SaaS billing
  is enabled.
- Record a reason for sensitive company or entitlement changes.
9.2 Company Management
- Company registration and profile.
- Company contact and address.
- Company status and configuration.
- Multiple societies under one company.
- Company users and invitations.
- Company roles and permissions.
- Company-level module status and limits.
- Company audit history.
- Company data export request.
9.3 Society Setup
- Society profile and registration information.
- Buildings, towers, blocks, floors, and flats/units.
- Configurable property numbering.
- Flat area and area unit.
- Occupancy status.
- Society-specific settings.
- Society-level administrators and committees.
9.4 Resident Management
- Owners, co-owners, tenants, and family members.
- Resident invitations and account verification.
- Ownership records and transfer history.
- Tenancy start/end dates.
- Resident-to-flat relationships.
- Vehicle registration.
- Resident directory with privacy restrictions.
- Document verification status.
9.5 Finance and Maintenance Billing
- Configurable charge types.
- Fixed, area-based, usage-based, and one-time charges.
- Billing cycles and due dates.
- Late fees and discounts.
- Invoice generation and numbering.
- Partial payments and outstanding balances.
- Manual/offline payment recording with approval controls.
- Receipts and credit/debit adjustments.
- Dues and collection reports.
- Duplicate invoice prevention.
- Financial period locking.
9.6 Payments
- Payment order/reference recording.
- Payment status tracking.
- Gateway integration only after provider approval.
- Webhook signature verification for online gateways.
- Duplicate event protection.
- Refund and reversal workflow.
- Reconciliation reports.
- Payment audit trail.
9.7 Accounting and Expenses
- Chart of accounts.
- Double-entry journal.
- Expense categories.
- Expense submission and approval.
- Vendor bills and payment records.
- Income and expenditure reports.
- Trial balance and ledger.
- Reversal entries instead of editing posted journals.
- Period close and reopening with authorization.
9.8 Visitor Management
- Visitor registration.
- Visitor approval request.
- Pre-approved visitors.
- Delivery and service visitor categories.
- Gate-wise entry and exit.
- Visitor history.
- Configurable visitor data retention.
- Restricted access to visitor personal data.
9.9 Complaints and Maintenance
- Complaint creation and categorization.
- Priority and SLA configuration.
- Assignment to staff or vendor.
- Comments, attachments, and status history.
- Resolution evidence.
- Resident feedback.
- Reopen workflow.
- SLA and performance reports.
9.10 Amenities and Bookings
- Facility configuration.
- Operating hours and slot rules.
- Capacity and booking limits.
- Resident eligibility.
- Approval and fee rules.
- Conflict prevention for simultaneous bookings.
- Cancellation and refund policy.
- Booking history.
9.11 Parking and Vehicles
- Parking slot inventory.
- Slot allocation.
- Vehicle records.
- Visitor parking.
- Allocation history.
- Configurable parking rules.
9.12 Staff and Vendors
- Staff profiles and assigned roles.
- Shift and attendance records.
- Leave requests.
- Task assignment.
- Vendor profiles and contracts.
- Work orders and invoices.
- Vendor access limited to assigned work.
9.13 Notices and Communication
- Notices and announcements.
- Audience targeting by company, society, building, or role.
- Read status.
- In-app and email notification integration.
- Optional SMS/WhatsApp integrations.
- Emergency announcements.
- Notification preferences and delivery history.
9.14 Documents
- Private document upload and download.
- Document categories and metadata.
- Access permissions.
- File type and size validation.
- Malware scanning before availability where supported.
- Retention and deletion policy.
- Secure, short-lived download links or authenticated file streaming.
9.15 Meetings and Voting
- Meeting scheduling.
- Agenda management.
- Attendance.
- Minutes and attachments.
- Voting eligibility.
- Quorum rules.
- Vote recording and result publication.
- Audit trail for voting configuration and results.
9.16 Reports
- Company and society dashboards.
- Flat and resident reports.
- Collection and outstanding reports.
- Expense and accounting reports.
- Complaint and SLA reports.
- Visitor reports.
- Booking and parking reports.
- Export to PDF, XLSX, and CSV subject to permissions.
- Asynchronous generation for large reports.
10. Web application screen groups
10.1 Public and authentication screens
- Login.
- Logout.
- Forgot password.
- Reset password.
- Email/phone verification.
- Invitation acceptance.
- Unauthorized page.
- Session expired page.
10.2 Super Admin screens
- Platform dashboard.
- Company list.
- Create/edit company.
- Company details.
- Company module configuration.
- Module dependency view.
- Platform user and role management.
- Platform audit logs.
- System settings.
10.3 Company Admin screens
- Company dashboard.
- Company profile.
- Society list and details.
- Company user management.
- Role and permission matrix.
- Enabled modules and usage limits.
- Company settings.
10.4 Society screens
- Society dashboard.
- Buildings, floors, and flats.
- Resident directory and resident details.
- Finance dashboard.
- Billing rules and invoice list.
- Payment and receipt screens.
- Expense approvals.
- Visitor register.
- Complaints and work orders.
- Amenities and booking calendar.
- Parking.
- Staff and vendors.
- Notices and documents.
- Meetings and reports.
10.5 Resident web screens
- Resident dashboard.
- My profile and family.
- My flat.
- My invoices and receipts.
- My complaints.
- Visitor approvals.
- Amenity bookings.
- Notices.
- Documents.
- Support requests.
10.6 Common screen behavior
Every protected screen must: - Check authentication. - Check active
company/society context. - Check module entitlement. - Check role and
permission. - Enforce record-level data scope. - Display loading, empty,
success, and error states. - Avoid exposing sensitive data in browser
logs or URLs. - Support keyboard navigation and accessible form labels.

Confirmed database requirement: Use MySQL installed on the local machine/server. The Next.js backend must connect to MySQL using localhost or 127.0.0.1. Do not use PostgreSQL, SQLite, Docker, or a managed cloud database for this deployment.
11. Technology stack
11.1 Required stack
  Layer                               Technology
  Web framework                       Next.js (App Router)

  Language                            TypeScript

  UI                                  React

  Styling                             Tailwind CSS

  UI components                       Accessible component library such
as shadcn/ui

  Forms                               React Hook Form

  Validation                          Zod

  Database                            MySQL, self-hosted/local
deployment

  ORM                                 Prisma

  Authentication                      Secure server-side session
architecture; Auth.js or an
approved equivalent

  Authorization                       Custom RBAC service with
server-side enforcement

  Cache / background jobs             Redis and a queue library when
required

  File storage                        Local private storage initially,
behind a storage adapter

  API documentation                   OpenAPI

  Unit/integration tests              Vitest or Jest

  Browser end-to-end tests            Playwright

  Containers                          direct installation and configuration on the host operating system

  Reverse proxy                       Nginx or equivalent

  CI/CD                               Git-based pipeline
Monitoring                          Structured logs, health checks, and
error monitoring
Exact library versions must be pinned and reviewed at project
initialization. Do not use unmaintained packages.
11.2 Next.js implementation rules
- Use the App Router.
- Use Server Components by default.
- Use Client Components only for interactive UI that requires browser
  state.
- Keep database access on the server.
- Never import Prisma or database credentials into client-side
  bundles.
- Use Server Actions or Route Handlers only with explicit
  authentication, authorization, validation, and audit requirements.
- Centralize business logic in service modules rather than duplicating
  it in pages and actions.
- Use DTO/schema validation at all trust boundaries.
- Use a shared API/service layer for consistent permission checks.
- Use middleware only as an early navigation filter; it is not the
  final authorization boundary.
- Avoid exposing internal IDs or secrets unnecessarily.
11.3 Local database interpretation and deployment
For this SRS, local database means self-hosted MySQL, running
on the same server or a private server/network controlled by the
application operator. The application must not require a managed cloud
database service.

Development setup should support native local installation and service configuration:
society-management/
├── apps/
│   └── web/                 # Next.js application
├── packages/
│   ├── database/             # Prisma schema and migrations
│   ├── authorization/        # RBAC and entitlement logic
│   ├── validation/           # Shared Zod schemas
│   └── shared/               # Shared types and utilities
├── infrastructure/
│   ├── native host installation/
│   ├── nginx/
│   └── backup/
├── docs/
├── native host installation-compose.yml
├── .env.example
└── README.md
MySQL must: - Listen only on localhost or a private network, not
the public internet. - Use a dedicated least-privilege application
database user. - Use strong credentials stored outside source control. -
Have automated backups and tested restore procedures. - Use encrypted
disks or volume encryption where available. - Use TLS when connections
cross a network. - Be monitored for disk, connection, and backup health.

If "local database" is later confirmed to mean SQLite on a single
computer, the architecture must be reassessed. SQLite is not the
recommended default for a multi-company, concurrent, finance-heavy
production SaaS system.
12. Suggested application architecture
Start with a modular monolith. Do not introduce microservices in the
first release unless measured requirements justify them.
Browser
  |
  v
Next.js Web Application
  |
  +-- Authentication
  +-- Company Context
  +-- Module Entitlements
  +-- RBAC Authorization
  +-- Feature Modules
  |     +-- Company
  |     +-- Society
  |     +-- Residents
  |     +-- Finance
  |     +-- Visitors
  |     +-- Complaints
  |     +-- Amenities
  |     +-- Staff
  |     +-- Reports
  |
  v
Service / Repository Layer
  |
  +-- MySQL
  +-- Private File Storage
  +-- Optional Redis / Job Worker
  +-- External Provider Adapters
Each business module must have a clear boundary and must not bypass
common authorization, tenant context, audit, or validation services.
13. Database requirements
13.1 Database standards
- MySQL.
- UUID primary keys for major entities.
- Foreign keys and appropriate unique constraints.
- created_at and updated_at timestamps.
- created_by and updated_by where applicable.
- company_id on company-owned tables.
- society_id on society-owned tables.
- Indexes on company, society, status, date, and commonly searched
  columns.
- Decimal/numeric or integer minor units for money; never
  floating-point money.
- UTC timestamps with timezone-aware types.
- Migrations committed to version control.
- No production schema changes made manually without a migration.
- Posted financial records must be immutable or corrected through
  reversal entries.
13.2 Core tables
Platform and company - companies - company_settings -
modules - module_dependencies - company_modules -
module_feature_limits

Identity and access - users - sessions - user_memberships -
roles - permissions - role_permissions - user_roles -
invitation_tokens

Society and property - societies - buildings - floors -
flats - flat_ownerships - tenancies - family_members -
vehicles - parking_slots - parking_allocations

Finance - charge_types - billing_rules - invoices -
invoice_items - payments - payment_events - refunds -
accounts - journal_entries - journal_lines - expenses -
expense_approvals - bank_transactions

Operations - gates - visitors - visitor_approvals -
visitor_sessions - complaint_categories - complaints -
complaint_assignments - complaint_comments - amenities -
amenity_slots - bookings - employees - attendance - shifts -
vendors - contracts - work_orders

Communication and governance - notices - notifications -
notification_preferences - documents - document_permissions -
meetings - meeting_agendas - meeting_attendance -
voting_sessions - voting_eligibility - votes - meeting_minutes

Security and system - audit_logs - login_history -
security_events - idempotency_records - outbox_events -
system_settings

The detailed ERD, column types, indexes, constraints, and Prisma models
must be produced as a separate technical design deliverable before
production implementation.
14. API requirements
Use versioned REST APIs where APIs are needed.

Base path: /api/v1

Every protected endpoint must enforce: 1. Authentication. 2. Active user
status. 3. Active company membership. 4. Valid society membership where
applicable. 5. Module entitlement. 6. Required RBAC permission. 7.
Record-level data scope. 8. Input validation. 9. Audit logging for
sensitive actions.

Suggested API groups:

  API group         Example path
  Authentication    /api/v1/auth/*
Platform          /api/v1/platform/*
Companies         /api/v1/companies/*
Company modules   /api/v1/companies/:id/modules/*
Users and roles   /api/v1/users/*, /api/v1/roles/*
Societies         /api/v1/societies/*
Property          /api/v1/buildings/*, /api/v1/flats/*
Residents         /api/v1/residents/*
Finance           /api/v1/invoices/*, /api/v1/payments/*
Accounting        /api/v1/accounting/*
Visitors          /api/v1/visitors/*
Complaints        /api/v1/complaints/*
Amenities         /api/v1/amenities/*, /api/v1/bookings/*
Reports           /api/v1/reports/*
Audit             /api/v1/audit-logs/*

Do not create an endpoint that relies only on frontend navigation
restrictions.
15. Security requirements and risk management
Security is a release-blocking requirement.
15.1 Authentication and session security
- Use a maintained authentication library or a reviewed
  implementation.
- Hash passwords using Argon2id or an approved strong password hashing
  algorithm.
- Use secure, HttpOnly, SameSite cookies for browser sessions.
- Enable Secure cookies in production.
- Rotate session identifiers after login and privilege changes.
- Support session revocation and logout from all devices.
- Apply login rate limits and progressive abuse protection.
- Provide secure password reset tokens with short expiry and one-time
  use.
- Require MFA for Super Admin and other privileged users.
- Do not store passwords, access tokens, or refresh tokens in
  localStorage.
- Protect against session fixation and CSRF.
15.2 Authorization security
- Enforce RBAC on the server for every protected operation.
- Enforce company and society scope on every data access.
- Enforce module entitlement on pages, APIs, Server Actions, jobs, and
  exports.
- Deny access by default.
- Do not rely on hidden UI elements as an access control.
- Prevent privilege escalation and self-assignment of privileged
  roles.
- Restrict role and permission administration to authorized
  administrators.
- Record permission and entitlement changes in audit logs.
- Revalidate authorization for sensitive actions at execution time.
15.3 Application security
Protect against: - SQL injection. - Cross-Site Scripting (XSS). -
Cross-Site Request Forgery (CSRF). - Broken Access Control / IDOR. -
Server-Side Request Forgery (SSRF). - Path traversal. - Insecure direct
object references. - Unrestricted file upload. - Clickjacking. - Open
redirects. - Brute-force and credential stuffing. - Denial of Service
and resource exhaustion. - Sensitive information exposure. - Dependency
and supply-chain vulnerabilities. - Insecure configuration and secrets
leakage.

Controls: - Parameterized database access through Prisma. - Strict
server-side schema validation. - Output encoding and safe rendering. -
CSRF protection for cookie-authenticated state-changing requests. -
Content Security Policy and security headers. - Strict redirect
allowlists. - File extension, MIME, size, and content validation. -
Malware scanning for uploaded files where available. - Private file
storage; no public directory for sensitive documents. - Rate limiting
and request size limits. - Dependency scanning and lockfile review. -
Production error messages must not expose stack traces or secrets.
15.4 Sensitive data controls
- Collect only information needed for the product's purpose.
- Restrict access to identity documents, visitor details, phone
  numbers, and financial records.
- Encrypt data in transit and use encrypted storage/volumes at rest.
- Keep secrets outside source control.
- Mask sensitive values in logs.
- Define data retention and secure deletion policies.
- Provide controlled data export.
- Maintain an incident response process.
- Review applicable privacy and data protection laws for each target
  country.
15.5 Security risk register
  Risk                    Impact                  Required mitigation
  Cross-company data      Critical                Company scoping, RLS
exposure                                        where suitable,
composite constraints,
isolation tests

  Broken object-level     Critical                Record-level permission
authorization                                   checks on every
operation

  Privilege escalation    Critical                Least privilege,
protected role
administration, audit

  Disabled module         High                    Server-side entitlement
accessed by direct                              checks everywhere
URL/API                                         

  Session theft           High                    Secure cookies, session
rotation, MFA,
revocation

  CSRF                    High                    SameSite cookies and
CSRF controls

  XSS                     High                    Output encoding, CSP,
safe rich-text handling

  Malicious file upload   High                    File validation,
private storage,
malware scanning

  Payment callback        Critical                Signature verification,
forgery                                         provider status check,
idempotency

  Duplicate financial     Critical                Database constraints,
transactions                                    transactions,
idempotency keys

  Database compromise     Critical                Network isolation,
least privilege,
encryption, backups

  Data loss               Critical                Automated backups,
point-in-time recovery
where supported,
restore tests

  Sensitive data in logs  High                    Log redaction and
access restrictions

  Denial of service       High                    Rate limits, request
limits, monitoring

  Dependency              High                    Pinned dependencies,
vulnerability                                   scanning, patch process
Unauthorized support    High                    Just-in-time access,
access                                          approval, visible
banner, immutable audit
Severity and risk must be reviewed during threat modelling and before
each production release.
15.6 Security testing
- Authentication and session tests.
- RBAC permission matrix tests.
- Cross-company isolation tests.
- Cross-society isolation tests.
- IDOR tests.
- Direct API access tests for disabled modules.
- File upload and download authorization tests.
- CSRF and XSS tests.
- Dependency and container scans.
- Backup restoration tests.
- Independent penetration testing before commercial production launch.
16. Audit logging
Record security-sensitive and business-critical events.

Examples: - Login success/failure. - Password and MFA changes. - User
invitation and deactivation. - Role and permission changes. - Company
module enable/disable. - Company and society status changes. - Invoice
generation and adjustment. - Payment recording, refund, and reversal. -
Expense approval. - Ownership and tenancy changes. - Document access
where required. - Data export. - Support or administrative elevated
access.

Audit record fields: - id - company_id nullable for platform
events - society_id nullable - actor_user_id - action -
resource_type - resource_id - result - reason nullable -
request_id - ip_address subject to privacy policy - user_agent
subject to privacy policy - created_at

Audit logs must be append-only to normal application users. Sensitive
audit records must not be editable through the ordinary admin UI.
17. Non-functional requirements
17.1 Performance targets
Initial targets to validate through load testing: - Common API
operations: p95 below 500 ms under agreed test load. - Standard
dashboard: usable within 3 seconds under agreed test conditions. -
Search: p95 below 1 second for normal datasets. - Large exports and
reports: background processing. - Pagination required for large lists. -
Database query plans reviewed for high-volume screens.
17.2 Availability and recovery
Proposed initial targets: - Monthly availability objective: 99.9%,
subject to infrastructure design. - Automated database backup. - Defined
RPO and RTO approved by the product owner. - Documented restore
procedure. - Periodic restore drills. - Health checks for web
application and database. - Alerting for failed backups, disk capacity,
and service errors.
17.3 Browser support
Support current stable versions of: - Google Chrome. - Microsoft Edge. -
Mozilla Firefox. - Safari.

The interface must be responsive for desktop, tablet, and mobile browser
widths.
17.4 Accessibility
Target WCAG 2.2 AA where practical: - Keyboard access. - Visible focus
states. - Accessible labels. - Sufficient contrast. -
Screen-reader-friendly forms and tables. - Accessible validation and
error messages.
17.5 Localization
- Initial interface language: English.
- Architecture must allow additional languages such as Hindi.
- Company/society timezone configuration.
- Currency and date formatting by locale.
- Store timestamps consistently in UTC.
- Store currency codes with financial values.
18. File and document storage
For the initial self-hosted deployment: - Store files outside the public
web root. - Use generated, non-guessable storage names. - Keep original
filenames as metadata only. - Enforce company and resource authorization
before download. - Validate file size, type, and content. - Prevent path
traversal. - Scan files for malware where tooling is available. - Back
up files consistently with database references. - Define retention and
deletion policies.

Create a storage adapter so local disk storage can later be replaced by
S3-compatible storage without rewriting business modules.
19. Background jobs and reliability
Use a background job mechanism only where required. If Redis is
introduced, it must be self-hosted or privately deployed for this
release.

Potential jobs: - Scheduled maintenance invoice generation. - Payment
reconciliation. - Notification delivery. - Report generation. - Expiring
visitor approvals. - SLA reminders. - Subscription reminders, if SaaS
billing is included. - File scanning and document processing.

Jobs must: - Carry verified company context. - Recheck module
entitlement and authorization where relevant. - Be idempotent. - Have
retry limits and failure handling. - Record execution status. - Avoid
duplicate financial effects. - Use a dead-letter or failed-job review
process.
20. Testing and acceptance criteria
20.1 Required testing
- Unit tests for business services.
- Integration tests for database and authorization.
- API/Route Handler tests.
- Playwright end-to-end tests.
- RBAC matrix tests.
- Module entitlement tests.
- Cross-company and cross-society isolation tests.
- Finance and accounting reconciliation tests.
- Security tests.
- Performance/load tests.
- Backup and restore tests.
- User Acceptance Testing.
20.2 Release acceptance criteria
The release is not accepted until: 1. Users can authenticate and
securely end sessions. 2. Companies and societies can be created and
managed. 3. A company cannot access another company's records. 4. RBAC
is enforced on server-side operations. 5. Module enablement and
disablement works per company. 6. Disabled modules cannot be accessed
through direct URLs, APIs, or background jobs. 7. Historical data is
preserved when a module is disabled. 8. Financial totals and journal
entries reconcile. 9. Duplicate payment and invoice operations are
prevented. 10. Sensitive actions are audited. 11. File access is
authorization-controlled. 12. Automated backup and restore have been
demonstrated. 13. No unresolved critical security vulnerabilities
remain. 14. Agreed performance and browser tests pass. 15. User
documentation and deployment documentation are complete.
21. Implementation phases
Indicative phases; final estimates depend on team size and approved
requirements.
  Phase                   Scope                   Main output
  1                       Product setup and       Next.js project, local
architecture            MySQL, CI, design
system

  2                       Identity, company       Secure login,
context, RBAC           memberships, roles,
permissions

  3                       Module entitlement      Per-company module
engine                  controls and dependency
checks

  4                       Society and property    Companies, societies,
buildings, floors,
flats

  5                       Residents               Owners, tenants,
family, invitations

  6                       Finance                 Billing, invoices,
payment records,
accounting

  7                       Operations              Visitors, complaints,
amenities, parking,
staff, vendors

  8                       Communication and       Notices, documents,
governance              meetings, voting

  9                       Reports and             Dashboards, exports,
administration          audit
10                      Hardening and release   Security, performance,
backup, UAT, production
Build the security foundation, company isolation, RBAC, module
entitlements, and audit system before building the business modules.
22. Required project deliverables
- Approved SRS.
- Business workflows and user stories.
- Screen inventory and wireframes.
- UI design system.
- Architecture diagram.
- Threat model and security risk register.
- ER diagram.
- Complete MySQL schema.
- Prisma models and migrations.
- RBAC permission catalogue.
- Module entitlement catalogue and dependency map.
- API/OpenAPI specification.
- Next.js source code.
- Automated unit, integration, and end-to-end tests.
- native local installation and service configuration and deployment configuration.
- Backup and recovery scripts/documentation.
- Administrator and user manuals.
- Production release checklist.
23. Assumptions and decisions requiring confirmation
The following assumptions are used for this requirements baseline:
1. "Company" is the primary SaaS tenant. One company can manage
   multiple societies.
2. The application is web-only for this release. No native mobile app
   is included.
3. "Local database" means self-hosted MySQL on the application
   operator's server or private network, not SQLite and not a managed
   cloud database.
4. Next.js with TypeScript is the web application framework.
5. RBAC means Role-Based Access Control; the phrase "RBAS" in the
   initial request is interpreted as RBAC.
6. Core identity, company, security, audit, and property foundation
   capabilities cannot be disabled.
7. Business modules can be enabled or disabled independently per
   company, subject to dependencies.
8. Disabling a module preserves its historical data. The default is
   read-only access for specifically authorized users, with no new
   transactions.
9. The first release targets the Indian market, while country-specific
   configuration is supported in the architecture.
10. Online payment gateway selection, SaaS subscription charging,
    SMS/WhatsApp providers, and legal compliance details require
    separate approval.
11. The product starts as a modular monolith rather than microservices.
12. Detailed financial, tax, voting, retention, and approval rules must
    be confirmed with the business owner before implementation.
24. Open questions for product-owner sign-off
These decisions should be recorded before the related modules are
implemented:
- Is the deployment intended for one centrally hosted self-managed
  server serving multiple companies, or a separate local installation
  for each customer?
- Should a disabled module be completely inaccessible, or should
  authorized users retain read-only access to historical records?
- Can a company administrator create custom roles, or can only the
  Super Admin create roles?
- Can one user belong to multiple companies and multiple societies?
- Should residents have individual login accounts in the first
  release?
- Is online payment integration required in the first release, or
  should payment recording be supported first?
- Is SaaS subscription billing part of the first release?
- Which country, currency, language, and tax rules are required at
  launch?
- What are the required backup retention, RPO, and RTO targets?
- Which modules are mandatory for the first commercial release?