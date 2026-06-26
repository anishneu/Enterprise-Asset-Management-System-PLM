function ApprovalActionsCellRenderer({ data, context }) {
  if (!data?.request_id) return null;

  const actingId = context?.actingId;
  const busy = actingId === data.request_id;

  return (
    <div className="approvals-row-actions">
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
    </div>
  );
}

export default ApprovalActionsCellRenderer;
