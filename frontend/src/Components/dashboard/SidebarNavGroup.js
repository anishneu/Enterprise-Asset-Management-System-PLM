function SidebarNavGroup({
  label,
  icon: Icon,
  open,
  onToggle,
  collapsed,
  active = false,
}) {
  return (
    <li
      className={`menu-parent sidebar-item${collapsed ? " menu-parent-collapsed" : ""}${
        active ? " active-menu" : ""
      }`}
      onClick={onToggle}
      data-tooltip={collapsed ? label : undefined}
      aria-expanded={collapsed ? undefined : open}
      aria-label={collapsed ? label : undefined}
    >      <span className="sidebar-item-content">
        <span className="sidebar-icon" aria-hidden="true">
          {Icon ? <Icon /> : null}
        </span>
        {!collapsed && (
          <span className="sidebar-label">
            {label} {open ? "▾" : "▸"}
          </span>
        )}
      </span>
    </li>
  );
}

export default SidebarNavGroup;
