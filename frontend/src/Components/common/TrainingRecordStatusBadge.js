function recordStatusSlug(status) {
  const value = (status || "Pending").toLowerCase();
  if (value === "completed") return "released";
  if (value === "in progress") return "in-review";
  if (value === "failed") return "rejected";
  if (value === "expired") return "obsolete";
  return "pending";
}

function TrainingRecordStatusBadge({ status }) {
  const label = status || "Pending";
  return (
    <span className={`workflow-status workflow-status--${recordStatusSlug(label)}`}>
      {label}
    </span>
  );
}

export default TrainingRecordStatusBadge;
