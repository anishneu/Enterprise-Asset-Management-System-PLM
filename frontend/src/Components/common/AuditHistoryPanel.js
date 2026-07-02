import { useMemo } from "react";

import { useAuditHistory } from "../../hooks/useAuditHistory";
import { filterBySearch } from "../../utils/filterBySearch";
import AuditTimeline from "./AuditTimeline";

import "../History.css";

function AuditHistoryPanel({
  items: itemsProp = null,
  loading: loadingProp = null,
  entityType = null,
  entityId = null,
  compact = false,
  limit = null,
  searchText = "",
  emptyMessage = "No history recorded yet.",
  refreshKey = 0,
}) {
  const fetchLimit = limit ?? (compact ? 8 : 100);
  const useExternalItems = itemsProp != null;

  const { items: fetchedItems, loading: fetchedLoading, error } = useAuditHistory({
    entityType,
    entityId,
    limit: fetchLimit,
    refreshKey,
    enabled: !useExternalItems,
  });

  const items = useExternalItems ? itemsProp : fetchedItems;
  const loading = useExternalItems ? Boolean(loadingProp) : fetchedLoading;

  const filteredItems = useMemo(() => {
    if (useExternalItems) return items;
    return filterBySearch(items, searchText, [
      "action",
      "summary",
      "entityLabel",
      "entityType",
      "performedBy",
      "revision",
    ]);
  }, [items, searchText, useExternalItems]);

  if (error) {
    return <p className="audit-status audit-status--error">{error}</p>;
  }

  return (
    <AuditTimeline
      items={filteredItems}
      loading={loading}
      compact={compact}
      emptyMessage={emptyMessage}
    />
  );
}

export default AuditHistoryPanel;
