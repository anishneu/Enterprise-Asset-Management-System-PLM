def actor_display(current_user: dict) -> str:
    first = (current_user.get("given_name") or "").strip()
    last = (current_user.get("family_name") or "").strip()
    name = " ".join(part for part in (first, last) if part).strip()
    if not name:
        name = (current_user.get("name") or current_user.get("preferred_username") or "").strip()
    email = (current_user.get("email") or "").strip()
    if name and email:
        return f"{name} ({email})"
    return name or email or "unknown"
