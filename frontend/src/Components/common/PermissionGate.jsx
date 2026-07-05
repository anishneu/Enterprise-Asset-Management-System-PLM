import usePermission from "../hooks/usePermission";

export default function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission } = usePermission();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return children;
}
