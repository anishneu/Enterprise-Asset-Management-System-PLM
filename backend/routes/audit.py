from fastapi import APIRouter, Depends, Query

from constants.audit import ENTITY_LABELS
from routes.auth import get_current_user
from schemas.audit import AuditListResponse
from services.audit_service import AuditService

router = APIRouter(
    prefix="/api/audit",
    tags=["Audit"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/entity-types")
def get_entity_types(current_user: dict = Depends(get_current_user)):
    return [
        {"id": key, "label": label}
        for key, label in ENTITY_LABELS.items()
    ]


@router.get("/history", response_model=AuditListResponse)
def list_audit_history(
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    items = AuditService.list_history(
        entity_type=entity_type,
        entity_id=entity_id,
        limit=limit,
        offset=offset,
    )
    total = AuditService.count_history(
        entity_type=entity_type,
        entity_id=entity_id,
    )
    return AuditListResponse(items=items, count=len(items), total=total)
