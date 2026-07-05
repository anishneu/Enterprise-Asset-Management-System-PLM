import keycloak from "../keycloak";

const redirectUri = () => `${window.location.origin}/`;

/**
 * Initialize Keycloak without passing loginHint (avoids pre-filling username).
 * Unauthenticated users are sent to the Keycloak login form explicitly.
 */
export async function initKeycloakAuth() {
  const authenticated = await keycloak.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });

  if (!authenticated) {
    await keycloak.login({
      redirectUri: redirectUri(),
    });
    return false;
  }

  return true;
}

export function logoutFromApp() {
  return keycloak.logout({
    redirectUri: redirectUri(),
  });
}
