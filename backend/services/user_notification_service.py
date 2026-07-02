import logging
from typing import Any

from config import ADMIN_NOTIFY_EMAIL, APP_BASE_URL, APP_NAME
from services.email_service import send_email
from utils.display import actor_display

logger = logging.getLogger(__name__)

ACTION_SUBJECTS = {
    "user_created": "User added",
    "user_updated": "User edited",
    "password_reset": "Password reset",
    "email_reset": "Email reset",
    "status_changed": "Status changed",
    "user_welcomed": "Welcome user",
}


def _user_label(user: dict | None) -> str:
    if not user:
        return "Unknown user"
    username = user.get("username") or user.get("id") or "unknown"
    email = user.get("email")
    if email:
        return f"{username} ({email})"
    return username


def _format_details(details: dict[str, Any] | None) -> str:
    if not details:
        return ""
    lines = []
    for key, value in details.items():
        if value is None or value == "":
            continue
        label = key.replace("_", " ").strip().title()
        lines.append(f"- {label}: {value}")
    if not lines:
        return ""
    return "\n\nDetails:\n" + "\n".join(lines)


def notify_admin_user_action(
    *,
    action: str,
    actor: dict | None,
    target_user: dict | None,
    details: dict[str, Any] | None = None,
) -> bool:
    subject_label = ACTION_SUBJECTS.get(action, "User action")
    target_label = _user_label(target_user)
    actor_label = actor_display(actor)

    subject = f"[{APP_NAME}] {subject_label}: {target_label}"
    body = (
        f"A user administration action was performed in {APP_NAME}.\n\n"
        f"Action: {subject_label}\n"
        f"Performed by: {actor_label}\n"
        f"User: {target_label}\n"
        f"Application: {APP_BASE_URL}"
        f"{_format_details(details)}\n"
    )

    sent = send_email(to=ADMIN_NOTIFY_EMAIL, subject=subject, body=body)
    if not sent:
        logger.warning(
            "Admin notification for action '%s' was not delivered to %s.",
            action,
            ADMIN_NOTIFY_EMAIL,
        )
    return sent


def classify_user_update(payload: dict[str, Any]) -> str:
    if not payload:
        return "user_updated"
    keys = set(payload.keys())
    if keys == {"password"}:
        return "password_reset"
    if keys == {"email"}:
        return "email_reset"
    if keys == {"enabled"}:
        return "status_changed"
    return "user_updated"


def build_update_details(existing: dict | None, updated: dict | None, payload: dict[str, Any]) -> dict[str, Any]:
    details: dict[str, Any] = {}
    existing = existing or {}
    updated = updated or {}

    for field in ("firstName", "lastName", "email", "enabled"):
        if field not in payload:
            continue
        old_value = existing.get(field)
        new_value = updated.get(field if field != "enabled" else "enabled")
        if field == "enabled":
            old_value = existing.get("status") or ("Active" if existing.get("enabled") else "Inactive")
            new_value = updated.get("status") or ("Active" if updated.get("enabled") else "Inactive")
        if old_value != new_value:
            details[f"{field}_from"] = old_value
            details[f"{field}_to"] = new_value

    if "password" in payload:
        details["password"] = "Updated"

    return details


def send_welcome_email_to_user(
    *,
    target_email: str,
    username: str,
    temporary_password: str | None = None,
    actor: dict | None = None,
) -> bool:
    if not target_email:
        logger.warning("Welcome email skipped: missing recipient.")
        return False

    lines = [
        f"Welcome to {APP_NAME}!",
        "",
        "Your account has been created.",
        f"Username: {username}",
    ]
    if temporary_password:
        lines.extend(
            [
                "",
                f"Temporary password: {temporary_password}",
                "You will be asked to change this password on first login.",
            ]
        )
    else:
        lines.extend(["", "Your password was set by an administrator."])

    lines.extend(
        [
            "",
            f"Sign in at: {APP_BASE_URL}",
            "",
            f"Account created by: {actor_display(actor)}",
        ]
    )

    sent = send_email(
        to=target_email,
        subject=f"Welcome to {APP_NAME}",
        body="\n".join(lines),
    )
    if not sent:
        logger.warning("Welcome email was not delivered to %s.", target_email)
    return sent
