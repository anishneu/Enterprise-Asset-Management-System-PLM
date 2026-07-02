"""Send a test email using backend SMTP settings. Run from backend/: python scripts/test_email.py"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from config import ADMIN_NOTIFY_EMAIL
from services.email_service import (
    last_send_error,
    resolve_smtp_settings,
    send_email,
    smtp_config_source,
    smtp_configured,
)


def main() -> int:
    env_path = ROOT / ".env"
    print(f".env exists: {env_path.exists()}")
    print(f"smtp_configured: {smtp_configured()}")
    print(f"source: {smtp_config_source()}")
    settings = resolve_smtp_settings()
    if settings:
        print(f"SMTP host: {settings.get('host')}:{settings.get('port')}")
        print(f"SMTP user: {settings.get('user')}")
        print(f"From: {settings.get('from')}")
    else:
        print("No SMTP settings resolved.")
        print("Copy .env.example to .env and set SMTP_PASSWORD.")
        return 1

    print(f"Sending test email to {ADMIN_NOTIFY_EMAIL} ...")
    ok = send_email(
        to=ADMIN_NOTIFY_EMAIL,
        subject="TalonVault email test",
        body="If you received this, user admin email notifications are working.",
    )
    if ok:
        print("SUCCESS: test email sent.")
        return 0

    print(f"FAILED: {last_send_error() or 'unknown error'}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
