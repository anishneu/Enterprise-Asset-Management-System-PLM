import ActionIconButton from "./ActionIconButton";

function RecordViewCellRenderer({ data, context }) {
  if (!data?.id) return null;

  return (
    <div className="forms-saved-row-actions">
      <ActionIconButton
        label="View record"
        className="group-edit-btn"
        onClick={(event) => {
          event.stopPropagation();
          context?.onViewRecord?.(data);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </ActionIconButton>
    </div>
  );
}

export default RecordViewCellRenderer;
