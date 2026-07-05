import { ROLE_PERMISSIONS, normalizeRoleName } from "../../constants/rolePermissions";

export const ASSIGNABLE_ROLES = Object.keys(ROLE_PERMISSIONS);

export function permissionsForRoles(roleNames) {
  const permissions = new Set();

  roleNames.forEach((role) => {
    const normalized = normalizeRoleName(role);
    (ROLE_PERMISSIONS[normalized] || []).forEach((permission) => permissions.add(permission));
  });

  return [...permissions].sort();
}

export function groupPermissionsByArea(permissions) {
  const groups = {
    Users: [],
    Groups: [],
    Documents: [],
  };

  permissions.forEach((permission) => {
    if (permission.startsWith("USER_")) {
      groups.Users.push(permission);
    } else if (permission.startsWith("GROUP_")) {
      groups.Groups.push(permission);
    } else if (permission.startsWith("DOC_")) {
      groups.Documents.push(permission);
    }
  });

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export function parseCsvList(value) {
  if (!value || value === "—") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
