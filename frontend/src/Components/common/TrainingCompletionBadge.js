import { formatCompletionStatus } from "../../constants/trainingCatalog";

function statusSlug(status) {
  return formatCompletionStatus(status).toLowerCase().replace(/\s+/g, "-");
}

function TrainingCompletionBadge({ status }) {
  const label = formatCompletionStatus(status);
  return (
    <span className={`training-completion training-completion--${statusSlug(status)}`}>
      {label}
    </span>
  );
}

export default TrainingCompletionBadge;
