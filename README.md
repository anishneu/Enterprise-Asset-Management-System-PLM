# TalonVault AMS

Asset and training management application with document control, configurable forms, role-based permissions, and an approval workflow. The React frontend talks to a FastAPI backend; authentication is handled by Keycloak.

## Stack

| Layer | Technology |
|--------|------------|
| Frontend | React 19, AG Grid, Keycloak JS |
| Backend | FastAPI, Python 3.12+ |
| Database | MySQL (`authdb`) |
| Auth | Keycloak (`amsrealm` / `ams-react`) |

## Project structure

```
ams/
├── backend/          # FastAPI API, services, permissions
├── frontend/         # React SPA
├── db/
│   ├── migrations/   # Numbered SQL migrations (001–027)
│   └── authdb_f.sql  # Full schema dump (reference)
└── keycloak/         # Custom login theme (talonvault)
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.12+
- MySQL 8+
- Keycloak (default: `http://localhost:8080`)

## Local setup

### 1. Database

Create the database and apply migrations in order:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS authdb;"
mysql -u root -p authdb < db/migrations/001_doctab_extend.sql
# … continue through 027 in numeric order
```

Connection settings live in `backend/database/db.py` (default: `localhost`, user `root`, database `authdb`).

### 2. Keycloak

- Realm: `amsrealm`
- Client: `ams-react` (public, PKCE)
- Frontend config: `frontend/src/keycloak.js`

A custom theme is available under `keycloak/themes/talonvault`.

### 3. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # set SMTP_PASSWORD for email notifications
uvicorn main:app --reload --port 8000
```

API base URL: `http://localhost:8000`

### 4. Frontend

```bash
cd frontend
npm install
npm start
```

App URL: `http://localhost:3000`

## Main features

### Documents & forms

- **Documents** — versioned records with form-backed content, attachments, and workflow (Draft → Pending Approval → Released).
- **Form builder** — reusable form templates used by documents and training.
- **Approvals** — centralized pending / my / approved / rejected queues for forms, documents, and curricula.

### Training (PLM)

Training is split into **templates** (Curriculum) and **execution** (Records).

#### Curriculum (templates)

- Define curriculum code, name, revision, training form, linked released documents, and optional custom form fields.
- Optional approver on create can auto-submit for review; otherwise use **Send for review** from the grid.
- Release happens only through **Approvals** (no direct Release button).
- **Assign** is available only when status is **Released**; creates one training record per trainee.
- **Revise** on a released curriculum updates the same row to the next revision and returns it to **Draft** (does not create a duplicate row).

Revision rules: `A→B→C`, or `1→1.1→1.2→…→2→2.1` (see `backend/utils/revision.py`).

#### Training records (execution)

- Grid columns include Code, Curriculum, Trainee, Revision, Assigned, Due date, Completed, and Status.
- **View record** (eye icon) — read-only summary and form responses for anyone with access.
- **Open training** (clipboard icon) — only visible to the **assigned trainee** while status is not Completed. Fill the training form here.
- Execution statuses: **Assigned**, **In Progress**, **Completed** (default is Assigned).
- **Save** → In Progress (form data persisted; start time set from assignment date on first save).
- **Submit** → Completed (completion timestamp set automatically).
- **Cancel** closes without saving.
- Trainees cannot manually change status or dates; only the assigned user can update execution data.

### Administration

- **Users** and **Groups** (Keycloak-backed)
- **Parts** asset catalog
- **Audit** history on key entities
- Permission gates on UI actions and API routes (`backend/security/permissions.py`)

## API overview

| Prefix | Purpose |
|--------|---------|
| `/api/docs` | Documents |
| `/api/forms` | Form templates |
| `/api/approvals` | Approval requests |
| `/api/training-plm` | Courses, curriculum, assignments, records, qualification matrix |
| `/api/users`, `/api/groups` | Administration |
| `/api/auth/me` | Current user profile and permissions |

## Development

```bash
# Backend
cd backend && uvicorn main:app --reload

# Frontend production build
cd frontend && npm run build
```

### Useful migrations

- `027_clear_training_curriculum_records.sql` — truncates curriculum/assignment/record data for a clean training reset (dev only).

## License

MIT — see [LICENSE](LICENSE).
