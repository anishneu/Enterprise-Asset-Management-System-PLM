import secrets

from keycloak import KeycloakAdmin

from config import KEYCLOAK_CLIENT_ID, KEYCLOAK_REALM
from constants.role_permissions import (
    ASSIGNABLE_ROLES,
    normalize_role_name,
    permissions_for_roles,
    resolve_group_roles,
)

keycloak_admin = KeycloakAdmin(
    server_url="http://localhost:8080/",
    username="admin",
    password="admin123",
    realm_name="amsrealm",
    user_realm_name="master",
    verify=True,
)

DEFAULT_USER_GROUP = "user-group"


def _full_name(user: dict) -> str:
    first = (user.get("firstName") or "").strip()
    last = (user.get("lastName") or "").strip()
    combined = f"{first} {last}".strip()
    return combined or user.get("username") or ""


def _member_label(member: dict) -> str:
    return _full_name(member) or member.get("username") or member.get("email") or "—"


def _format_groups(groups: list[dict]) -> str:
    names = [group.get("name") for group in groups if group.get("name")]
    return ", ".join(names) if names else DEFAULT_USER_GROUP


def _find_group_id(group_name: str) -> str | None:
    for group in keycloak_admin.get_groups():
        if group.get("name") == group_name:
            return group.get("id")
    return None


def ensure_default_user_group() -> str:
    existing_id = _find_group_id(DEFAULT_USER_GROUP)
    if existing_id:
        return existing_id

    return keycloak_admin.create_group({"name": DEFAULT_USER_GROUP})


def list_users():
    users = keycloak_admin.get_users()
    result = []

    for user in users:
        user_id = user.get("id")
        groups = keycloak_admin.get_user_groups(user_id) if user_id else []
        enabled = user.get("enabled", True)

        result.append(
            {
                "id": user_id,
                "username": user.get("username"),
                "firstName": user.get("firstName") or "",
                "lastName": user.get("lastName") or "",
                "name": _full_name(user),
                "email": user.get("email"),
                "groups": _format_groups(groups),
                "enabled": enabled,
                "status": "Active" if enabled else "Inactive",
            }
        )

    return result


