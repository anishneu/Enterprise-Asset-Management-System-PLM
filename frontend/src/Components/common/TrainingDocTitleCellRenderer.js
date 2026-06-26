function TrainingDocTitleCellRenderer({ data, context }) {
  if (!data || data.detailRow) return null;

  const title = data.title || "—";
  const isExpanded = context.expandedTrainingId === data.id;

  return (
    <button
      type="button"
      className={`doc-name-link${isExpanded ? " is-expanded" : ""}`}
      aria-expanded={isExpanded}
      onClick={(event) => {
        event.stopPropagation();
        context.onToggleExpand?.(data.id);
      }}
    >
      {title}
    </button>
  );
}

export default TrainingDocTitleCellRenderer;
