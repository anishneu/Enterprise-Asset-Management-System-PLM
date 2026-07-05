import { canRevise } from "../../constants/workflowCatalog";
import ActionIconButton from "./ActionIconButton";

function FormSavedActionsCellRenderer({ data, context }) {
  if (!data?.id || data.detailRow) return null;

  const canEdit = Boolean(context?.canEditForm);
  const canDelete = Boolean(context?.canDeleteForm);

  if (!canEdit && !canDelete) return null;

  return (
    <div className="forms-saved-row-actions">
      {canEdit && (
      <ActionIconButton
        label="Edit"
        className="group-edit-btn"
        onClick={(event) => {
          event.stopPropagation();
          context?.onEditForm?.(data);
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
      {canEdit && canRevise(data.fmstatus) && (
        <ActionIconButton
          label="Revise"
          className="group-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            context?.onReviseForm?.(data);
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
      {canDelete && (
      <ActionIconButton
        label="Delete"
        className="forms-delete-btn"
        disabled={context?.deleting}
        onClick={(event) => {
          event.stopPropagation();
          context?.onDeleteForm?.(data);
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
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </ActionIconButton>
      )}
    </div>
  );
}

export default FormSavedActionsCellRenderer;
