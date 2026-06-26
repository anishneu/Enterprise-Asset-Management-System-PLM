import TraineeCombobox from "./TraineeCombobox";

function ApproverBox({
  approver,
  effectiveDate,
  onApproverChange,
  onEffectiveDateChange,
  users = [],
  usersLoading = false,
  disabled = false,
  optional = false,
  compact = false,
}) {
  return (
    <section
      className={`approver-box${compact ? " approver-box--compact" : ""}`}
      aria-label="Approver details"
    >
      <h4 className="approver-box-title">
        Approver{optional ? " (optional)" : ""}
      </h4>
      <div className="approver-box-fields">
        <label className="approver-box-field">
          <span className="approver-box-label">Approver</span>
          <TraineeCombobox
            users={users}
            value={approver}
            onChange={onApproverChange}
            loading={usersLoading}
            disabled={disabled}
          />
        </label>
        <label className="approver-box-field">
          <span className="approver-box-label">Effective Date</span>
          <input
            type="date"
            className="forms-control"
            value={effectiveDate || ""}
            onChange={(e) => onEffectiveDateChange(e.target.value)}
            disabled={disabled}
          />
        </label>
      </div>
    </section>
  );
}

export default ApproverBox;
