from fastapi import APIRouter, Depends

from routes.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user.get("preferred_username") or current_user.get("sub"),
        "email": current_user.get("email"),
        "role": current_user.get("_role"),
        "permissions": current_user.get("_permissions") or [],
    }
