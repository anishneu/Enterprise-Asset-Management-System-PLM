export function formatKeycloakOwner(tokenParsed) {
  if (!tokenParsed) return "";

  const email = (tokenParsed.email || "").trim();
  const first = (tokenParsed.given_name || "").trim();
  const last = (tokenParsed.family_name || "").trim();
  const fullName =
    [first, last].filter(Boolean).join(" ").trim() ||
    (tokenParsed.name || "").trim() ||
    (tokenParsed.preferred_username || "").trim();

  if (fullName && email) return `${fullName} (${email})`;
  return fullName || email || "";
}

export function formatStoredOwner(value) {
  const text = (value || "").trim();
  return text || "—";
}
