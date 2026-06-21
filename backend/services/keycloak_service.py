from keycloak import KeycloakAdmin

keycloak_admin = KeycloakAdmin(
    server_url="http://localhost:8080/",
    username="admin",
    password="admin123",
    realm_name="amsrealm",
    user_realm_name="master",
    verify=True
)


def list_users():
    users = keycloak_admin.get_users()
    return [
        {
            "id": user.get("id"),
            "username": user.get("username"),
            "email": user.get("email"),
            "enabled": user.get("enabled", False),
        }
        for user in users
    ]


def create_user(username: str, email: str, password: str):
    user_id = keycloak_admin.create_user(
        {
            "username": username,
            "email": email,
            "enabled": True,
            "emailVerified": True,
            "credentials": [
                {
                    "type": "password",
                    "value": password,
                    "temporary": False,
                }
            ],
        },
        exist_ok=False,
    )
    return user_id


def update_user(user_id: str, email: str | None = None, enabled: bool | None = None, password: str | None = None):
    payload = {}

    if email is not None:
        payload["email"] = email
    if enabled is not None:
        payload["enabled"] = enabled

    if payload:
        keycloak_admin.update_user(user_id, payload)

    if password:
        keycloak_admin.set_user_password(user_id, password, temporary=False)


def delete_user(user_id: str):
    keycloak_admin.delete_user(user_id)