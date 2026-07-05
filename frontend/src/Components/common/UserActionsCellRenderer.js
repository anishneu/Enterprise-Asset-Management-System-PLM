function UserActionsCellRenderer({ data, context }) {
  if (!data?.id || !context?.canEditUser) return null;

  return (
    <div className="user-actions-cell">
      <button
        type="button"
        className="user-actions-trigger"
        aria-label="User actions"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          context?.onOpenUserMenu?.(data, event.currentTarget);
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
    </div>
  );
}

export default UserActionsCellRenderer;
