from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from routes.parts import router as parts_router
from routes.users import router as users_router
from routes.docs import router as docs_router
from routes.form import router as form_router
from routes.form_types import router as form_types_router
from routes.training import router as training_router
from routes.groups import router as groups_router
from routes.approvals import router as approvals_router
from routes.audit import router as audit_router
from routes.training_plm import router as training_plm_router
from config import ADMIN_NOTIFY_EMAIL
from services.email_service import smtp_config_source, smtp_configured

app = FastAPI()

print("Starting FastAPI...")

@app.on_event("startup")
def log_email_configuration():
    if smtp_configured():
        source = smtp_config_source() or "unknown"
        print(f"Email notifications enabled ({source} SMTP). Admin alerts -> {ADMIN_NOTIFY_EMAIL}")
    else:
        print(
            "WARNING: Email notifications are disabled. Copy backend/.env.example to backend/.env "
            "and set SMTP_PASSWORD (Gmail app password). Keycloak hides the realm SMTP password "
            f"in API responses. Admin alerts target {ADMIN_NOTIFY_EMAIL}."
        )

@app.get("/")
def home():
    return {"message": "FastAPI is running"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ONLY ROUTERS (IMPORTANT)
app.include_router(parts_router)
app.include_router(users_router)
app.include_router(docs_router)
app.include_router(form_router)
app.include_router(form_types_router)
app.include_router(training_router)
app.include_router(groups_router)
app.include_router(approvals_router)
app.include_router(audit_router)
app.include_router(training_plm_router)
