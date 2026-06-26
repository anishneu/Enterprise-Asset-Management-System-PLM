function GroupEditCellRenderer({ data, context }) {
  if (!data?.id) return null;

  return (
    <button
      type="button"
      className="group-edit-btn"
      aria-label="Edit group"
      onClick={(event) => {
        event.stopPropagation();
        context?.onEditGroup?.(data);
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    </button>
  );
}

export default GroupEditCellRenderer;
