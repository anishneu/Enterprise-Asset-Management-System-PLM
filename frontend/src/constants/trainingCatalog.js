export const COMPLETION_STATUSES = ["Pending", "In Progress", "Completed"];

export const TRAINING_FORM_TYPE = "Training";

export const INITIAL_COMPLETION_STATUS = "Pending";

export function formatCompletionStatus(status) {
  const value = (status || INITIAL_COMPLETION_STATUS).trim();
  return COMPLETION_STATUSES.includes(value) ? value : INITIAL_COMPLETION_STATUS;
}

/** Training assignment lifecycle — only used on Records, not Curriculum. */
export function canSetCompletionStatus(status) {
  return COMPLETION_STATUSES.includes(formatCompletionStatus(status));
}

export function completionStatusHelpText() {
  return "Assignments start as Pending. Update to In Progress when the trainee begins, and Completed when training is finished.";
}
