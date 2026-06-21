function SidebarItem({
  label,
  icon: Icon,
  active,
  collapsed,
  onClick,
  className = "",
}) {
  return (
    <li
      className={`sidebar-item ${active ? "active-menu" : ""} ${className}`.trim()}
      onClick={onClick}
      data-tooltip={collapsed ? label : undefined}
    >
      <span className="sidebar-item-content">
        <span className="sidebar-icon" aria-hidden="true">
          {Icon ? <Icon /> : null}
        </span>
        {!collapsed && <span className="sidebar-label">{label}</span>}
      </span>
    </li>
  );
}

export default SidebarItem;
