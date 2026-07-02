from fastapi import APIRouter, Depends, HTTPException
from mysql.connector import Error as MySQLError

from routes.auth import get_current_user
from schemas.training import TrainingCreate, TrainingUpdate
from services.training_service import TrainingService
from services.audit_service import AuditService
from constants.audit import ENTITY_TRAINING, ACTION_CREATED, ACTION_UPDATED, ACTION_DELETED

router = APIRouter(
    prefix="/api/training",
    tags=["Training"],
    dependencies=[Depends(get_current_user)],
)


def _actor_name(current_user: dict) -> str:
    return current_user.get("preferred_username") or current_user.get("sub", "unknown")


def _handle_db_error(err: Exception):
    message = str(err)
    if "Unknown column" in message:
        raise HTTPException(
            status_code=503,
            detail=(
                "Training table schema is out of date. "
                "Run db/migrations/012_traintab_form_fields.sql against authdb."
            ),
        ) from err
    raise HTTPException(status_code=500, detail="Database error while accessing training records.") from err


@router.get("/")
def get_training_records(current_user: dict = Depends(get_current_user)):
    try:
        return TrainingService.get_all_training()
    except MySQLError as err:
        _handle_db_error(err)


@router.get("/{training_id}")
def get_training_record(training_id: int, current_user: dict = Depends(get_current_user)):
    record = TrainingService.get_training(training_id)
    if not record:
        raise HTTPException(status_code=404, detail="Training record not found")
    return record


@router.post("/")
def add_training_record(
    training: TrainingCreate,
    current_user: dict = Depends(get_current_user),
):
    actor = _actor_name(current_user)
    print(f"Creating training record requested by '{actor}'")
    created = TrainingService.add_training(training.model_dump())
    AuditService.log(
        entity_type=ENTITY_TRAINING,
        entity_id=created["id"],
        action=ACTION_CREATED,
        actor=current_user,
        entity_label=created.get("title"),
        revision=created.get("rev"),
        summary="Training record created",
    )
    return created


@router.put("/{training_id}")
def update_training_record(
    training_id: int,
    training: TrainingUpdate,
    current_user: dict = Depends(get_current_user),
):
    actor = _actor_name(current_user)
    print(f"Updating training record {training_id} requested by '{actor}'")

    existing = TrainingService.get_training(training_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Training record not found")

    payload = training.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    merged = {
        "fid": payload.get("fid", existing.get("fid")),
        "rev": payload.get("rev", existing["rev"]),
        "title": payload.get("title", existing["title"]),
        "trainee": payload.get("trainee", existing.get("trainee")),
        "assigndate": payload.get("assigndate", existing.get("assigndate")),
        "duedate": payload.get("duedate", existing.get("duedate")),
        "completionstatus": payload.get(
            "completionstatus", existing.get("completionstatus", "Pending")
        ),
        "fielddata": payload.get("fielddata", existing.get("fielddata")),
    }

    updated = TrainingService.update_training(training_id, merged)
    changes = AuditService.summarize_changes(
        existing,
        merged,
        ["title", "trainee", "rev", "completionstatus", "assigndate", "duedate"],
    )
    AuditService.log(
        entity_type=ENTITY_TRAINING,
        entity_id=training_id,
        action=ACTION_UPDATED,
        actor=current_user,
        entity_label=existing.get("title"),
        revision=merged.get("rev"),
        summary="Training record updated",
        changes=changes or None,
    )
    return updated


@router.delete("/{training_id}")
def delete_training_record(
    training_id: int,
    current_user: dict = Depends(get_current_user),
):
    actor = _actor_name(current_user)
    print(f"Deleting training record {training_id} requested by '{actor}'")

    existing = TrainingService.get_training(training_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Training record not found")

    TrainingService.delete_training(training_id)
    AuditService.log(
        entity_type=ENTITY_TRAINING,
        entity_id=training_id,
        action=ACTION_DELETED,
        actor=current_user,
        entity_label=existing.get("title"),
        revision=existing.get("rev"),
        summary="Training record deleted",
    )
    return {"message": "Training record deleted", "id": training_id}
