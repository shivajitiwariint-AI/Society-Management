# API documentation

Use **versioned REST** where APIs are needed. Base path: `/api/v1` (SRS §14). This README is the human-readable index; the OpenAPI document required by SRS §22 is a separate deliverable to be linked here when published.

## 1. Endpoint groups

| Group | Example path |
| --- | --- |
| Authentication | `/api/v1/auth/*` |
| Platform | `/api/v1/platform/*` |
| Companies | `/api/v1/companies/*` |
| Company modules | `/api/v1/companies/:id/modules/*` |
| Users and roles | `/api/v1/users/*`, `/api/v1/roles/*` |
| Societies | `/api/v1/societies/*` |
| Property | `/api/v1/buildings/*`, `/api/v1/flats/*` |
| Residents | `/api/v1/residents/*` |
| Finance | `/api/v1/invoices/*`, `/api/v1/payments/*`, `/api/v1/societies/:societyId/expenses`, `/api/v1/expenses/:id` |
| Accounting | `/api/v1/accounting/*` |
| Visitors | `/api/v1/visitors/*` |
| Complaints | `/api/v1/complaints/*` |
| Amenities | `/api/v1/amenities/*`, `/api/v1/bookings/*` |
| Reports | `/api/v1/reports/*` |
| Audit | `/api/v1/audit-logs/*` |

No endpoint may rely only on frontend navigation restrictions (SRS §14). Server Actions and Server Components use the same enforcement path as Route Handlers.

## 2. Enforcement checklist

Every protected endpoint must enforce, in order:

1. Authentication.
2. Active user status.
3. Active company membership.
4. Valid society membership where applicable.
5. Module entitlement (including `READ_ONLY` history for disabled modules).
6. Required RBAC permission.
7. Record-level data scope.
8. Input validation with shared Zod schemas.
9. Audit logging for sensitive actions.

Company ID is derived from verified membership and active selection, never from a client-supplied parameter. Deny by default; cross-tenant records return not-found rather than revealing existence. Rate limits are applied at nginx and on auth endpoints; large exports/reports are asynchronous.

## 3. Error envelope

Errors are consistent across Route Handlers and Server Actions. `message` is safe for production; details never include stack traces, secrets, tokens, or personal data.

```json
{
  "error": {
    "code": "MODULE_DISABLED",
    "message": "This module is unavailable for the active company.",
    "requestId": "req_01J9X4K2",
    "details": { "moduleKey": "finance_billing" },
    "retriable": false
  }
}
```

| Status | Use |
| --- | --- |
| `400` | Validation failure (include field-level issues in `details` only when safe) |
| `401` | Missing, expired, or invalid session |
| `403` | Disabled module, missing permission, out-of-scope record, or inactive membership |
| `404` | Not found, including cross-tenant IDs to prevent enumeration |
| `409` | Conflict / duplicate request within idempotency window |
| `429` | Rate limited |
| `500` | Generic server error; log internally with `requestId`, never expose details |

Sensitive actions return audit-recorded outcomes; entitlement changes are audited at platform level. Disabled modules preserve historical data and are read-only for specifically authorized users by default.
