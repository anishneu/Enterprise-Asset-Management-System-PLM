from fastapi import APIRouter, Depends, HTTPException, Query

from routes.auth import get_current_user
from schemas.training_plm import (
    CourseSetupUpdate,
    CurriculumAssignRequest,
    CurriculumCoursesUpdate,
    CurriculumCreate,
    CurriculumRuleUpdate,
    CurriculumSubmitReview,
    CurriculumUpdate,
    TrainingCourseCreate,
    TrainingCourseUpdate,
    TrainingRecordUpdate,
)
from services.audit_service import AuditService
from services.keycloak_service import list_users
from services.training_plm_service import TrainingPlmService
from services.workflow_service import WorkflowService, resolve_user_by_username
from constants.audit import ENTITY_TRAINING, ACTION_CREATED, ACTION_UPDATED

router = APIRouter(
    prefix="/api/training-plm",
    tags=["Training PLM"],
    dependencies=[Depends(get_current_user)],
)


def _actor(current_user: dict) -> str:
    return current_user.get("preferred_username") or current_user.get("sub", "unknown")


def _user_display_map() -> dict[str, str]:
    mapping = {}
    for user in list_users():
        uid = user.get("id")
        if uid:
            mapping[uid] = user.get("username") or user.get("name") or uid
    return mapping


# ── Courses ──────────────────────────────────────────────────────────

@router.get("/courses")
def list_courses(
    status: str | None = Query(default=None),
    released_only: bool = Query(default=False),
    current_user: dict = Depends(get_current_user),
):
    return TrainingPlmService.list_courses(status=status, released_only=released_only)


@router.get("/courses/{course_id}")
def get_course(course_id: int, current_user: dict = Depends(get_current_user)):
    course = TrainingPlmService.get_course(course_id, detailed=True)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("/courses")
