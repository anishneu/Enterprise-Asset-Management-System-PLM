import { formatWorkflowStatus } from "../constants/workflowCatalog";
import {
  formatCompletionStatus,
  COMPLETION_STATUSES,
} from "../constants/trainingCatalog";

const WORKFLOW_ORDER = ["Draft", "Pending Approval", "Released", "Obsolete"];

export function countWorkflowByStatus(items, statusField) {
  const counts = Object.fromEntries(WORKFLOW_ORDER.map((status) => [status, 0]));

  (items || []).forEach((item) => {
    const status = formatWorkflowStatus(item?.[statusField]);
    counts[status] = (counts[status] || 0) + 1;
  });

  return WORKFLOW_ORDER.map((status) => ({
    status,
    count: counts[status] || 0,
  })).filter((entry) => entry.count > 0);
}

export function buildWorkflowCompareData(forms, docs) {
  return WORKFLOW_ORDER.map((status) => ({
    status,
    Forms: (forms || []).filter((f) => formatWorkflowStatus(f.fmstatus) === status).length,
    Documents: (docs || []).filter((d) => formatWorkflowStatus(d.dstatus) === status).length,
  }));
}

export function countTrainingCompletion(training) {
  const counts = Object.fromEntries(COMPLETION_STATUSES.map((s) => [s, 0]));

  (training || []).forEach((record) => {
    const status = formatCompletionStatus(record?.completionstatus);
    counts[status] = (counts[status] || 0) + 1;
  });

  return COMPLETION_STATUSES.map((name) => ({
    name,
    value: counts[name] || 0,
  })).filter((entry) => entry.value > 0);
}

export function countOverdueTraining(training) {
  const now = Date.now();
  return (training || []).filter((record) => {
    if (formatCompletionStatus(record?.completionstatus) === "Completed") return false;
    if (!record?.duedate) return false;
    const due = new Date(record.duedate).getTime();
    return !Number.isNaN(due) && due < now;
  }).length;
}

export function countUnassignedTraining(training) {
  return (training || []).filter((record) => !(record?.trainee || "").trim()).length;
}
