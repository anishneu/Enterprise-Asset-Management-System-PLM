import ActionIconButton from "./ActionIconButton";

function CourseActionsCellRenderer({ data, context }) {
  if (!data?.id) return null;

  return (
    <div className="forms-saved-row-actions">
      {data.status === "Draft" && (
        <ActionIconButton
          label="Edit"
          className="group-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            context?.onEditCourse?.(data);
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
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </ActionIconButton>
      )}
      {data.status === "Draft" && (
        <ActionIconButton
          label="Release"
          className="group-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            context?.onReleaseCourse?.(data);
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
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </ActionIconButton>
      )}
      {data.status === "Released" && (
        <ActionIconButton
          label="Revise"
          className="group-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            context?.onReviseCourse?.(data);
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
            <path d="M21 12a9 9 0 1 1-3.18-6.89" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
        </ActionIconButton>
      )}
    </div>
  );
}

export default CourseActionsCellRenderer;
