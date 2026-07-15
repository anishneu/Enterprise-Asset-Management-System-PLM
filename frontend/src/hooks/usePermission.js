import { useMemo } from "react";

import keycloak from "../keycloak";
import {
  permissionsForRole,
  resolvePrimaryRole,
} from "../constants/rolePermissions";

export default function usePermission() {
  const realmRoles = keycloak.tokenParsed?.realm_access?.roles || [];
  const role = resolvePrimaryRole(realmRoles);

  return useMemo(() => {
    const permissions = new Set(permissionsForRole(role));

    const hasPermission = (permission) => permissions.has(permission);

    const canViewUsersAdmin =
      hasPermission("ADMIN_MENU") ||
      (hasPermission("USER_VIEW") &&
        (hasPermission("USER_EDIT") ||
          hasPermission("USER_CREATE") ||
          hasPermission("USER_DELETE")));

    const canViewGroupsAdmin =
      hasPermission("ADMIN_MENU") && hasPermission("GROUP_VIEW");

    return {
      role,
      permissions,
      hasPermission,
      isSuperAdmin: role === "SUPERADMIN",
      isAdmin: role === "ADMIN" || role === "SUPERADMIN",
      isHr: role === "HR",
      isDeveloper: role === "DEVELOPER",
      isUser: role === "USER",
      canViewAdminMenu: canViewUsersAdmin || canViewGroupsAdmin,
      canViewUsersAdmin,
      canViewGroupsAdmin,
      canViewParts: hasPermission("PART_VIEW"),
      canViewDocs: hasPermission("DOC_VIEW"),
      canViewForms: hasPermission("FORM_VIEW"),
      canViewTraining: hasPermission("RECORD_VIEW"),
      canViewApprovals: hasPermission("AR_VIEW"),
      canViewAssets: hasPermission("PART_VIEW") || hasPermission("DOC_VIEW"),
      canCreateUser: hasPermission("USER_CREATE"),
      canEditUser: hasPermission("USER_EDIT"),
      canDeleteUser: hasPermission("USER_DELETE"),
      canEditGroup: hasPermission("GROUP_EDIT"),
      canCreatePart: hasPermission("PART_CREATE"),
      canEditPart: hasPermission("PART_EDIT"),
      canDeletePart: hasPermission("PART_DELETE"),
      canCreateDoc: hasPermission("DOC_CREATE"),
      canEditDoc: hasPermission("DOC_EDIT"),
      canDeleteDoc: hasPermission("DOC_DELETE"),
      canCreateForm: hasPermission("FORM_CREATE"),
      canEditForm: hasPermission("FORM_EDIT"),
      canDeleteForm: hasPermission("FORM_DELETE"),
      canApprove: hasPermission("AR_APPROVE"),
      canReject: hasPermission("AR_REJECT"),
      canCreateRecord: hasPermission("RECORD_CREATE"),
      canEditRecord: hasPermission("RECORD_EDIT"),
      canDeleteRecord: hasPermission("RECORD_DELETE"),
    };
  }, [role]);
}
