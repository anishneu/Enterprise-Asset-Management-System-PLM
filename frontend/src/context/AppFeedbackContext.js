import { createContext, useCallback, useContext, useMemo, useState } from "react";

import AppFeedbackModal from "../Components/common/AppFeedbackModal";
import { formatWorkflowStatus } from "../constants/workflowCatalog";

const AppFeedbackContext = createContext(null);

const WORKFLOW_GUIDANCE = {
  "Pending Approval": {
    title: "Pending approval",
    summary: "This item is locked while an approver reviews it.",
    allowed: ["View the record", "Wait for approval or rejection"],
    notAllowed: ["Edit", "Delete", "Submit again"],
    nextStep: "The revision stays the same until approval completes. If rejected, it returns to Draft for edits.",
  },
  Released: {
    title: "Released",
    summary: "This revision is approved and read-only.",
    allowed: ["View the record", "Create the next revision"],
    notAllowed: ["Edit", "Delete"],
    nextStep:
      "Approval does not change the revision number. Use Create revision to start the next revision (for example A → B or 1 → 2).",
  },
  Obsolete: {
    title: "Obsolete",
    summary: "This item is archived and read-only.",
    allowed: ["View the record"],
    notAllowed: ["Edit", "Delete", "Submit", "Revise"],
    nextStep: null,
  },
};

function buildWorkflowBlockedMessage({ itemType, itemName, status }) {
  const normalized = formatWorkflowStatus(status);
  const guidance = WORKFLOW_GUIDANCE[normalized];
  if (!guidance) {
    return {
      title: "Action not available",
      message: `This ${itemType || "item"} cannot be edited in its current state.`,
      variant: "warning",
    };
  }

  return {
    title: guidance.title,
    variant: "workflow",
    workflow: {
      itemType,
      itemName,
      status: normalized,
      ...guidance,
    },
  };
}

export function AppFeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const close = useCallback(() => {
    setDialog(null);
  }, []);

  const show = useCallback((options) => {
    setDialog({
      title: options.title || "Notice",
      message: options.message || "",
      variant: options.variant || "info",
      workflow: options.workflow || null,
      confirmLabel: options.confirmLabel || "OK",
    });
  }, []);

  const info = useCallback(
    (message, title = "Notice") => show({ title, message, variant: "info" }),
    [show]
  );

  const success = useCallback(
    (message, title = "Success") => show({ title, message, variant: "success" }),
    [show]
  );

  const error = useCallback(
    (message, title = "Something went wrong") => show({ title, message, variant: "error" }),
    [show]
  );

  const warning = useCallback(
    (message, title = "Warning") => show({ title, message, variant: "warning" }),
    [show]
  );

  const workflowBlocked = useCallback(
    (options) => {
      const payload = buildWorkflowBlockedMessage(options);
      show(payload);
    },
    [show]
  );

  const value = useMemo(
    () => ({ show, info, success, error, warning, workflowBlocked, close }),
    [show, info, success, error, warning, workflowBlocked, close]
  );

  return (
    <AppFeedbackContext.Provider value={value}>
      {children}
      <AppFeedbackModal dialog={dialog} onClose={close} />
    </AppFeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(AppFeedbackContext);
  if (!context) {
    throw new Error("useAppFeedback must be used within AppFeedbackProvider");
  }
  return context;
}
