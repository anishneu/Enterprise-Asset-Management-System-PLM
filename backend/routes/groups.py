from fastapi import APIRouter, Depends, HTTPException
from keycloak.exceptions import KeycloakPostError

from routes.auth import get_current_user
from security.permissions import Permissions, require_permission
from schemas.group import GroupUpdate
from services.keycloak_service import get_group, list_assignable_roles, list_groups, update_group
from services.audit_service import AuditService
from constants.audit import ENTITY_GROUP, ACTION_UPDATED

router = APIRouter(
    prefix="/api/groups",
    tags=["Groups"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def get_groups(current_user: dict = Depends(require_permission(Permissions.GROUP_VIEW))):
    try:
        return list_groups()
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail="Failed to load groups from Keycloak.",
        ) from err


@router.get("/meta/roles")
def get_assignable_roles(current_user: dict = Depends(require_permission(Permissions.GROUP_EDIT))):
    return list_assignable_roles()


@router.get("/{group_id}")
def get_group_record(group_id: str, current_user: dict = Depends(require_permission(Permissions.GROUP_VIEW))):
    try:
        group = get_group(group_id)
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail="Failed to load group from Keycloak.",
        ) from err

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.put("/{group_id}")
def edit_group(
    group_id: str,
    group: GroupUpdate,
    current_user: dict = Depends(require_permission(Permissions.GROUP_EDIT)),
):
    existing = get_group(group_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")

    payload = group.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        updated = update_group(
            group_id,
            name=payload.get("name"),
            member_ids=payload.get("memberIds"),
            roles=payload.get("roles"),
        )
        AuditService.log(
            entity_type=ENTITY_GROUP,
            entity_id=group_id,
            action=ACTION_UPDATED,
            actor=current_user,
            entity_label=existing.get("name"),
            summary="Group updated",
            changes=AuditService.summarize_changes(existing, updated, ["name", "roles"]),
        )
        return updated
    except KeycloakPostError as exc:
        detail = "Failed to update group"
        if exc.response_body:
            detail = str(exc.response_body)
        raise HTTPException(status_code=400, detail=detail) from exc
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail="Failed to update group in Keycloak.",
        ) from err
