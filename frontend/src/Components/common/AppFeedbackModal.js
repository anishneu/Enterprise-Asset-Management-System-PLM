import WorkflowStatusBadge from "./WorkflowStatusBadge";

import "./AppFeedbackModal.css";

function AppFeedbackModal({ dialog, onClose }) {
  if (!dialog) return null;

  const { title, message, variant, workflow, confirmLabel } = dialog;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal app-feedback-modal app-feedback-modal--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-feedback-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="app-feedback-title">{title}</h3>

        {variant === "workflow" && workflow ? (
          <div className="app-feedback-workflow">
            <p className="app-feedback-message">
              <strong>{workflow.itemName || "This item"}</strong>{" "}
              {workflow.itemType ? `(${workflow.itemType})` : ""} is currently{" "}
              <WorkflowStatusBadge status={workflow.status} />.
            </p>
            <p className="forms-muted">{workflow.summary}</p>

            <div className="app-feedback-columns">
              <div>
                <h4>Allowed</h4>
                <ul>
                  {workflow.allowed.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Not allowed</h4>
                <ul>
                  {workflow.notAllowed.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {workflow.nextStep && (
              <p className="app-feedback-next">
                <strong>About revisions:</strong> {workflow.nextStep}
              </p>
            )}
          </div>
        ) : (
          <p className="app-feedback-message">{message}</p>
        )}

        <div className="forms-delete-actions">
          <button type="button" className="parts-btn primary" onClick={onClose}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppFeedbackModal;
