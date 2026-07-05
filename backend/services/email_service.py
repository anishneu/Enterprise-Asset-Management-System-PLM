import logging
import smtplib
from email.message import EmailMessage
from typing import Any

from config import (
    SMTP_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_TLS,
    SMTP_USER,
)

logger = logging.getLogger(__name__)

_last_send_error: str | None = None


def last_send_error() -> str | None:
    return _last_send_error


def _set_send_error(message: str) -> None:
    global _last_send_error
    _last_send_error = message


def _clear_send_error() -> None:
    global _last_send_error
    _last_send_error = None


def _is_masked_password(password: str) -> bool:
    """Keycloak realm API returns asterisks instead of the real SMTP password."""
    if not password:
        return True
    return set(password.strip()) == {"*"}


def _env_smtp_settings() -> dict[str, Any] | None:
    """Full SMTP config from environment (host, user, and password all required)."""
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        return None
    return {
        "host": SMTP_HOST,
        "port": SMTP_PORT,
        "user": SMTP_USER,
        "password": SMTP_PASSWORD,
        "from": SMTP_FROM or SMTP_USER,
        "use_tls": SMTP_USE_TLS,
        "use_ssl": False,
    }


def _keycloak_smtp_settings() -> dict[str, Any] | None:
    try:
        from services.keycloak_service import get_realm_smtp_settings

        return get_realm_smtp_settings()
    except Exception:
        logger.exception("Failed to read Keycloak realm SMTP settings.")
        return None


def resolve_smtp_settings() -> dict[str, Any] | None:
    env = _env_smtp_settings()
    if env:
        return env

    if not SMTP_PASSWORD:
        return None

    kc = _keycloak_smtp_settings()
    if not kc:
        return None

    password = kc.get("password") or ""
    if _is_masked_password(password):
        kc = {**kc, "password": SMTP_PASSWORD}
    elif not password:
        kc = {**kc, "password": SMTP_PASSWORD}

    if SMTP_USER:
        kc["user"] = SMTP_USER
    if SMTP_FROM:
        kc["from"] = SMTP_FROM

    if not (kc.get("host") and kc.get("user") and kc.get("password")):
        return None

    return kc


def smtp_config_source() -> str | None:
    if _env_smtp_settings():
        return "environment"
    if resolve_smtp_settings():
        return "keycloak+env"
    return None


def smtp_configured() -> bool:
    return resolve_smtp_settings() is not None


def send_email(*, to: str, subject: str, body: str) -> bool:
    _clear_send_error()

    if not to:
        _set_send_error("Missing recipient email address.")
        logger.warning("Email skipped: missing recipient.")
        return False

    settings = resolve_smtp_settings()
    if not settings:
        _set_send_error(
            "SMTP is not configured. Create backend/.env with SMTP_PASSWORD "
            "(Gmail app password for your Keycloak SMTP account)."
        )
        logger.warning(
            "SMTP is not configured (set SMTP_PASSWORD in backend/.env or full SMTP_* vars)."
        )
        return False

    message = EmailMessage()
    message["From"] = settings["from"]
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    host = settings["host"]
    port = int(settings["port"])
    user = settings.get("user")
    password = settings.get("password")

    try:
        if settings.get("use_ssl"):
            with smtplib.SMTP_SSL(host, port, timeout=20) as server:
                if user and password:
                    server.login(user, password)
                server.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=20) as server:
                if settings.get("use_tls"):
                    server.starttls()
                if user and password:
                    server.login(user, password)
                server.send_message(message)
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except smtplib.SMTPAuthenticationError:
        _set_send_error(
            "Gmail rejected the SMTP login. Set SMTP_PASSWORD in backend/.env to a valid "
            "app password for the same Gmail account used in Keycloak realm email settings "
            "(SMTP_USER is optional; Keycloak account is used when omitted)."
        )
        logger.exception("SMTP authentication failed for user %s via %s:%s", user, host, port)
        return False
    except Exception:
        _set_send_error(f"Failed to send email via {host}:{port}. Check backend logs for details.")
        logger.exception("Failed to send email to %s via %s:%s", to, host, port)
        return False
