import { useMemo, useState } from "react";

import AuditTimeline from "../common/AuditTimeline";
import { useAuditHistory } from "../../hooks/useAuditHistory";

const PAGE_SIZE = 5;

function DashboardAuditPanel() {
  const [page, setPage] = useState(0);

  const {
    items,
    total,
    loading,
    error,
  } = useAuditHistory({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  const canGoBack = page > 0;
  const canGoForward = page + 1 < totalPages;

  return (
    <section className="dashboard-audit-card">
      {error ? (
        <p className="dashboard-audit-error">{error}</p>
      ) : (
        <>
          <AuditTimeline
            items={items}
            loading={loading}
            compact
            emptyMessage="No activity recorded yet. Changes will show up here as you work."
          />

          {!loading && total > 0 && (
            <div className="dashboard-audit-pagination">
              <button
                type="button"
                className="dashboard-audit-page-btn"
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={!canGoBack}
                aria-label="Previous audit page"
              >
                Previous
              </button>
              <span className="dashboard-audit-page-meta">
                Page {page + 1} of {totalPages}
                <span className="dashboard-audit-page-count">
                  ({total} event{total === 1 ? "" : "s"})
                </span>
              </span>
              <button
                type="button"
                className="dashboard-audit-page-btn"
                onClick={() => setPage((value) => value + 1)}
                disabled={!canGoForward}
                aria-label="Next audit page"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default DashboardAuditPanel;
