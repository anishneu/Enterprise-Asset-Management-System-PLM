function FormNameCellRenderer({ data, context }) {
  if (!data?.id || data.detailRow) return null;

  const isExpanded = context.expandedFormId === data.id;

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
      {data.fmname}
    </button>
  );
}

export default FormNameCellRenderer;
