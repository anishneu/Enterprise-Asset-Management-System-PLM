from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from keycloak import KeycloakOpenID
from jose import jwt

from constants.role_permissions import permissions_for_user_role, resolve_primary_role

security = HTTPBearer()

keycloak_openid = KeycloakOpenID(
    server_url="http://localhost:8080/",
    client_id="ams-react",
    realm_name="amsrealm"
)


def attach_user_permissions(decoded: dict) -> dict:
    realm_roles = (decoded.get("realm_access") or {}).get("roles") or []
    primary_role = resolve_primary_role(realm_roles)
    decoded["_role"] = primary_role
    decoded["_permissions"] = permissions_for_user_role(primary_role)
    return decoded

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        key = (
            "-----BEGIN PUBLIC KEY-----\n"
            + keycloak_openid.public_key()
            + "\n-----END PUBLIC KEY-----"
        )

        decoded = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_exp": True, "verify_aud": False}
        )

        if decoded.get("azp") != "ams-react":
            raise HTTPException(status_code=401, detail="Invalid client")

        username = decoded.get("preferred_username") or decoded.get("sub")
        print(f"Authenticated request from: {username}")

        return attach_user_permissions(decoded)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
    
    