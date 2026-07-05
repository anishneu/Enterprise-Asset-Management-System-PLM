import { useRef, useState } from "react";

import keycloak from "../keycloak";
import ProfileAvatar from "./common/ProfileAvatar";
import { useProfile } from "../context/ProfileContext";
import { useAppFeedback } from "../context/AppFeedbackContext";

import "./Settings.css";
import "./AccountPages.css";

function Settings() {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { avatarUrl, setAvatarFromFile, removeAvatar } = useProfile();
  const feedback = useAppFeedback();

  const username = keycloak.tokenParsed?.preferred_username || "User";
  const email = keycloak.tokenParsed?.email || "—";
  const firstName = keycloak.tokenParsed?.given_name || "";
  const lastName = keycloak.tokenParsed?.family_name || "";
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || username;

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      await setAvatarFromFile(file);
      feedback.success("Profile picture updated.");
    } catch (err) {
      feedback.error(err.message || "Could not update profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    removeAvatar();
    feedback.success("Profile picture removed.");
  };

  return (
    <div className="account-page settings-page">
      <section className="account-card">
        <div className="account-card-header">
          <h3>Profile</h3>
          <p>Manage how you appear in TalonVault.</p>
        </div>

        <div className="settings-profile-layout">
          <div className="settings-avatar-block">
            <ProfileAvatar
              name={displayName}
              avatarUrl={avatarUrl}
              size="lg"
              className="settings-avatar-preview"
            />
            <div className="settings-avatar-actions">
              <button
                type="button"
                className="parts-btn primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Change picture"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  className="parts-btn"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="settings-file-input"
              onChange={handleFileChange}
            />
            <p className="settings-avatar-hint">
              PNG, JPG, WebP, or GIF. Maximum 2 MB.
            </p>
          </div>

          <dl className="settings-details">
            <div>
              <dt>Display name</dt>
              <dd>{displayName}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{username}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{email}</dd>
            </div>
            <div>
              <dt>Sign-in</dt>
              <dd>Keycloak single sign-on</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="account-card">
        <div className="account-card-header">
          <h3>Preferences</h3>
          <p>Workspace defaults for your account.</p>
        </div>
        <dl className="settings-details settings-details--compact">
          <div>
            <dt>Language</dt>
            <dd>English (US)</dd>
          </div>
          <div>
            <dt>Time zone</dt>
            <dd>{Intl.DateTimeFormat().resolvedOptions().timeZone}</dd>
          </div>
          <div>
            <dt>Notifications</dt>
            <dd>Managed by your organization</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export default Settings;
