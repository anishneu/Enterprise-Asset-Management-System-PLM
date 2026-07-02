ROLE_PERMISSIONS = {
    "SUPERADMIN": [
        "USER_CREATE",
        "USER_EDIT",
        "USER_DELETE",
        "GROUP_CREATE",
        "GROUP_EDIT",
        "GROUP_DELETE",
        "DOC_CREATE",
        "DOC_EDIT",
        "DOC_DELETE",
    ],
    "ADMIN": [
        "USER_CREATE",
        "USER_EDIT",
        "USER_VIEW",
        "GROUP_VIEW",
        "DOC_VIEW",
    ],
    "HR": [
        "USER_VIEW",
        "USER_EDIT",
        "GROUP_VIEW",
    ],
    "USER_VIEW": [
        "DOC_VIEW",
    ],
    "USER_DEVELOPER": [
        "DOC_CREATE",
        "DOC_EDIT",
        "DOC_DELETE",
        "DOC_VIEW",
    ],
}

GROUP_ROLE_ALIASES = {
    "user-group": "USER",
    "users": "USER",
    "admin": "ADMIN",
    "superadmin": "SUPERADMIN",
    "hr": "HR",
}


def normalize_role_name(name: str) -> str:
    return str(name or "").strip().upper().replace("-", "_").replace(" ", "_")


def permissions_for_roles(role_names: list[str]) -> list[str]:
    permissions: list[str] = []
    for role in role_names:
        normalized = normalize_role_name(role)
        permissions.extend(ROLE_PERMISSIONS.get(normalized, []))
    return sorted(set(permissions))


def resolve_group_roles(group_name: str, realm_role_names: list[str]) -> list[str]:
    if realm_role_names:
        return sorted({normalize_role_name(role) for role in realm_role_names})

    alias = GROUP_ROLE_ALIASES.get(str(group_name or "").strip().lower())
    if alias:
        return [alias]

    normalized = normalize_role_name(group_name)
    if normalized in ROLE_PERMISSIONS:
        return [normalized]

    return []


ASSIGNABLE_ROLES = sorted(ROLE_PERMISSIONS.keys())
