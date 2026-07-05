# TalonVault Keycloak login theme

Stops the login form from showing remembered username/password.

## Install

1. Copy the `themes` folder into your Keycloak installation:
   - Standalone: `{KEYCLOAK_HOME}/themes/talonvault`
   - Docker: mount `keycloak/themes/talonvault` to `/opt/keycloak/themes/talonvault`

2. Restart Keycloak.

3. In Keycloak Admin → **amsrealm** → **Realm settings** → **Themes**:
   - **Login theme**: `talonvault`
   - Save

4. In **Realm settings** → **Login**:
   - Turn **off** **Remember me** (recommended)
   - Save

## Browser note

Chrome/Edge may still autofill saved passwords for `localhost:8080`. If fields are still filled:

- Remove saved credentials for `localhost` in the browser password manager, or
- Use a private/incognito window for testing

## App logout

Use **Logout** in TalonVault before closing the browser so the Keycloak SSO session ends.
The app calls `keycloak.logout()` with a redirect URI so the next visit shows a fresh login form.
