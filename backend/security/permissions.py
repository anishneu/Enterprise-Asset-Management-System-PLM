from fastapi import Depends, HTTPException, status

from routes.auth import get_current_user


class Permissions:
    USER_VIEW = "USER_VIEW"
    USER_CREATE = "USER_CREATE"
    USER_EDIT = "USER_EDIT"
    USER_DELETE = "USER_DELETE"

    GROUP_VIEW = "GROUP_VIEW"
    GROUP_CREATE = "GROUP_CREATE"
    GROUP_EDIT = "GROUP_EDIT"
    GROUP_DELETE = "GROUP_DELETE"

    DOC_VIEW = "DOC_VIEW"
    DOC_CREATE = "DOC_CREATE"
    DOC_EDIT = "DOC_EDIT"
    DOC_DELETE = "DOC_DELETE"

    FORM_VIEW = "FORM_VIEW"
    FORM_CREATE = "FORM_CREATE"
    FORM_EDIT = "FORM_EDIT"
    FORM_DELETE = "FORM_DELETE"

    PART_VIEW = "PART_VIEW"
    PART_CREATE = "PART_CREATE"
    PART_EDIT = "PART_EDIT"
    PART_DELETE = "PART_DELETE"

    AR_VIEW = "AR_VIEW"
    AR_CREATE = "AR_CREATE"
    AR_EDIT = "AR_EDIT"
    AR_DELETE = "AR_DELETE"
    AR_APPROVE = "AR_APPROVE"
    AR_REJECT = "AR_REJECT"

    RECORD_VIEW = "RECORD_VIEW"
    RECORD_CREATE = "RECORD_CREATE"
    RECORD_EDIT = "RECORD_EDIT"
    RECORD_DELETE = "RECORD_DELETE"
    RECORD_APPROVE = "RECORD_APPROVE"
    RECORD_REJECT = "RECORD_REJECT"

    ADMIN_MENU = "ADMIN_MENU"
    SYSTEM_CONFIGURATION = "SYSTEM_CONFIGURATION"
    COMPANY_SETTINGS = "COMPANY_SETTINGS"
    ROLE_MANAGEMENT = "ROLE_MANAGEMENT"
    SUPERADMIN = "SUPERADMIN"


class PermissionChecker:
    @staticmethod
    def has_permission(user: dict, permission: str) -> bool:
        return permission in set(user.get("_permissions") or [])


def require_permission(permission: str):
    def checker(current_user: dict = Depends(get_current_user)):
        if not PermissionChecker.has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied",
            )
        return current_user

    return checker
