"""Load all settings from the project root .env (same file Docker Compose uses)."""

import os
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent

# Project .env is the single source of truth for local runs.
# Inside Docker this file usually isn't present; Compose-injected env is used instead.
load_dotenv(_ROOT / ".env", override=True)


def _env(key: str, default: str | None = None) -> str:
    raw = os.getenv(key)
    if raw is not None and str(raw).strip() != "":
        return str(raw).strip()
    if default is not None:
        return default
    raise RuntimeError(
        f"Missing required env var {key!r}. Set it in the project root .env file."
    )


def _env_optional(key: str, default: str = "") -> str:
    raw = os.getenv(key)
    if raw is None:
        return default
    return str(raw).strip()


def _env_int(key: str, default: int | None = None) -> int:
    raw = os.getenv(key)
    if raw is None or not str(raw).strip():
        if default is not None:
            return default
        raise RuntimeError(
            f"Missing required env var {key!r}. Set it in the project root .env file."
        )
    return int(raw)


def _env_bool(key: str, default: bool) -> bool:
    raw = os.getenv(key)
    if raw is None or not str(raw).strip():
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


# Database
DB_HOST = _env("DB_HOST")
DB_PORT = _env_int("DB_PORT", 3306)
DB_NAME = _env("DB_NAME")
DB_USER = _env("DB_USER")
DB_PASSWORD = _env("DB_PASSWORD")

DB_CONFIG = {
    "host": DB_HOST,
    "user": DB_USER,
    "password": DB_PASSWORD,
    "database": DB_NAME,
    "port": DB_PORT,
}

# Application
APP_NAME = _env_optional("APP_NAME", "TalonVault")
APP_BASE_URL = _env_optional("APP_BASE_URL", "http://localhost:3000")

# Keycloak
KEYCLOAK_URL = _env("KEYCLOAK_URL").rstrip("/")
KEYCLOAK_REALM = _env("KEYCLOAK_REALM")
KEYCLOAK_CLIENT_ID = _env("KEYCLOAK_CLIENT_ID")
KEYCLOAK_ADMIN = _env("KEYCLOAK_ADMIN")
KEYCLOAK_ADMIN_PASSWORD = _env("KEYCLOAK_ADMIN_PASSWORD")

CORS_ORIGINS = [
    origin.strip()
    for origin in _env("CORS_ORIGINS").split(",")
    if origin.strip()
]

# Email (optional)
ADMIN_NOTIFY_EMAIL = _env_optional("ADMIN_NOTIFY_EMAIL")
SMTP_HOST = _env_optional("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = _env_int("SMTP_PORT", 587)
SMTP_USER = _env_optional("SMTP_USER")
SMTP_PASSWORD = _env_optional("SMTP_PASSWORD").replace(" ", "")
SMTP_FROM = _env_optional("SMTP_FROM") or SMTP_USER or "noreply@talonvault.local"
SMTP_USE_TLS = _env_bool("SMTP_USE_TLS", True)
