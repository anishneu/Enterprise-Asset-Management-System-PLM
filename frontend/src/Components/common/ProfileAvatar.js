function ProfileAvatar({ name = "User", avatarUrl, size = "md", className = "" }) {
  const initial = (name || "U").charAt(0).toUpperCase();
  const sizeClass =
    size === "lg" ? "profile-avatar profile-avatar-lg" : "profile-avatar";
  const classes = [sizeClass, avatarUrl ? "profile-avatar--image" : "", className]
    .filter(Boolean)
    .join(" ");

  if (avatarUrl) {
    return (
      <span className={classes}>
        <img src={avatarUrl} alt="" className="profile-avatar-img" />
      </span>
    );
  }

  return <span className={classes}>{initial}</span>;
}

export default ProfileAvatar;
