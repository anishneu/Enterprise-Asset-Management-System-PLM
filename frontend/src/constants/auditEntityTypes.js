export const ENTITY_LABELS = {
  doc: "Document",
  form: "Form",
  part: "Part",
  training: "Training",
  user: "User",
  group: "Group",
  approval: "Approval",
};

export const ACTION_COLORS = {
  Created: "audit-action--created",
  Updated: "audit-action--updated",
  Deleted: "audit-action--deleted",
  Submitted: "audit-action--submitted",
  Approved: "audit-action--approved",
  Rejected: "audit-action--rejected",
  Revised: "audit-action--revised",
};

export function formatAuditDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function formatAuditChanges(changes) {
  if (!changes || typeof changes !== "object") return null;
  return Object.entries(changes).map(([field, delta]) => {
    if (delta && typeof delta === "object" && ("from" in delta || "to" in delta)) {
      return {
        field,
        from: delta.from ?? "—",
        to: delta.to ?? "—",
      };
    }
    return {
      field,
      from: null,
      to: JSON.stringify(delta),
    };
  });
}
