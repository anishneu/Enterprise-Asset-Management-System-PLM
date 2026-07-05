from fastapi import APIRouter, Depends, HTTPException, Body

from schemas.document import DocumentCreate, DocumentUpdate
from services.doc_service import DocService
from services.workflow_service import WorkflowService
from services.audit_service import AuditService
from constants.workflow import ENTITY_DOC
from constants.audit import ACTION_CREATED, ACTION_UPDATED, ACTION_DELETED
from routes.auth import get_current_user
from security.permissions import Permissions, require_permission
from utils.display import actor_display

router = APIRouter(
    prefix="/api/docs",
    tags=["Docs"],
    dependencies=[Depends(get_current_user)],
)


def _actor_name(current_user: dict) -> str:
    return current_user.get("preferred_username") or current_user.get("sub", "unknown")


@router.get("/")
def get_docs(
    dtype: str | None = None,
    current_user: dict = Depends(require_permission(Permissions.DOC_VIEW)),
):
    return DocService.get_all_docs(dtype=dtype)


@router.get("/{doc_id}")
def get_doc(doc_id: int, current_user: dict = Depends(require_permission(Permissions.DOC_VIEW))):
    doc = DocService.get_doc(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("/")
def add_doc(doc: DocumentCreate, current_user: dict = Depends(require_permission(Permissions.DOC_CREATE))):
    actor = _actor_name(current_user)
    print(f"Creating document requested by '{actor}'")

    try:
        payload = doc.model_dump()
        if not payload.get("downer"):
            payload["downer"] = actor_display(current_user)
        if not payload.get("dstatus"):
            payload["dstatus"] = "Draft"

        created = DocService.add_doc(payload)
        conn = None
        try:
            from database.db import get_connection

            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            WorkflowService.log_history(
                cursor,
                entity_type=ENTITY_DOC,
                entity_id=created["id"],
                revision=created.get("drev"),
                action="Created",
                actor=current_user,
            )
            conn.commit()
        finally:
            if conn:
                conn.close()

        return {
            **created,
            "created_by": actor,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{doc_id}")
def update_doc(doc_id: int, doc: DocumentUpdate, current_user: dict = Depends(require_permission(Permissions.DOC_EDIT))):
    actor = _actor_name(current_user)
    print(f"Updating document {doc_id} requested by '{actor}'")

    payload = doc.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    existing = DocService.get_doc(doc_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")

    merged = {
        "dname": payload.get("dname", existing["dname"]),
        "ddesc": payload.get("ddesc", existing.get("ddesc")),
        "dtype": payload.get("dtype", existing["dtype"]),
        "ftype": payload.get("ftype", existing.get("ftype")),
        "fid": payload.get("fid", existing.get("fid")),
        "fmat": payload.get("fmat", existing["fmat"]),
        "drev": payload.get("drev", existing.get("drev") or "1"),
        "dstatus": payload.get("dstatus", existing.get("dstatus") or "Draft"),
        "dlink": payload.get("dlink", existing.get("dlink")),
        "downer": payload.get("downer", existing.get("downer")),
        "dapprover": payload.get("dapprover", existing.get("dapprover")),
        "deffective": payload.get("deffective", existing.get("deffective")),
        "fielddata": payload.get("fielddata", existing.get("fielddata")),
    }

    try:
        updated = DocService.update_doc(doc_id, merged)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    changes = AuditService.summarize_changes(
        existing,
        merged,
        ["dname", "ddesc", "dtype", "drev", "dstatus", "dapprover", "deffective"],
    )
    AuditService.log(
        entity_type=ENTITY_DOC,
        entity_id=doc_id,
        action=ACTION_UPDATED,
        actor=current_user,
        entity_label=existing.get("dname"),
        revision=merged.get("drev"),
        summary="Document updated",
        changes=changes or None,
    )
    return {
        **updated,
        "updated_by": actor,
    }


@router.delete("/{doc_id}")
def delete_doc(doc_id: int, current_user: dict = Depends(require_permission(Permissions.DOC_DELETE))):
    actor = _actor_name(current_user)
    print(f"Deleting document {doc_id} requested by '{actor}'")

    existing = DocService.get_doc(doc_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        result = DocService.delete_doc(doc_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    AuditService.log(
        entity_type=ENTITY_DOC,
        entity_id=doc_id,
        action=ACTION_DELETED,
        actor=current_user,
        entity_label=existing.get("dname"),
        revision=existing.get("drev"),
        summary="Document deleted",
    )
    return {
        **result,
        "deleted_by": actor,
    }


@router.post("/{doc_id}/submit-review")
def submit_doc_for_review(
    doc_id: int,
    payload: dict = Body(default_factory=dict),
    current_user: dict = Depends(require_permission(Permissions.DOC_EDIT)),
):
    actor = _actor_name(current_user)
    print(f"Submitting document {doc_id} for review by '{actor}'")

    body = payload
    approver = body.get("dapprover") or body.get("approver")
    effective_date = body.get("deffective") or body.get("effectiveDate")

    if not (approver or "").strip():
        raise HTTPException(status_code=400, detail="Approver is required")

    try:
        updated = WorkflowService.submit_doc_for_review(
            doc_id,
            approver_username=approver.strip(),
            effective_date=effective_date,
            requester=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    return updated


@router.post("/{doc_id}/revise")
def revise_doc(doc_id: int, current_user: dict = Depends(require_permission(Permissions.DOC_EDIT))):
    actor = _actor_name(current_user)
    print(f"Revising document {doc_id} requested by '{actor}'")

    try:
        updated = WorkflowService.revise_doc(doc_id, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    return updated
