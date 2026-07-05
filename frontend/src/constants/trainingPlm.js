export const COURSE_STATUSES = ["Draft", "Released", "Obsolete"];
export const CURRICULUM_STATUSES = ["Draft", "Pending Approval", "Released", "Obsolete"];
export const ASSIGNMENT_STATUSES = ["Assigned", "In Progress", "Completed", "Expired", "Reassigned"];
export const RECORD_STATUSES = ["Assigned", "In Progress", "Completed"];

export function normalizeRecordStatus(status) {
  const value = (status || "Assigned").trim();
  if (value === "Completed") return "Completed";
  if (
    value === "In Progress" ||
    value === "Pending Evaluation" ||
    value === "Pending" ||
    value === "Retake" ||
    value === "Reassigned"
  ) {
    return "In Progress";
  }
  return "Assigned";
}

export function recordStatusLabel(status) {
  const normalized = normalizeRecordStatus(status);
  if (normalized === "In Progress") return "In Progress";
  return normalized;
}

export function curriculumStatusLabel(status) {
  if (status === "Released") return "Published";
  if (status === "Obsolete") return "Archived";
  if (status === "Pending Approval") return "Pending Approval";
  return status || "Draft";
}

export function courseStatusClass(status) {
  const value = (status || "Draft").toLowerCase();
  if (value === "released") return "training-status--released";
  if (value === "obsolete") return "training-status--obsolete";
  return "training-status--draft";
}

export function recordStatusClass(status) {
  const normalized = normalizeRecordStatus(status).toLowerCase();
  if (normalized === "completed") return "training-status--completed";
  if (normalized === "in progress") return "training-status--progress";
  return "training-status--pending";
}

export function formatTrainingDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

export function formatTrainingDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function dateInputToIso(value) {
  if (!value) return null;
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
