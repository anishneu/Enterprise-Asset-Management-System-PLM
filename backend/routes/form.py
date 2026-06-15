from fastapi import APIRouter
from services.form_service import FormService

router = APIRouter(
    prefix="/api/forms",
    tags=["Forms"]
)

@router.get("/")
def get_forms():
    return FormService.get_all_forms()

# ADD
@router.post("/")
def add_forms(form: dict):
    return FormService.add_form(form)

# UPDATE
@router.put("/{form_id}")
def update_form(form_id: int, form: dict):
    return FormService.update_form(form_id, form)

# DELETE
@router.delete("/{form_id}")
def delete_form(form_id: int):
    return FormService.delete_form(form_id)
