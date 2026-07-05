export const WORKFLOW_STATUSES = [
  "Draft",
  "Pending Approval",
  "Released",
  "Obsolete",
];

export const REQUEST_STATUSES = ["Pending", "Approved", "Rejected"];

export const LEGACY_IN_REVIEW = "In Review";
export const INITIAL_WORKFLOW_STATUS = "Draft";

export function formatWorkflowStatus(status) {
  const value = (status || INITIAL_WORKFLOW_STATUS).trim();
  if (value === LEGACY_IN_REVIEW) {
    return "Pending Approval";
  }
  if (REQUEST_STATUSES.includes(value)) {
    return value;
  }
  return WORKFLOW_STATUSES.includes(value) ? value : INITIAL_WORKFLOW_STATUS;
}

export function canEdit(status) {
  const normalized = formatWorkflowStatus(status);
  return (
    normalized === INITIAL_WORKFLOW_STATUS || normalized === "Pending Approval"
  );
}

export function canDelete(status) {
  return formatWorkflowStatus(status) === INITIAL_WORKFLOW_STATUS;
}

export function canSendToReview(status) {
  return formatWorkflowStatus(status) === INITIAL_WORKFLOW_STATUS;
}

export function canApprove(status) {
  return formatWorkflowStatus(status) === "Pending Approval";
}

export function canRevise(status) {
  return formatWorkflowStatus(status) === "Released";
}

export function isReadOnly(status) {
  const normalized = formatWorkflowStatus(status);
  return (
    normalized === "Pending Approval" ||
    normalized === "Released" ||
    normalized === "Obsolete"
  );
}

export function entityTypeLabel(entityType) {
  if (entityType === "form") return "Form";
  if (entityType === "doc") return "Document";
  if (entityType === "curriculum") return "Curriculum";
  return entityType || "Item";
}
