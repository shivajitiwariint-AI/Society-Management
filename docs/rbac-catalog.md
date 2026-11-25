# RBAC catalog

RBAC is enforced on the server for every protected operation; hiding a button is not access control (SRS §8.1, §15.2). Role assignment is explicit per membership, and permission changes are audited.

## 1. Permission actions

SRS §8.2 standard actions:

| Action | Typical use |
| --- | --- |
| `CREATE` | Create a record in a module/resource |
| `READ` | View records within the permission's data scope |
| `UPDATE` | Modify a record within scope |
| `DELETE` | Delete or archive a record within scope |
| `APPROVE` | Approve an expense, booking, visitor, or similar workflow step |
| `REJECT` | Reject a workflow step |
| `EXPORT` | Export/report data subject to scope and entitlement |
| `IMPORT` | Import data |
| `ASSIGN` | Assign work orders, roles, or responsibilities |
| `CLOSE` | Close complaints/work orders |
| `REFUND` | Refund or reverse a payment — sensitive, separate permission |
| `MANAGE_SETTINGS` | Change module/company settings — sensitive, separate permission |

Sensitive operations require their **own** permissions: refunds, financial approvals, user administration, and role changes (SRS §8.2). A general `APPROVE` must not implicitly grant expense approval or refund authority.

Implementation convention for permission keys: `module_key.resource_key.ACTION`, for example `finance_billing.invoice.CREATE`, `accounting.expense.APPROVE`, `core.rbac_admin.role.ASSIGN`. Keys are stable and independent of display labels.

## 2. Data scopes

From SRS §8.4:

| Scope | Meaning | Example |
| --- | --- | --- |
| `PLATFORM` | Platform-wide operations | Super Admin company/module administration |
| `COMPANY` | All in-scope records of the active company | Company Admin managing society settings |
| `SOCIETY` | Assigned society records | Society Manager reading society records |
| `OWN` | The signed-in user's own permitted records | Resident viewing own flat, invoices, receipts |
| `ASSIGNED` | Records assigned to the user | Maintenance Staff viewing assigned work orders |
| `CUSTOM` | Rule-engine scope — **only if a safe, testable rule engine is approved** | Pending product-owner/technical approval; denied until then |

Scopes are additive constraints, not overrides: a `COMPANY` permission never crosses into another company, and `READ` with `OWN` scope never exposes another resident's private data.

## 3. Permission evaluation order

Every protected screen, Server Action, Route Handler, export, and job evaluates these steps **in order** and stops at the first failure (SRS §8.5, §10.6, §14):

1. The user is authenticated and active.
2. The user's membership is active.
3. The requested company and society are within that membership.
4. The module is enabled for the company (and the operation is permitted by its `access_mode`; disabled modules default to read-only history for specifically authorized users).
5. The user has the required permission.
6. The requested record falls within the permission's data scope.
7. Any additional business approval rule is satisfied.

Sensitive actions revalidate authorization at execution time. Role/permission administration is restricted to authorized administrators; self-assignment of privileged roles is prevented (SRS §15.2).

## 4. Example role matrix

Illustrative baseline from SRS §8.3; company/role configuration may refine it within platform entitlements.

| Role | Finance view | Create Invoice | Approve Expense | Refund |
| --- | --- | --- | --- | --- |
| Company Admin | Yes | Yes | Configurable | Configurable |
| Accountant | Yes | Yes | No | No |
| Treasurer | Yes | No | Yes | Configurable |
| Resident | Own records only | No | No | No |
| Security | No | No | No | No |

Other SRS §5 role expectations encoded through permissions/scopes: Society Manager uses `SOCIETY` scope for assigned societies; Maintenance Staff uses `ASSIGNED` for work orders; Vendor sees only assigned work orders and permitted documents when vendor portal access is enabled; Platform Support has no automatic access to resident personal data or financial records.

## 5. Storage model and audit

SRS §8.5 tables: `roles` (scope type `PLATFORM`/`COMPANY`/`SOCIETY`), `permissions`, `role_permissions` (unique on `role_id`, `permission_id`, with `data_scope`), `user_memberships`, and `user_roles` (with `assigned_by`, `assigned_at`, optional `expires_at`). Multiple roles per user are supported where allowed.

Invitation, activation/deactivation, role assignment/revocation, permission changes, and entitlement changes are written to `audit_logs`. Users cannot edit audit records through the ordinary admin UI.
