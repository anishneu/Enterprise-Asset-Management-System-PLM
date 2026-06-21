from fastapi import APIRouter, Depends

from services.form_service import FormService
from routes.auth import get_current_user

router = APIRouter(
    prefix="/api/forms",
    tags=["Forms"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def get_forms():
    return FormService.get_all_forms()


@router.post("/")
def add_forms(form: dict, current_user: dict = Depends(get_current_user)):
    actor = current_user.get("preferred_username") or current_user.get("sub", "unknown")
    print(f"Creating form requested by '{actor}'")
    return FormService.add_form(form)


@router.put("/{form_id}")
def update_form(form_id: int, form: dict):
    return FormService.update_form(form_id, form)


@router.delete("/{form_id}")
def delete_form(form_id: int):
    return FormService.delete_form(form_id)
