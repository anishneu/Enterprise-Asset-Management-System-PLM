import { formatWorkflowStatus } from "../../constants/workflowCatalog";

function WorkflowStatusBadge({ status }) {
  const label = formatWorkflowStatus(status);
  const slug = label.toLowerCase().replace(/\s+/g, "-");

  return <span className={`workflow-status workflow-status--${slug}`}>{label}</span>;
}

export default WorkflowStatusBadge;
