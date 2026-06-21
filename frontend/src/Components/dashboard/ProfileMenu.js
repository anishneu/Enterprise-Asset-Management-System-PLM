import { useEffect, useRef, useState } from "react";

function ProfileMenu({ username, email, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = username || "User";
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="profile-avatar">{initial}</span>
        <span className="profile-name">{displayName}</span>
        <span className="profile-chevron">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-header">
            <span className="profile-avatar profile-avatar-lg">{initial}</span>
            <div>
              <strong>{displayName}</strong>
              {email && <span className="profile-email">{email}</span>}
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          <button
            type="button"
            className="profile-dropdown-item profile-dropdown-item-danger"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
