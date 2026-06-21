from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from keycloak import KeycloakOpenID
from jose import jwt

security = HTTPBearer()

keycloak_openid = KeycloakOpenID(
    server_url="http://localhost:8080/",
    client_id="ams-react",
    realm_name="amsrealm"
)

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

        return decoded

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
    
    