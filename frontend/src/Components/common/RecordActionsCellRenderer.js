import { normalizeRecordStatus } from "../../constants/trainingPlm";
import ActionIconButton from "./ActionIconButton";

function RecordActionsCellRenderer({ data, context }) {
  if (!data?.id) return null;

  const currentUserId = context?.currentUserId || "";
  const isTrainee = Boolean(currentUserId) && data.user_id === currentUserId;
  const canOpenTraining =
    isTrainee && normalizeRecordStatus(data.status) !== "Completed";

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
      {canOpenTraining && (
        <ActionIconButton
          label="Open training"
          className="group-edit-btn training-open-btn"
          onClick={(event) => {
            event.stopPropagation();
            context?.onOpenTraining?.(data);
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
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <path d="M9 12h6" />
            <path d="M9 16h6" />
            <path d="M9 8h.01" />
          </svg>
        </ActionIconButton>
      )}
    </div>
  );
}

export default RecordActionsCellRenderer;
