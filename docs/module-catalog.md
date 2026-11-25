# Module catalog and entitlement map

Module keys are **stable identifiers** and must never be derived from display labels (SRS §7.4). The Super Admin configures entitlements per company; application code refers only to these keys.

## 1. Core capabilities — cannot be disabled

From SRS §7.5 and §23.6. These are platform capabilities, not entitlement-controlled business modules.

| Stable key | Capability | Notes |
| --- | --- | --- |
| `core.auth_account` | Authentication and account management | Argon2id, server-side opaque sessions, MFA for privileged users |
| `core.company_membership` | Company profile and membership | Company is the tenant; explicit memberships |
| `core.rbac_admin` | RBAC and permission administration | Platform, company, society roles; audit permission changes |
| `core.society_foundation` | Society/property foundation | Societies, buildings, floors, flats |
| `core.audit_logging` | Audit logging | Append-only to ordinary users |
| `core.security_settings` | Security and system settings | System settings, session/security controls |

## 2. Disableable business modules — 15

From SRS §7.5. Each row has one `company_modules` entitlement with `access_mode` of `FULL`, `READ_ONLY`, or `DISABLED`.

| # | Stable key | Module name | Scope summary (SRS §9) |
| --- | --- | --- | --- |
| 1 | `resident_management` | Resident Management | Owners, tenants, family, ownership/tenancy history, privacy-restricted directory |
| 2 | `finance_billing` | Finance and Maintenance Billing | Charge types, billing rules, invoices, dues, period locking |
| 3 | `payments_receipts` | Payments and Receipts | Payment/reference recording, receipts, refunds/reversals, reconciliation |
| 4 | `accounting` | Accounting | Chart of accounts, journals, expenses, approvals, trial balance/ledger |
| 5 | `visitor_management` | Visitor Management | Registration, approvals, gate entry/exit, retention controls |
| 6 | `complaints_maintenance` | Complaints and Maintenance | Categorization, SLA, assignment, comments, resolution evidence, reopen |
| 7 | `amenities_bookings` | Amenities and Bookings | Facilities, slots, eligibility, conflict prevention, cancellation |
| 8 | `parking_vehicles` | Parking and Vehicles | Slot inventory, allocations, visitor parking, vehicles |
| 9 | `staff_attendance` | Staff and Attendance | Staff profiles, shifts, attendance, leave, tasks |
| 10 | `vendor_contracts` | Vendor and Contract Management | Vendor profiles, contracts, work orders, invoices, limited vendor access |
| 11 | `notices_communication` | Notices and Communication | Targeted notices, read status, notification preferences/history |
| 12 | `documents` | Documents | Private upload/download, categories, permissions, retention |
| 13 | `meetings_voting` | Meetings and Voting | Agendas, attendance, minutes, eligibility, quorum, vote records |
| 14 | `advanced_reports` | Advanced Reports | Dashboards, exports, asynchronous generation for large reports |
| 15 | `integrations` | Integrations | External provider adapters; no provider activated without approval |

The SRS allows the product owner to split or combine modules before implementation (§7.5). Any key change must be a documented migration because keys are stable.

## 3. Dependency map

Only explicitly stated SRS §7.3 edges are enforced initially. Enabling a module is rejected when a required dependency is disabled, and the UI explains why.

| Module key | Requires | Source / rationale |
| --- | --- | --- |
| `finance_billing` | `core.society_foundation`, `resident_management` | SRS §7.3: finance depends on society setup and resident/flat records |
| `amenities_bookings` | `core.society_foundation`, `resident_management` | SRS §7.3: booking depends on society setup and resident management |
| `visitor_management` | `core.society_foundation`, `resident_management` | SRS §7.3: visitor management depends on society setup and resident/flat records |
| `advanced_reports` | Every underlying module whose data the report reads | SRS §7.3; resolved from the report's declared data sources |

Additional dependency edges are not asserted here; they require product-owner or technical-design confirmation. Module dependencies are stored in `module_dependencies`, and entitlement state in `company_modules` keyed uniquely by `(company_id, module_id)` (SRS §7.4).

## 4. Entitlement behaviour

When a module is `DISABLED` for a company (SRS §7.2):

- hide navigation items and entry points for that company;
- reject direct URL access on the server, not only in the browser;
- reject APIs, Server Actions, exports, and background jobs that attempt module actions;
- prevent new records and transactions;
- **preserve historical data — never delete it**;
- default to **read-only access for specifically authorized users**, with no new activity, unless the contract requires full restriction (open question #2, SRS §24);
- show a clear "module unavailable/disabled" message;
- keep platform-level audit history of entitlement changes.

A user still needs the relevant RBAC permission and data scope for read-only history; entitlement alone never grants data access. Disablement does not relax tenant scoping.
