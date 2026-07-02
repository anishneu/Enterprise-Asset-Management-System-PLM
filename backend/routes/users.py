import logging

from fastapi import APIRouter, Depends, HTTPException
from keycloak.exceptions import KeycloakPostError

from schemas.user import UserCreate, UserUpdate
from services.email_service import smtp_configured, last_send_error
from services.keycloak_service import (
    create_user,
    delete_user,
    list_users,
    send_welcome_user_email,
    update_user,
)
from services.audit_service import AuditService
from services.user_notification_service import (
    build_update_details,
    classify_user_update,
    notify_admin_user_action,
    send_welcome_email_to_user,
)
from constants.audit import ENTITY_USER, ACTION_CREATED, ACTION_UPDATED, ACTION_DELETED
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/users",
    tags=["Users"],
    dependencies=[Depends(get_current_user)],
)


def _actor_name(current_user: dict) -> str:
    return current_user.get("preferred_username") or current_user.get("sub", "unknown")


def _find_user(user_id: str):
    for user in list_users():
        if user.get("id") == user_id:
            return user
    return None


def _notify_admin(action: str, actor: dict, target_user: dict | None, details: dict | None = None) -> bool:
    try:
        return notify_admin_user_action(
            action=action,
            actor=actor,
            target_user=target_user,
            details=details,
        )
    except Exception:
        logger.exception("Failed to queue admin notification for action '%s'.", action)
        return False


def _email_status(*, admin_notified: bool, welcome_sent: bool | None = None) -> dict:
    status = {
        "admin_notified": admin_notified,
        "smtp_configured": smtp_configured(),
    }
    if welcome_sent is not None:
        status["welcome_sent"] = welcome_sent
    error = last_send_error()
    if error and (admin_notified is False or welcome_sent is False):
        status["error"] = error
    return status


def _send_welcome(
    *,
    user_id: str,
    email: str,
    username: str,
    temporary_password: str | None,
    actor: dict,
) -> bool:
    if send_welcome_email_to_user(
        target_email=email,
        username=username,
        temporary_password=temporary_password,
        actor=actor,
    ):
        return True

    try:
        send_welcome_user_email(user_id)
        return True
    except Exception:
        logger.exception("Failed to send welcome email for user %s.", user_id)
        return False


@router.get("/")
def get_users(current_user: dict = Depends(get_current_user)):
    return list_users()


@router.post("/")
def add_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    actor = _actor_name(current_user)
    print(f"Creating Keycloak user '{user.username}' requested by '{actor}'")

    try:
        created_result = create_user(
            username=user.username,
            email=user.email,
            password=user.password,
            first_name=user.firstName,
            last_name=user.lastName,
            name=user.name,
        )
        user_id = created_result["id"]
        created = _find_user(user_id)
        AuditService.log(
            entity_type=ENTITY_USER,
            entity_id=user_id,
            action=ACTION_CREATED,
            actor=current_user,
            entity_label=created.get("username") if created else user.username,
            summary="User account created",
        )
        welcome_sent = _send_welcome(
            user_id=user_id,
            email=user.email,
            username=user.username,
            temporary_password=created_result.get("temporary_password"),
            actor=current_user,
        )
        admin_notified = _notify_admin(
            "user_created",
            current_user,
            created,
            {
                "username": user.username,
                "email": user.email,
                "first_name": user.firstName,
                "last_name": user.lastName,
                "temporary_password": (
                    "Generated (user must change on first login)"
                    if created_result.get("temporary_password")
                    else "Set by administrator"
                ),
                "welcome_email": "Sent to user" if welcome_sent else "Not sent",
            },
        )
        return {
            **created,
            "created_by": actor,
            "email_status": _email_status(
                admin_notified=admin_notified,
                welcome_sent=welcome_sent,
            ),
        }
    except KeycloakPostError as exc:
        detail = "Failed to create user"
        if exc.response_body:
            detail = str(exc.response_body)
        raise HTTPException(status_code=400, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/{user_id}")
def edit_user(user_id: str, user: UserUpdate, current_user: dict = Depends(get_current_user)):
    actor = _actor_name(current_user)
    print(f"Updating Keycloak user '{user_id}' requested by '{actor}'")

    if not _find_user(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    existing = _find_user(user_id)
    payload = user.model_dump(exclude_unset=True)
    action = classify_user_update(payload)

    try:
        update_user(
            user_id=user_id,
            email=user.email,
            enabled=user.enabled,
            password=user.password,
            first_name=user.firstName,
            last_name=user.lastName,
            name=user.name,
        )
        updated = _find_user(user_id)
        AuditService.log(
            entity_type=ENTITY_USER,
            entity_id=user_id,
            action=ACTION_UPDATED,
            actor=current_user,
            entity_label=(existing or {}).get("username"),
            summary="User account updated",
        )
        admin_notified = _notify_admin(
            action,
            current_user,
            updated,
            build_update_details(existing, updated, payload),
        )
        return {
            **updated,
            "updated_by": actor,
            "email_status": _email_status(admin_notified=admin_notified),
        }
    except KeycloakPostError as exc:
        detail = "Failed to update user"
        if exc.response_body:
            detail = str(exc.response_body)
        raise HTTPException(status_code=400, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/{user_id}")
def remove_user(user_id: str, current_user: dict = Depends(get_current_user)):
    actor = _actor_name(current_user)
    print(f"Deleting Keycloak user '{user_id}' requested by '{actor}'")

    existing = _find_user(user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        delete_user(user_id)
        AuditService.log(
            entity_type=ENTITY_USER,
            entity_id=user_id,
            action=ACTION_DELETED,
            actor=current_user,
            entity_label=existing.get("username"),
            summary="User account deleted",
        )
        return {
            "message": "User deleted successfully",
            "id": user_id,
            "deleted_by": actor,
        }
    except KeycloakPostError as exc:
        detail = "Failed to delete user"
        if exc.response_body:
            detail = str(exc.response_body)
        raise HTTPException(status_code=400, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