def create_course(
    payload: TrainingCourseCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        created = TrainingPlmService.create_course(
            payload.model_dump(),
            _actor(current_user),
        )
        AuditService.log(
            entity_type=ENTITY_TRAINING,
            entity_id=created["id"],
            action=ACTION_CREATED,
            actor=current_user,
            entity_label=created.get("course_name"),
            revision=created.get("revision"),
            summary="Training course created",
        )
        return created
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/courses/from-document/{doc_id}")
def create_course_from_document(
    doc_id: int,
    current_user: dict = Depends(get_current_user),
):
    try:
        created = TrainingPlmService.create_course_from_document(doc_id, _actor(current_user))
        return created
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/courses/{course_id}")
def update_course(
    course_id: int,
    payload: TrainingCourseUpdate,
    current_user: dict = Depends(get_current_user),
):
    try:
        updated = TrainingPlmService.update_course(
            course_id,
            payload.model_dump(exclude_unset=True),
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Course not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/courses/{course_id}/setup")
def update_course_setup(
    course_id: int,
    payload: CourseSetupUpdate,
    current_user: dict = Depends(get_current_user),
):
    try:
        updated = TrainingPlmService.set_course_setup(
            course_id,
            payload.model_dump(),
            _user_display_map(),
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Course not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/courses/{course_id}/release")
def release_course(course_id: int, current_user: dict = Depends(get_current_user)):
    try:
        updated = TrainingPlmService.release_course(course_id, _user_display_map())
        if not updated:
            raise HTTPException(status_code=404, detail="Course not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/courses/{course_id}/revise")
def revise_course(course_id: int, current_user: dict = Depends(get_current_user)):
    try:
        return TrainingPlmService.revise_course(course_id, _actor(current_user))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── Curriculum ───────────────────────────────────────────────────────

@router.get("/curricula")
def list_curricula(
    released_only: bool = Query(default=False),
    current_user: dict = Depends(get_current_user),
):
    return TrainingPlmService.list_curricula(released_only=released_only)


@router.get("/curricula/{curriculum_id}")
def get_curriculum(curriculum_id: int, current_user: dict = Depends(get_current_user)):
    curriculum = TrainingPlmService.get_curriculum(curriculum_id)
    if not curriculum:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return curriculum


@router.post("/curricula")
def create_curriculum(
    payload: CurriculumCreate,
    current_user: dict = Depends(get_current_user),
):
    return TrainingPlmService.create_curriculum(
        payload.model_dump(),
        _actor(current_user),
        _user_display_map(),
    )


@router.put("/curricula/{curriculum_id}")
def update_curriculum(
    curriculum_id: int,
    payload: CurriculumUpdate,
    current_user: dict = Depends(get_current_user),
):
    try:
        updated = TrainingPlmService.update_curriculum(
            curriculum_id,
            payload.model_dump(exclude_unset=True),
            _user_display_map(),
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/curricula/{curriculum_id}")
def delete_curriculum(curriculum_id: int, current_user: dict = Depends(get_current_user)):
    try:
        result = TrainingPlmService.delete_curriculum(curriculum_id)
        if not result:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/curricula/{curriculum_id}/courses")
def update_curriculum_courses(
    curriculum_id: int,
    payload: CurriculumCoursesUpdate,
    current_user: dict = Depends(get_current_user),
):
    try:
        updated = TrainingPlmService.set_curriculum_courses(
            curriculum_id,
            [item.model_dump() for item in payload.courses],
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/curricula/{curriculum_id}/rules")
def update_curriculum_rules(
    curriculum_id: int,
    payload: CurriculumRuleUpdate,
    current_user: dict = Depends(get_current_user),
):
    try:
        updated = TrainingPlmService.set_curriculum_rules(
            curriculum_id,
            payload.model_dump(),
            _user_display_map(),
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/curricula/{curriculum_id}/submit-review")
def submit_curriculum_for_review(
    curriculum_id: int,
    payload: CurriculumSubmitReview,
    current_user: dict = Depends(get_current_user),
):
    body = payload.model_dump(exclude_unset=True)
    approver_username = (body.get("approver") or body.get("approver_user_id") or "").strip()
    if not approver_username:
        raise HTTPException(status_code=400, detail="Approver is required")

    approver_user = resolve_user_by_username(approver_username)
    if not approver_user and body.get("approver_user_id"):
        approver_user = {"id": body["approver_user_id"], "username": approver_username}

    if not approver_user or not approver_user.get("username"):
        raise HTTPException(status_code=400, detail="Approver not found")

    try:
        updated = WorkflowService.submit_curriculum_for_review(
            curriculum_id,
            approver_username=approver_user["username"],
            effective_date=body.get("effective_date"),
            requester=current_user,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/curricula/{curriculum_id}/release")
def release_curriculum(curriculum_id: int, current_user: dict = Depends(get_current_user)):
    try:
        updated = TrainingPlmService.release_curriculum(
            curriculum_id,
            _user_display_map(),
            _actor(current_user),
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/curricula/{curriculum_id}/approve")
def approve_curriculum(curriculum_id: int, current_user: dict = Depends(get_current_user)):
    try:
        updated = TrainingPlmService.approve_curriculum(curriculum_id)
        if not updated:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/curricula/{curriculum_id}/archive")
def archive_curriculum(curriculum_id: int, current_user: dict = Depends(get_current_user)):
    try:
        updated = TrainingPlmService.archive_curriculum(curriculum_id)
        if not updated:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/curricula/{curriculum_id}/revise")
def revise_curriculum(curriculum_id: int, current_user: dict = Depends(get_current_user)):
    try:
        return TrainingPlmService.revise_curriculum(curriculum_id, _actor(current_user))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── Assignments & records ───────────────────────────────────────────

@router.post("/assignments")
def assign_curriculum(
    payload: CurriculumAssignRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        display_map = _user_display_map()
        for uid in payload.user_ids:
            display_map.setdefault(uid, uid)
        if not payload.user_ids and not payload.group_ids:
            raise HTTPException(
                status_code=400,
                detail="Select at least one user or group.",
            )
        return TrainingPlmService.assign_curriculum(
            curriculum_id=payload.curriculum_id,
            user_ids=payload.user_ids,
            group_ids=payload.group_ids,
            user_display_map=display_map,
            assigned_by=_actor(current_user),
            due_date=payload.due_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/assignments")
def list_assignments(
    user_id: str | None = Query(default=None),
    curriculum_id: int | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    return TrainingPlmService.list_assignments(user_id=user_id, curriculum_id=curriculum_id)


@router.get("/records")
def list_training_records(
    user_id: str | None = Query(default=None),
    curriculum_id: int | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    return TrainingPlmService.list_records(user_id=user_id, curriculum_id=curriculum_id)


@router.get("/records/{record_id}")
def get_training_record(record_id: int, current_user: dict = Depends(get_current_user)):
    record = TrainingPlmService.get_record(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Training record not found")
    return record


@router.put("/records/{record_id}")
def update_training_record(
    record_id: int,
    payload: TrainingRecordUpdate,
    current_user: dict = Depends(get_current_user),
):
    existing = TrainingPlmService.get_record(record_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Training record not found")

    try:
        updated = TrainingPlmService.update_record(
            record_id,
            payload.model_dump(exclude_unset=True),
            actor_sub=current_user.get("sub"),
        )
    except ValueError as exc:
        message = str(exc)
        status_code = 403 if "Only the assigned trainee" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Training record not found")
    AuditService.log(
        entity_type=ENTITY_TRAINING,
        entity_id=record_id,
        action=ACTION_UPDATED,
        actor=current_user,
        entity_label=existing.get("course_name"),
        summary="PLM training record updated",
        changes=AuditService.summarize_changes(
            existing,
            updated,
            ["status", "trainer", "completion_date"],
        ),
    )
    return updated


@router.get("/qualification-matrix")
def get_qualification_matrix(
    user_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    return TrainingPlmService.qualification_matrix(user_id=user_id)
