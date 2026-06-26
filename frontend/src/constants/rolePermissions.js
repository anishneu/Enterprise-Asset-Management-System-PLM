export const ROLE_PERMISSIONS = {
  SUPERADMIN: [
    "USER_CREATE",
    "USER_EDIT",
    "USER_DELETE",
    "GROUP_CREATE",
    "GROUP_EDIT",
    "GROUP_DELETE",
    "DOC_CREATE",
    "DOC_EDIT",
    "DOC_DELETE",
  ],
  ADMIN: [
    "USER_CREATE",
    "USER_EDIT",
    "USER_VIEW",
    "GROUP_VIEW",
    "DOC_VIEW",
  ],
  HR: [
    "USER_VIEW",
    "USER_EDIT",
    "GROUP_VIEW",
  ],
  USER: [
    "DOC_VIEW",
  ],
};

export const DEFAULT_USER_GROUP = "user-group";
