from fastapi import APIRouter, Depends

from constants.audit import ENTITY_PART, ACTION_CREATED, ACTION_UPDATED, ACTION_DELETED
from routes.auth import get_current_user
from security.permissions import Permissions, require_permission
from services.audit_service import AuditService
from services.part_service import PartService

router = APIRouter(
    prefix="/api/parts",
    tags=["Parts"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def get_parts(current_user: dict = Depends(require_permission(Permissions.PART_VIEW))):
    return PartService.get_all_parts()


@router.post("/")
def add_part(part: dict, current_user: dict = Depends(require_permission(Permissions.PART_CREATE))):
    created = PartService.add_part(part)
    AuditService.log(
        entity_type=ENTITY_PART,
        entity_id=created.get("id"),
        action=ACTION_CREATED,
        actor=current_user,
        entity_label=created.get("partno"),
        summary="Part created",
    )
    return created


@router.put("/{part_id}")
def update_part(part_id: int, part: dict, current_user: dict = Depends(require_permission(Permissions.PART_EDIT))):
    existing = PartService.get_part(part_id)
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Part not found")

    updated = PartService.update_part(part_id, part)
    changes = AuditService.summarize_changes(existing, updated, list(part.keys()))
    AuditService.log(
        entity_type=ENTITY_PART,
        entity_id=part_id,
        action=ACTION_UPDATED,
        actor=current_user,
        entity_label=existing.get("partno"),
        summary="Part updated",
        changes=changes or None,
    )
    return updated


@router.delete("/{part_id}")
def delete_part(part_id: int, current_user: dict = Depends(require_permission(Permissions.PART_DELETE))):
    existing = PartService.get_part(part_id)
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Part not found")

    result = PartService.delete_part(part_id)
    AuditService.log(
        entity_type=ENTITY_PART,
        entity_id=part_id,
        action=ACTION_DELETED,
        actor=current_user,
        entity_label=existing.get("partno"),
        summary="Part deleted",
    )
    return result