def create_user(
    username: str,
    email: str,
    password: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    name: str | None = None,
):
    if name and not first_name:
        parts = name.strip().split(None, 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

    generated_password = password or secrets.token_urlsafe(12)
    temporary = password is None

    user_id = keycloak_admin.create_user(
        {
            "username": username,
            "email": email,
            "firstName": first_name or "",
            "lastName": last_name or "",
            "enabled": True,
            "emailVerified": True,
            "credentials": [
                {
                    "type": "password",
                    "value": generated_password,
                    "temporary": temporary,
                }
            ],
        },
        exist_ok=False,
    )

    default_group_id = ensure_default_user_group()
    keycloak_admin.group_user_add(user_id, default_group_id)

    return {
        "id": user_id,
        "temporary_password": generated_password if temporary else None,
    }


def send_welcome_user_email(user_id: str) -> None:
    keycloak_admin.send_update_account(
        user_id,
        payload=["UPDATE_PASSWORD"],
        client_id=KEYCLOAK_CLIENT_ID,
    )


def get_realm_smtp_settings() -> dict | None:
    realm = keycloak_admin.get_realm(KEYCLOAK_REALM) or {}
    smtp = realm.get("smtpServer") or {}
    host = (smtp.get("host") or "").strip()
    if not host:
        return None

    def _as_bool(value) -> bool:
        if isinstance(value, bool):
            return value
        return str(value).lower() == "true"

    user = (smtp.get("user") or "").strip()
    password = smtp.get("password") or ""
    from_address = (smtp.get("from") or user or "").strip()

    return {
        "host": host,
        "port": int(smtp.get("port") or 587),
        "user": user,
        "password": password,
        "from": from_address,
        "use_tls": _as_bool(smtp.get("starttls")),
        "use_ssl": _as_bool(smtp.get("ssl")),
    }


def update_user(
    user_id: str,
    email: str | None = None,
    enabled: bool | None = None,
    password: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    name: str | None = None,
):
    payload = {}

    if email is not None:
        payload["email"] = email
    if enabled is not None:
        payload["enabled"] = enabled

    if first_name is not None or last_name is not None:
        payload["firstName"] = first_name or ""
        payload["lastName"] = last_name or ""
    elif name is not None:
        parts = name.strip().split(None, 1)
        payload["firstName"] = parts[0]
        payload["lastName"] = parts[1] if len(parts) > 1 else ""

    if payload:
        keycloak_admin.update_user(user_id, payload)

    if password:
        keycloak_admin.set_user_password(user_id, password, temporary=False)


def delete_user(user_id: str):
    keycloak_admin.delete_user(user_id)


def _realm_roles_by_name():
    roles = {}
    for role in keycloak_admin.get_realm_roles():
        name = role.get("name")
        if not name:
            continue
        roles[normalize_role_name(name)] = role
    return roles


def _build_group_record(group: dict, detailed: bool = False) -> dict:
    group_id = group.get("id")
    group_name = group.get("name") or "—"

    members = keycloak_admin.get_group_members(group_id) if group_id else []
    members_list = [
        {
            "id": member.get("id"),
            "label": _member_label(member),
            "username": member.get("username"),
        }
        for member in members
        if member.get("id")
    ]
    member_names = [member["label"] for member in members_list]

    realm_roles = keycloak_admin.get_group_realm_roles(group_id) if group_id else []
    assigned_role_names = [
        normalize_role_name(role.get("name"))
        for role in realm_roles
        if role.get("name")
    ]
    role_names = sorted(set(assigned_role_names)) if assigned_role_names else resolve_group_roles(
        group_name, []
    )
    permissions = permissions_for_roles(role_names)

    record = {
        "id": group_id,
        "name": group_name,
        "members": ", ".join(member_names) if member_names else "—",
        "roles": ", ".join(role_names) if role_names else "—",
        "permissions": ", ".join(permissions) if permissions else "—",
    }

    if detailed:
        record.update(
            {
                "memberIds": [member["id"] for member in members_list],
                "membersList": members_list,
                "rolesList": role_names,
                "permissionsList": permissions,
            }
        )

    return record


def list_groups():
    groups = keycloak_admin.get_groups()
    return [_build_group_record(group) for group in groups]


def get_group(group_id: str):
    group = keycloak_admin.get_group(group_id)
    if not group:
        return None
    return _build_group_record(group, detailed=True)


def list_assignable_roles():
    return ASSIGNABLE_ROLES


def _sync_group_members(group_id: str, member_ids: list[str]):
    current_members = keycloak_admin.get_group_members(group_id)
    current_ids = {member.get("id") for member in current_members if member.get("id")}
    desired_ids = set(member_ids)

    for user_id in desired_ids - current_ids:
        keycloak_admin.group_user_add(user_id, group_id)

    for user_id in current_ids - desired_ids:
        keycloak_admin.group_user_remove(user_id, group_id)


def _sync_group_roles(group_id: str, role_names: list[str]):
    current_roles = keycloak_admin.get_group_realm_roles(group_id)
    desired_names = {normalize_role_name(name) for name in role_names}
    current_by_name = {
        normalize_role_name(role.get("name")): role
        for role in current_roles
        if role.get("name")
    }

    roles_to_remove = [
        role
        for name, role in current_by_name.items()
        if name not in desired_names
    ]
    if roles_to_remove:
        keycloak_admin.delete_group_realm_roles(group_id, roles_to_remove)

    roles_lookup = _realm_roles_by_name()
    roles_to_add = [
        roles_lookup[name]
        for name in desired_names
        if name not in current_by_name and name in roles_lookup
    ]
    if roles_to_add:
        keycloak_admin.assign_group_realm_roles(group_id, roles_to_add)


def update_group(
    group_id: str,
    name: str | None = None,
    member_ids: list[str] | None = None,
    roles: list[str] | None = None,
):
    if name is not None:
        keycloak_admin.update_group(group_id, {"name": name})

    if member_ids is not None:
        _sync_group_members(group_id, member_ids)

    if roles is not None:
        _sync_group_roles(group_id, roles)

    return get_group(group_id)
