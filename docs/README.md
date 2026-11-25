# Documentation index

This directory contains the design and operations documentation for the Society Management platform. The authoritative product baseline is [`requirements.md`](../requirements.md) (SRS v1.0); when a document here and the SRS disagree, the SRS wins and this documentation should be updated.

## Product and design

| Document | Purpose | Key SRS references |
| --- | --- | --- |
| [architecture.md](architecture.md) | Modular monolith shape, request flow, tenant isolation, service/repository boundaries, background jobs | §6, §11.2, §11.3, §12, §19 |
| [decisions.md](decisions.md) | Accepted architecture/product decisions and open questions awaiting the product owner | §2, §9, §11, §15.1, §23, §24 |
| [module-catalog.md](module-catalog.md) | Stable module keys, 6 core capabilities, 15 disableable business modules, dependency map, entitlement behaviour | §7, §9 |
| [rbac-catalog.md](rbac-catalog.md) | Actions, data scopes, permission evaluation order, example role matrix | §5, §8, §15.2 |
| [threat-model.md](threat-model.md) | Risk register with mitigations and verification tests | §15.5, §15.6, §20 |
| [database-design.md](database-design.md) | Entity groups, database standards, composite-FK tenant strategy, core ER diagram | §6.3, §13 |
| [api/README.md](api/README.md) | Versioned REST base path, endpoint groups, enforcement checklist, error envelope | §10.6, §14, §15.2 |

## Setup and operations

| Document | Purpose |
| --- | --- |
| [setup.md](setup.md) | Native Windows/Linux development setup for Node 24 and local MySQL 8 (no Docker) |
| [runbook.md](runbook.md) | Health checks, backup/restore, audit review, incident pointers |
| [../infrastructure/backup/README.md](../infrastructure/backup/README.md) | Backup scheduling and restore drills |
| [../infrastructure/native host installation/README.md](../infrastructure/native%20host%20installation/README.md) | Production-style host installation, services, TLS, firewall |

## Conventions used here

- **Company** means the SaaS tenant; a company may manage multiple societies.
- **Disabled module** means no new activity. Historical data is preserved and is read-only for specifically authorized users by default (SRS §7.2, §23.8).
- **Server-enforced** means the check happens in a service or repository on the server, never only in navigation or browser code.
- All timestamps are stored in UTC; all money is stored as `DECIMAL` or integer minor units, never floating point.
- `pending product owner` marks a question from SRS §24 that is deliberately not decided by engineering.

The detailed Prisma schema and committed migrations live in `packages/database`; the API/OpenAPI specification and full technical ERD are separate SRS §22 deliverables to be linked here when available.
