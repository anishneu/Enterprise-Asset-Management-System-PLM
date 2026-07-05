import ApproverBox from "./ApproverBox";

function SubmitReviewDrawer({
  open,
  title = "Send for review",
  subtitle,
  itemCount = 0,
  approver,
  effectiveDate,
  onApproverChange,
  onEffectiveDateChange,
  users = [],
  usersLoading = false,
  submitting = false,
  submitLabel = "Send request",
  onSubmit,
  onClose,
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="forms-json-backdrop"
        aria-label="Close review panel"
        onClick={onClose}
      />
      <aside className="submit-review-drawer" aria-label="Send for review">
        <header className="forms-json-header">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="forms-muted">{subtitle}</p>}
            {itemCount > 0 && (
              <p className="submit-review-count">
                {itemCount} item{itemCount === 1 ? "" : "s"} selected
              </p>
            )}
          </div>
          <div className="forms-json-header-actions">
            <button
              type="button"
              className="forms-icon-btn"
              onClick={onClose}
              aria-label="Close panel"
              title="Close"
            >
              ×
            </button>
          </div>
        </header>

        <div className="submit-review-body">
          <ApproverBox
            approver={approver}
            effectiveDate={effectiveDate}
            onApproverChange={onApproverChange}
            onEffectiveDateChange={onEffectiveDateChange}
            users={users}
            usersLoading={usersLoading}
          />

          <div className="submit-review-actions">
            <button
              type="button"
              className="parts-btn primary"
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting ? "Sending..." : submitLabel}
            </button>
            <button type="button" className="parts-btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default SubmitReviewDrawer;
