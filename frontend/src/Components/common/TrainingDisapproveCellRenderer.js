function TrainingDisapproveCellRenderer(props) {
  const record = props.data;
  const onDisapprove = props.context?.onDisapprove;

  if (!record?.id || record.detailRow) return null;

  return (
    <button
      type="button"
      className="parts-btn danger training-disapprove-btn"
      onClick={() => onDisapprove?.(record)}
    >
      Disapprove
    </button>
  );
}

export default TrainingDisapproveCellRenderer;
