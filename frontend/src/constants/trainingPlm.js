export const COURSE_STATUSES = ["Draft", "Released", "Obsolete"];
export const CURRICULUM_STATUSES = ["Draft", "Released", "Obsolete"];
export const ASSIGNMENT_STATUSES = ["Assigned", "In Progress", "Completed", "Expired"];
export const RECORD_STATUSES = ["Pending", "In Progress", "Completed", "Failed", "Expired"];

export function courseStatusClass(status) {
  const value = (status || "Draft").toLowerCase();
  if (value === "released") return "training-status--released";
  if (value === "obsolete") return "training-status--obsolete";
  return "training-status--draft";
}

export function recordStatusClass(status) {
  const value = (status || "Pending").toLowerCase();
  if (value === "completed") return "training-status--completed";
  if (value === "in progress") return "training-status--progress";
  if (value === "failed" || value === "expired") return "training-status--danger";
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
