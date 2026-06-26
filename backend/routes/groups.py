from fastapi import APIRouter, Depends, HTTPException
from keycloak.exceptions import KeycloakPostError

from routes.auth import get_current_user
from schemas.group import GroupUpdate
from services.keycloak_service import get_group, list_assignable_roles, list_groups, update_group

router = APIRouter(
    prefix="/api/groups",
    tags=["Groups"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def get_groups(current_user: dict = Depends(get_current_user)):
    try:
        return list_groups()
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail="Failed to load groups from Keycloak.",
        ) from err


@router.get("/meta/roles")
def get_assignable_roles(current_user: dict = Depends(get_current_user)):
    return list_assignable_roles()


@router.get("/{group_id}")
def get_group_record(group_id: str, current_user: dict = Depends(get_current_user)):
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
    current_user: dict = Depends(get_current_user),
):
    existing = get_group(group_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")

    payload = group.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        return update_group(
            group_id,
            name=payload.get("name"),
            member_ids=payload.get("memberIds"),
            roles=payload.get("roles"),
        )
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
