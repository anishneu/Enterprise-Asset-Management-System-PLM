from fastapi import APIRouter, Depends, HTTPException, Query, Body

from routes.auth import get_current_user
from services.workflow_service import WorkflowService

router = APIRouter(
    prefix="/api/approvals",
    tags=["Approvals"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def list_approval_requests(
    view: str = Query(default="pending"),
    current_user: dict = Depends(get_current_user),
):
    allowed = {"pending", "my", "approved", "rejected"}
    if view not in allowed:
        raise HTTPException(status_code=400, detail="Invalid approvals view")
    return WorkflowService.list_requests(view, current_user)


@router.get("/{request_id}")
def get_approval_request(
    request_id: int,
    current_user: dict = Depends(get_current_user),
):
    request = WorkflowService.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return request


@router.post("/{request_id}/approve")
def approve_request(
    request_id: int,
    payload: dict = Body(default_factory=dict),
    current_user: dict = Depends(get_current_user),
):
    comments = payload.get("comments") or payload.get("comment") or None

    try:
        result = WorkflowService.approve_request(request_id, current_user, comments)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not result:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return result


@router.post("/{request_id}/reject")
def reject_request(
    request_id: int,
    payload: dict = Body(default_factory=dict),
    current_user: dict = Depends(get_current_user),
):
    comments = payload.get("comments") or payload.get("comment") or ""

    try:
        result = WorkflowService.reject_request(request_id, current_user, comments)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not result:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return result
