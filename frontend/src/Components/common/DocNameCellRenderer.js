import { formatDocDisplayName } from "../docs/docFormUtils";

function DocNameCellRenderer({ data, context }) {
  if (!data || data.detailRow) return null;

  const name = formatDocDisplayName(data);
  const isExpanded = context.expandedDocId === data.id;

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
      {name}
    </button>
  );
}

export default DocNameCellRenderer;
