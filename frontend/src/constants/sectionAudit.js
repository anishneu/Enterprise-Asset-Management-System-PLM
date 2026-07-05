export const SECTION_AUDIT_ENTITY = {
  parts: "part",
  docs: "doc",
  forms: "form",
  training: "training",
  users: "user",
  groups: "group",
  approvals: "approval",
};

export function sectionAuditTitle(section) {
  const titles = {
    parts: "Parts history",
    docs: "Documents history",
    forms: "Forms history",
    training: "Training history",
    users: "Users history",
    groups: "Groups history",
    approvals: "Approvals history",
    dashboard: "Recent activity",
  };
  return titles[section] || "Activity history";
}
