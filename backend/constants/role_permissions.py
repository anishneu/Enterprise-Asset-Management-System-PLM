"""Application roles and fine-grained permissions.

Keycloak realm roles in amsrealm are mapped to five app permission tiers below.
"""

ROLE_SUPERADMIN = "SUPERADMIN"
ROLE_ADMIN = "ADMIN"
ROLE_HR = "HR"
ROLE_DEVELOPER = "DEVELOPER"
ROLE_USER = "USER"

ROLE_PRIORITY = (ROLE_SUPERADMIN, ROLE_ADMIN, ROLE_HR, ROLE_DEVELOPER, ROLE_USER)

# Keycloak realm role name → app permission tier
KEYCLOAK_ROLE_ALIASES = {
    "SUPERADMIN": ROLE_SUPERADMIN,
    "ADMIN": ROLE_ADMIN,
    "HR": ROLE_HR,
    "USER_DEVELOPER": ROLE_DEVELOPER,
    "USER_VIEW": ROLE_USER,
}

ROLE_PERMISSIONS = {
    ROLE_SUPERADMIN: [
        "USER_VIEW",
        "USER_CREATE",
        "USER_EDIT",
        "USER_DELETE",
        "GROUP_VIEW",
        "GROUP_CREATE",
        "GROUP_EDIT",
        "GROUP_DELETE",
        "DOC_VIEW",
        "DOC_CREATE",
        "DOC_EDIT",
        "DOC_DELETE",
        "FORM_VIEW",
        "FORM_CREATE",
        "FORM_EDIT",
        "FORM_DELETE",
        "PART_VIEW",
        "PART_CREATE",
        "PART_EDIT",
        "PART_DELETE",
        "AR_VIEW",
        "AR_CREATE",
        "AR_EDIT",
        "AR_DELETE",
        "AR_APPROVE",
        "AR_REJECT",
        "RECORD_VIEW",
        "RECORD_CREATE",
        "RECORD_EDIT",
        "RECORD_DELETE",
        "RECORD_APPROVE",
        "RECORD_REJECT",
        "ADMIN_MENU",
        "SYSTEM_CONFIGURATION",
        "COMPANY_SETTINGS",
        "ROLE_MANAGEMENT",
        "SUPERADMIN",
    ],
    ROLE_ADMIN: [
        "USER_VIEW",
        "USER_CREATE",
        "USER_EDIT",
        "USER_DELETE",
        "GROUP_VIEW",
        "GROUP_CREATE",
        "GROUP_EDIT",
        "GROUP_DELETE",
        "DOC_VIEW",
        "DOC_CREATE",
        "DOC_EDIT",
        "DOC_DELETE",
        "FORM_VIEW",
        "FORM_CREATE",
        "FORM_EDIT",
        "FORM_DELETE",
        "PART_VIEW",
        "PART_CREATE",
        "PART_EDIT",
        "PART_DELETE",
        "AR_VIEW",
        "AR_CREATE",
        "AR_EDIT",
        "AR_DELETE",
        "AR_APPROVE",
        "AR_REJECT",
        "RECORD_VIEW",
        "RECORD_CREATE",
        "RECORD_EDIT",
        "RECORD_DELETE",
        "RECORD_APPROVE",
        "RECORD_REJECT",
        "ADMIN_MENU",
        "SYSTEM_CONFIGURATION",
        "COMPANY_SETTINGS",
        "ROLE_MANAGEMENT",
    ],
    ROLE_HR: [
        "USER_VIEW",
        "USER_CREATE",
        "USER_EDIT",
        "USER_DELETE",
        "GROUP_VIEW",
        "GROUP_CREATE",
        "GROUP_EDIT",
        "GROUP_DELETE",
        "DOC_VIEW",
        "DOC_CREATE",
        "DOC_EDIT",
        "DOC_DELETE",
        "FORM_VIEW",
        "FORM_CREATE",
        "FORM_EDIT",
        "FORM_DELETE",
        "PART_VIEW",
        "PART_CREATE",
        "PART_EDIT",
        "PART_DELETE",
        "AR_VIEW",
        "AR_CREATE",
        "AR_EDIT",
        "AR_DELETE",
        "AR_APPROVE",
        "AR_REJECT",
        "RECORD_VIEW",
        "RECORD_CREATE",
        "RECORD_EDIT",
        "RECORD_DELETE",
        "RECORD_APPROVE",
        "RECORD_REJECT",
        "ADMIN_MENU",
        "SYSTEM_CONFIGURATION",
        "COMPANY_SETTINGS",
        "ROLE_MANAGEMENT",
    ],
    ROLE_DEVELOPER: [
        "USER_VIEW",
        "GROUP_VIEW",
        "DOC_VIEW",
        "DOC_CREATE",
        "DOC_EDIT",
        "DOC_DELETE",
        "FORM_VIEW",
        "FORM_CREATE",
        "FORM_EDIT",
        "FORM_DELETE",
        "PART_VIEW",
        "PART_CREATE",
        "PART_EDIT",
        "PART_DELETE",
        "AR_VIEW",
        "AR_CREATE",
        "AR_EDIT",
        "AR_DELETE",
        "AR_APPROVE",
        "AR_REJECT",
        "RECORD_VIEW",
        "RECORD_CREATE",
        "RECORD_EDIT",
        "RECORD_DELETE",
        "RECORD_APPROVE",
        "RECORD_REJECT",
    ],
    ROLE_USER: [
        "USER_VIEW",
        "GROUP_VIEW",
        "DOC_VIEW",
        "FORM_VIEW",
        "PART_VIEW",
        "AR_VIEW",
        "RECORD_VIEW",
    ],
}

GROUP_ROLE_ALIASES = {
    "user-group": ROLE_USER,
    "users": ROLE_USER,
    "admin": ROLE_ADMIN,
    "superadmin": ROLE_SUPERADMIN,
    "developer": ROLE_DEVELOPER,
    "hr": ROLE_ADMIN,
}

ASSIGNABLE_ROLES = list(ROLE_PRIORITY)


def normalize_role_name(name: str) -> str:
    raw = str(name or "").strip().upper().replace("-", "_").replace(" ", "_")
    return KEYCLOAK_ROLE_ALIASES.get(raw, raw)


def resolve_primary_role(realm_roles: list[str]) -> str:
    resolved = {normalize_role_name(role) for role in realm_roles if role}
    for role in ROLE_PRIORITY:
        if role in resolved:
            return role
    return ROLE_USER


def permissions_for_roles(role_names: list[str]) -> list[str]:
    permissions: list[str] = []
    for role in role_names:
        normalized = normalize_role_name(role)
        permissions.extend(ROLE_PERMISSIONS.get(normalized, []))
    return sorted(set(permissions))


def permissions_for_user_role(primary_role: str) -> list[str]:
    return permissions_for_roles([primary_role])


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
