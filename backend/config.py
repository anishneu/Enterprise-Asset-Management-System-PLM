import os

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "root",
    "database": "authdb",
}

APP_NAME = os.getenv("APP_NAME", "TalonVault")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "ams-react")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "amsrealm")
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://localhost:8080")

ADMIN_NOTIFY_EMAIL = os.getenv("ADMIN_NOTIFY_EMAIL", "").strip()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
# Gmail app passwords are often pasted with spaces — strip them.
SMTP_PASSWORD = (os.getenv("SMTP_PASSWORD") or "").replace(" ", "").strip()
SMTP_FROM = os.getenv("SMTP_FROM", "").strip() or SMTP_USER or "noreply@talonvault.local"
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
