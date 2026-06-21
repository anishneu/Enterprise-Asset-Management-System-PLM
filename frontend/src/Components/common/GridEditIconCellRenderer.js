function EditIcon() {
  return (
    <svg
      className="grid-edit-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}

function GridEditIconCellRenderer({ data, context }) {
  if (!data) return null;

  return (
    <button
      type="button"
      className="grid-edit-icon-btn"
      title="Edit"
      aria-label="Edit row"
      onClick={() => context.onEdit(data)}
    >
      <EditIcon />
    </button>
  );
}

export default GridEditIconCellRenderer;
