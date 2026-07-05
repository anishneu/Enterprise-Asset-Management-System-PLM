import { useEffect, useRef, useState } from "react";

import ProfileAvatar from "../common/ProfileAvatar";

function ProfileMenu({ username, email, avatarUrl, onSettings, onHelp, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = username || "User";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigate = (callback) => {
    setOpen(false);
    callback?.();
  };

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <ProfileAvatar name={displayName} avatarUrl={avatarUrl} />
        <span className="profile-name">{displayName}</span>
        <span className="profile-chevron">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-header">
            <ProfileAvatar
              name={displayName}
              avatarUrl={avatarUrl}
              size="lg"
            />
            <div>
              <strong>{displayName}</strong>
              {email && <span className="profile-email">{email}</span>}
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          <button
            type="button"
            className="profile-dropdown-item"
            onClick={() => handleNavigate(onSettings)}
          >
            Settings
          </button>

          <button
            type="button"
            className="profile-dropdown-item"
            onClick={() => handleNavigate(onHelp)}
          >
            Help &amp; Support
          </button>

          <div className="profile-dropdown-divider" />

          <button
            type="button"
            className="profile-dropdown-item profile-dropdown-item-danger"
            onClick={() => handleNavigate(onLogout)}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
