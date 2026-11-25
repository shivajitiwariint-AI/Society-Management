# Threat model and security risk register

This is the engineering threat model derived from the SRS §15.5 risk register. Severity is reviewed during threat modelling and before each production release (SRS §15.5). Verification tests map to the required security testing in SRS §15.6 and §20.1. Security is release-blocking.

| Risk | Impact | Mitigation | Verification test |
| --- | --- | --- | --- |
| Cross-company data exposure | Critical | Server-derived company context, scoped repositories, composite FKs; no native MySQL RLS is assumed; isolation tests | Cross-company isolation test for every major resource, including exports and file downloads; direct URL/API with another company's ID returns not-found |
| Broken object-level authorization (IDOR) | Critical | Record-level checks in service/repository layer; deny by default; stable opaque IDs without reliance on secrecy | IDOR tests on invoices, payments, documents, complaints, flats, and work orders across roles/scopes |
| Privilege escalation | Critical | Least privilege; protected role/permission administration; no self-assignment; MFA for privileged users; audit | RBAC matrix tests; attempt self-assignment of Super Admin/role-change permission; audit assertions |
| Disabled module accessed by direct URL/API | High | Server-side entitlement checks on pages, APIs, Server Actions, exports, and jobs; historical data read-only for authorized users | Direct API/Server Action/job tests per disabled module; navigation hidden; no new records created |
| Session theft | High | Argon2id; DB-backed opaque sessions; HttpOnly/SameSite/Secure cookies; rotation after login/privilege change; revocation; MFA | Session fixation, logout-all-devices, cookie flag, expiry/revocation, and privilege-change rotation tests |
| CSRF | High | SameSite cookies plus CSRF tokens on cookie-authenticated state-changing requests | CSRF tests for POST/PUT/DELETE Server Actions and Route Handlers |
| XSS | High | Safe rendering/output encoding, strict Zod input validation, CSP via nginx, careful rich-text handling | XSS payload tests in forms, notices, comments, and document metadata; CSP header assertion |
| Malicious file upload | High | Extension/MIME/size/content validation, non-guessable storage names, private storage outside web root, malware scanning where available | Upload/download authorization tests; path traversal, oversized and mismatched-MIME files; unauthenticated URL returns no file |
| Payment callback forgery | Critical (when gateway approved) | Signature verification, provider status recheck, idempotency; no integration enabled until provider approval | Signed/invalid/replayed webhook tests and idempotency tests; confirm no live callback route before approval |
| Duplicate financial transactions | Critical | DB unique constraints, transactional writes, idempotency keys, reversal entries instead of editing posted journals | Duplicate invoice/payment/refund tests; journal reconciliation and idempotency tests |
| Database compromise | Critical | Bind MySQL to `127.0.0.1`/private network; least-privilege app user; encrypted disk; secrets outside source control; network firewall | Verify bind address and firewall; review grants; secret-scanning and config review |
| Data loss | Critical | Automated `mysqldump` backups, retention, restore drills; RPO/RTO pending product owner | Scheduled-backup evidence and documented restore drill into the single `society_management` database; verify row counts and checksums |
| Sensitive data in logs | High | Redaction of tokens/passwords/identity/visitor/financial values; restricted log access; no stack traces in production errors | Log inspection tests for secrets/PII; force an error and verify generic error envelope |
| Denial of service / resource exhaustion | High | nginx rate-limit zones, request size limits, pagination, bounded report jobs, monitoring | Rate-limit tests on auth/API, oversized request rejection, paginated list checks |
| Dependency vulnerability | High | Pinned versions, `npm ci`, lockfile review, scanning, patch process | CI `npm ci` + audit/dependency scan; review of version bumps |
| Unauthorized support access | High | Time-bound approved elevation, visible support banner, automatic expiry, immutable audit | Elevation lifecycle test: approval required, banner shown, expiry revokes, audit event present and immutable |

## Required review gates

- Run RBAC matrix, entitlement, cross-company, cross-society, IDOR, session, CSRF/XSS, upload/download, and backup-restore tests in CI or release validation (SRS §15.6, §20.1).
- Independent penetration testing before commercial production launch.
- Do not release with unresolved critical security vulnerabilities (SRS §20.2.13).
