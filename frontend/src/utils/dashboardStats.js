import { formatWorkflowStatus } from "../constants/workflowCatalog";
import { RECORD_STATUSES, normalizeRecordStatus } from "../constants/trainingPlm";

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
  const counts = Object.fromEntries(RECORD_STATUSES.map((s) => [s, 0]));

  (training || []).forEach((record) => {
    const status = normalizeRecordStatus(record?.status);
    counts[status] = (counts[status] || 0) + 1;
  });

  return RECORD_STATUSES.map((name) => ({
    name,
    value: counts[name] || 0,
  })).filter((entry) => entry.value > 0);
}

export function countOverdueTraining(training) {
  const now = Date.now();
  return (training || []).filter((record) => {
    const status = normalizeRecordStatus(record?.status);
    if (status === "Completed") return false;
    const dueValue = record?.due_date || record?.duedate;
    if (!dueValue) return false;
    const due = new Date(dueValue).getTime();
    return !Number.isNaN(due) && due < now;
  }).length;
}

export function countUnassignedTraining(training) {
  return (training || []).filter((record) => {
    const display = record?.trainee || record?.user_display || record?.user_id || "";
    return !String(display).trim();
  }).length;
}
