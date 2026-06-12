from fastapi import APIRouter
from services.part_service import PartService

router = APIRouter(prefix="/api/parts", tags=["Parts"])

@router.get("/")
def get_parts():
    return PartService.get_all_parts()

# ADD
@router.post("/")
def add_part(part: dict):
    return PartService.add_part(part)

# UPDATE
@router.put("/{part_id}")
def update_part(part_id: int, part: dict):
    return PartService.update_part(part_id, part)

# DELETE
@router.delete("/{part_id}")
def delete_part(part_id: int):
    return PartService.delete_part(part_id)

