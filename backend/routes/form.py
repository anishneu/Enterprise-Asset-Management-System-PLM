from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Body

from services.form_service import FormService
from services.workflow_service import WorkflowService
from services.audit_service import AuditService
from constants.workflow import ENTITY_FORM
from constants.audit import ACTION_CREATED, ACTION_UPDATED, ACTION_DELETED
from routes.auth import get_current_user
from utils.display import actor_display

router = APIRouter(
    prefix="/api/forms",
    tags=["Forms"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def get_forms(ftype: Optional[str] = Query(default=None)):
    if ftype:
        return FormService.get_forms_by_ftype(ftype)
    return FormService.get_all_forms()


@router.get("/{form_id}")
def get_form(form_id: int):
    form = FormService.get_form(form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.post("/")
def add_forms(form: dict, current_user: dict = Depends(get_current_user)):
    print(f"Creating form requested by '{actor_display(current_user)}'")

    if not form.get("fowner"):
        form["fowner"] = actor_display(current_user)
    if not form.get("fmstatus"):
        form["fmstatus"] = "Draft"

    try:
        created = FormService.add_form(form)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    conn = None
    try:
        from database.db import get_connection

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        WorkflowService.log_history(
            cursor,
            entity_type=ENTITY_FORM,
            entity_id=created["id"],
            revision=created.get("fmrev"),
            action="Created",
            actor=current_user,
        )
        conn.commit()
    finally:
        if conn:
            conn.close()

    return created


@router.put("/{form_id}")
def update_form(form_id: int, form: dict, current_user: dict = Depends(get_current_user)):
    existing = FormService.get_form(form_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Form not found")

    try:
        updated = FormService.update_form(form_id, form)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    changes = AuditService.summarize_changes(
        existing,
        updated,
        ["fmname", "ftype", "fmrev", "fmstatus", "fmapprover", "fmeffective"],
    )
    AuditService.log(
        entity_type=ENTITY_FORM,
        entity_id=form_id,
        action=ACTION_UPDATED,
        actor=current_user,
        entity_label=existing.get("fmname"),
        revision=updated.get("fmrev"),
        summary="Form updated",
        changes=changes or None,
    )
    return updated


@router.post("/{form_id}/submit-review")
def submit_form_for_review(
    form_id: int,
    payload: dict = Body(default_factory=dict),
    current_user: dict = Depends(get_current_user),
):
    print(f"Submitting form {form_id} for review by '{actor_display(current_user)}'")

    body = payload
    approver = body.get("fmapprover") or body.get("approver")
    effective_date = body.get("fmeffective") or body.get("effectiveDate")

    if not (approver or "").strip():
        raise HTTPException(status_code=400, detail="Approver is required")

    try:
        updated = WorkflowService.submit_form_for_review(
            form_id,
            approver_username=approver.strip(),
            effective_date=effective_date,
            requester=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not updated:
        raise HTTPException(status_code=404, detail="Form not found")
    return updated


@router.post("/{form_id}/revise")
def revise_form(form_id: int, current_user: dict = Depends(get_current_user)):
    print(f"Revising form {form_id} requested by '{actor_display(current_user)}'")

    try:
        updated = WorkflowService.revise_form(form_id, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not updated:
        raise HTTPException(status_code=404, detail="Form not found")
    return updated


@router.delete("/{form_id}")
def delete_form(form_id: int, current_user: dict = Depends(get_current_user)):
    existing = FormService.get_form(form_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Form not found")

    try:
        result = FormService.delete_form(form_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    AuditService.log(
        entity_type=ENTITY_FORM,
        entity_id=form_id,
        action=ACTION_DELETED,
        actor=current_user,
        entity_label=existing.get("fmname"),
        revision=existing.get("fmrev"),
        summary="Form deleted",
    )
    return result
