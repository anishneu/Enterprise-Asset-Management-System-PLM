from fastapi import APIRouter
from schemas.user import RegisterRequest, LoginRequest
from services.auth_service import AuthService

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

@router.post("/register")
def register(user: RegisterRequest):

    return AuthService.register(
        user.name,
        user.email,
        user.password
    )

@router.post("/login")
def login(user: LoginRequest):

    return AuthService.login(
        user.email,
        user.password
    )