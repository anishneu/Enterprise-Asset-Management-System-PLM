function ApprovalActionsCellRenderer({ data, context }) {
  if (!data?.request_id) return null;

  const actingId = context?.actingId;
  const busy = actingId === data.request_id;
  const canApprove = Boolean(context?.canApprove);
  const canReject = Boolean(context?.canReject);

  if (!canApprove && !canReject) return null;

  return (
    <div className="approvals-row-actions">
      {canApprove && (
      <button
        type="button"
        className="parts-btn primary approvals-btn-sm"
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          context?.onApprove?.(data);
        }}
      >
        Approve
      </button>
      )}
      {canReject && (
      <button
        type="button"
        className="parts-btn danger approvals-btn-sm"
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          context?.onReject?.(data);
        }}
      >
        Reject
      </button>
      )}
    </div>
  );
}

export default ApprovalActionsCellRenderer;
