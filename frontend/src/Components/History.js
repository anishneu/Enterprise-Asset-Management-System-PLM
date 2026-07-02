import { useEffect, useMemo, useState } from "react";

import apiClient from "../api/client";
import AuditHistoryPanel from "./common/AuditHistoryPanel";
import { useAuditHistory } from "../hooks/useAuditHistory";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { filterBySearch } from "../utils/filterBySearch";

import "./History.css";

function History({ searchText = "" }) {
  const { setInsight } = usePageInsight();
  const [entityTypes, setEntityTypes] = useState([]);
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const { items, loading, error } = useAuditHistory({
    limit: 200,
    refreshKey,
  });

  useEffect(() => {
    apiClient
      .get("/audit/entity-types")
      .then((res) => setEntityTypes(res.data || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    setInsight({ hideInsightPanel: true });
    return () => setInsight({ hideInsightPanel: false });
  }, [setInsight]);

  const filteredItems = useMemo(() => {
    let next = items;

    if (entityTypeFilter) {
      next = next.filter((entry) => entry.entityType === entityTypeFilter);
    }

    return filterBySearch(next, searchText, [
      "action",
      "summary",
      "entityLabel",
      "entityType",
      "performedBy",
      "revision",
    ]);
  }, [items, entityTypeFilter, searchText]);

  return (
    <div className="history-page">
      <div className="history-toolbar">
        <label className="history-filter">
          <span>Entity type</span>
          <select
            value={entityTypeFilter}
            onChange={(event) => setEntityTypeFilter(event.target.value)}
          >
            <option value="">All types</option>
            {entityTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="history-refresh"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>

        <span className="history-count">
          {filteredItems.length} event{filteredItems.length === 1 ? "" : "s"}
        </span>
      </div>

      {error && <p className="history-error">{error}</p>}

      <AuditHistoryPanel
        items={filteredItems}
        loading={loading}
        emptyMessage="No audit events found."
      />
    </div>
  );
}

export default History;
