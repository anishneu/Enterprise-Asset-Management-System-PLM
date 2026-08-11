# Talon Vault

Enterprise-grade asset & operations management system — PLM workflows, RBAC, and full audit trails.

<img src="images/dashboard.png" alt="Dashboard" width="800"/>

Talon Vault is a multi-module asset lifecycle platform built for organizations that need to track parts, documents, forms, and training records through a controlled approval process. It does four things in concert: it manages parts and document revisions with a Draft → Pending Approval → Released → Obsolete lifecycle, it enforces who can see and touch what through a five-tier RBAC model backed by Keycloak, it routes multi-step approval workflows across roles, and it tracks training curricula and qualification records for PLM compliance. Every state change is written to an immutable audit log — nothing here trusts the client to self-report what happened.

**Stack:** FastAPI (Python) · React 19 · MySQL · Keycloak

**Author:** Anish Kuila


## Table of contents
- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Scale](#scale)
- [Install](#install)
- [Quickstart](#quickstart)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [RBAC model](#rbac-model)
- [Limitations](#limitations)

## What it does

```
User ──▶ [Keycloak Auth] ──▶ [FastAPI backend] ──▶ [MySQL]
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              Parts/Docs      Approval Workflow   Training/PLM
              (lifecycle)     (multi-role route)  (curricula, records)
                    │               │               │
                    └───────▶ Audit Log / Workflow History ◀──┘
```

Every entity (part, document, form, training record) carries a status field driven by the approval workflow engine. A change doesn't take effect until it clears the routing chain for its entity type, and every transition — who, what, when, from which state to which state — lands in `audit_log` / `workflow_history` rather than being inferred after the fact.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19, AG Grid, Kendo React Grid, dnd-kit (drag/drop form builder), Recharts |
| Backend | FastAPI, Pydantic schemas, python-jose (JWT) |
| Auth | Keycloak (realm-based RBAC, JWT bearer tokens) |
| Database | MySQL (PyMySQL / mysql-connector), 24 tables |
| Infra | Docker-composable services (backend, MySQL, Keycloak) |

## Scale

Numbers below are counted directly from the codebase, not estimated:

| Metric | Count |
|---|---|
| REST API endpoints | 66, across 11 route modules |
| Database tables | 24 |
| Permission tiers | 5 (SUPERADMIN, ADMIN, HR, DEVELOPER, USER) |
| Granular permission flags | 35+ |
| Training/PLM endpoints alone | 26 |

## Install

Requires Python 3.10+, Node 18+, MySQL 8, and a running Keycloak instance.

```bash
git clone https://github.com/anishneu/ams.git talon-vault
cd talon-vault

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DB + Keycloak credentials

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

## Quickstart

```bash
# Apply schema
mysql -u root -p < db/authdb.sql

# Run backend
cd backend && uvicorn main:app --reload --port 8000

# Run frontend
cd frontend && npm start
```

The frontend expects Keycloak to be reachable and configured with the `amsrealm` realm and the role aliases defined in `backend/constants/`.

## Project structure

```
ams/
├── backend/
│   ├── routes/        11 route modules — approvals, audit, auth, docs, forms,
│   │                  form_types, groups, me, parts, training, training_plm
│   ├── schemas/        Pydantic request/response models
│   ├── services/        Business logic layer
│   ├── security/        JWT validation, Keycloak integration
│   ├── constants/       Role/permission definitions
│   └── models/          ORM models
├── db/
│   ├── authdb.sql       Full schema (24 tables)
│   └── migrations/      Incremental migrations
├── keycloak/
│   └── themes/          Custom login theme
└── frontend/
    └── src/              React app (forms, grids, workflow UI)
```

## API reference

Grouped by resource domain (see `backend/routes/` for full request/response schemas):

| Domain | Purpose |
|---|---|
| `/auth`, `/me` | Session and current-user context |
| `/parts` | Part lifecycle CRUD and status transitions |
| `/docs` | Document revisions and lifecycle |
| `/forms`, `/form_types` | Dynamic FormBuilder-driven forms |
| `/approvals` | Multi-role approval routing |
| `/training`, `/training_plm` | Course/curriculum assignment and qualification records (26 endpoints) |
| `/groups`, `/users` | Org structure and user management |
| `/audit` | Read-only audit trail |

## RBAC model

Five app-level permission tiers map from Keycloak realm roles:

```
SUPERADMIN ──▶ full system access + role management
ADMIN      ──▶ administrative modules, no role management
HR         ──▶ training/qualification modules
DEVELOPER  ──▶ engineering-facing modules (parts, docs, forms)
USER       ──▶ read/request access only
```

Permissions are enforced server-side per-endpoint (35+ discrete flags like `AR_APPROVE`, `RECORD_REJECT`, `SYSTEM_CONFIGURATION`), not just hidden in the UI.

## Limitations

- Not deployed for real users — built and self-tested as a portfolio/learning project.
- No automated test suite yet.
- No CI/CD pipeline configured.
- Keycloak dependency means local setup requires a realm import step not yet scripted.


## License

MIT — see [LICENSE](LICENSE).
