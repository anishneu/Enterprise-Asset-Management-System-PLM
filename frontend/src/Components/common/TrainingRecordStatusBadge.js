import { recordStatusLabel, normalizeRecordStatus } from "../../constants/trainingPlm";

function recordStatusSlug(status) {
  const normalized = normalizeRecordStatus(status).toLowerCase();
  if (normalized === "completed") return "released";
  if (normalized === "in progress") return "in-review";
  return "pending";
}

function TrainingRecordStatusBadge({ status }) {
  const label = recordStatusLabel(status);
  return (
    <span className={`workflow-status workflow-status--${recordStatusSlug(status)}`}>
      {label}
    </span>
  );
}

export default TrainingRecordStatusBadge;
