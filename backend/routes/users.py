from fastapi import APIRouter
from services.user_service import UserService

router = APIRouter(
    prefix="/api/users",
    tags=["Users"]
)

@router.get("/")
def get_users():
    return UserService.get_all_users()