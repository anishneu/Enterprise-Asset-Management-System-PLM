from fastapi import APIRouter, Depends, HTTPException
from keycloak.exceptions import KeycloakPostError

from schemas.user import UserCreate, UserUpdate
from services.keycloak_service import create_user, delete_user, list_users, update_user
from routes.auth import get_current_user

router = APIRouter(
    prefix="/api/users",
    tags=["Users"],
    dependencies=[Depends(get_current_user)],
)


def _actor_name(current_user: dict) -> str:
    return current_user.get("preferred_username") or current_user.get("sub", "unknown")


def _find_user(user_id: str):
    for user in list_users():
        if user.get("id") == user_id:
            return user
    return None


@router.get("/")
def get_users(current_user: dict = Depends(get_current_user)):
    return list_users()


@router.post("/")
def add_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    actor = _actor_name(current_user)
    print(f"Creating Keycloak user '{user.username}' requested by '{actor}'")

    try:
        user_id = create_user(
            username=user.username,
            email=user.email,
            password=user.password,
            first_name=user.firstName,
            last_name=user.lastName,
            name=user.name,
        )
        created = _find_user(user_id)
        return {
            **created,
            "created_by": actor,
        }
    except KeycloakPostError as exc:
        detail = "Failed to create user"
        if exc.response_body:
            detail = str(exc.response_body)
        raise HTTPException(status_code=400, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/{user_id}")
def edit_user(user_id: str, user: UserUpdate, current_user: dict = Depends(get_current_user)):
    actor = _actor_name(current_user)
    print(f"Updating Keycloak user '{user_id}' requested by '{actor}'")

    if not _find_user(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    try:
        update_user(
            user_id=user_id,
            email=user.email,
            enabled=user.enabled,
            password=user.password,
            first_name=user.firstName,
            last_name=user.lastName,
            name=user.name,
        )
        updated = _find_user(user_id)
        return {
            **updated,
            "updated_by": actor,
        }
    except KeycloakPostError as exc:
        detail = "Failed to update user"
        if exc.response_body:
            detail = str(exc.response_body)
        raise HTTPException(status_code=400, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/{user_id}")
def remove_user(user_id: str, current_user: dict = Depends(get_current_user)):
    actor = _actor_name(current_user)
    print(f"Deleting Keycloak user '{user_id}' requested by '{actor}'")

    existing = _find_user(user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        delete_user(user_id)
        return {
            "message": "User deleted successfully",
            "id": user_id,
            "deleted_by": actor,
        }
    except KeycloakPostError as exc:
        detail = "Failed to delete user"
        if exc.response_body:
            detail = str(exc.response_body)
        raise HTTPException(status_code=400, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
