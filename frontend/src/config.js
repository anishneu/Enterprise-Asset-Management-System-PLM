// Central frontend config — values come from REACT_APP_* env vars (see root .env.example).
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export const KEYCLOAK_URL =
  process.env.REACT_APP_KEYCLOAK_URL || "http://localhost:8080";

export const KEYCLOAK_REALM =
  process.env.REACT_APP_KEYCLOAK_REALM || "amsrealm";

export const KEYCLOAK_CLIENT_ID =
  process.env.REACT_APP_KEYCLOAK_CLIENT_ID || "ams-react";
