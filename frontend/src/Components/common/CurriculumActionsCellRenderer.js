import {
  canDelete,
  canEdit,
  canRevise,
  canSendToReview,
  formatWorkflowStatus,
} from "../../constants/workflowCatalog";
import ActionIconButton from "./ActionIconButton";

function CurriculumActionsCellRenderer({ data, context }) {
  if (!data?.id) return null;

  const status = formatWorkflowStatus(data.status);
  const canEditRow = Boolean(context?.canEditCurriculum) && canEdit(status);
  const canDeleteRow = Boolean(context?.canDeleteCurriculum) && canDelete(status);
  const canReviewRow = Boolean(context?.canEditCurriculum) && canSendToReview(status);
  const canReviseRow = Boolean(context?.canEditCurriculum) && canRevise(status);
  const canAssignRow = Boolean(context?.canEditCurriculum) && status === "Released";

  return (
    <div className="forms-saved-row-actions">
      <ActionIconButton
        label="View"
        className="group-edit-btn"
        onClick={(event) => {
          event.stopPropagation();
          context?.onViewCurriculum?.(data);
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </ActionIconButton>
      {canEditRow && (
        <ActionIconButton
          label="Edit"
          className="group-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            context?.onEditCurriculum?.(data);
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </ActionIconButton>
      )}
      {canReviewRow && (
        <ActionIconButton
          label="Send for review"
          className="group-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            context?.onSubmitReview?.(data);
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22 11 13 2 9 22 2z" />
          </svg>
        </ActionIconButton>
      )}
      {canAssignRow && (
        <ActionIconButton
          label="Assign"
          className="group-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            context?.onAssignCurriculum?.(data);
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </ActionIconButton>
      )}
      {canReviseRow && (
        <ActionIconButton
          label="Revise"
          className="group-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            context?.onReviseCurriculum?.(data);
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </ActionIconButton>
      )}
      {canDeleteRow && (
        <ActionIconButton
          label="Delete"
          className="forms-delete-btn"
          onClick={(event) => {
            event.stopPropagation();
            context?.onDeleteCurriculum?.(data);
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
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

export default CurriculumActionsCellRenderer;
