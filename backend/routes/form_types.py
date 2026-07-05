from fastapi import APIRouter, Depends

from routes.auth import get_current_user
from schemas.form_type import FormTypeCreate
from services.form_type_service import FormTypeService

router = APIRouter(
    prefix="/api/form-types",
    tags=["Form Types"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def list_form_types():
    return FormTypeService.get_all_form_types()


@router.post("/")
def add_form_type(payload: FormTypeCreate, current_user: dict = Depends(get_current_user)):
    actor = current_user.get("preferred_username") or current_user.get("sub", "unknown")
    print(f"Ensuring form type '{payload.name}' requested by '{actor}'")
    return FormTypeService.ensure_form_type(payload.name)
