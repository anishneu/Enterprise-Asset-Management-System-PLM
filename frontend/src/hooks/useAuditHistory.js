import { useCallback, useEffect, useState } from "react";

import apiClient from "../api/client";

export function useAuditHistory({
  entityType = null,
  entityId = null,
  limit = 100,
  offset = 0,
  refreshKey = 0,
  enabled = true,
}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError("");
    try {
      const params = { limit, offset };
      if (entityType) params.entity_type = entityType;
      if (entityId != null) params.entity_id = String(entityId);

      const res = await apiClient.get("/audit/history", { params });
      setItems(res.data?.items || []);
      setTotal(res.data?.total ?? res.data?.items?.length ?? 0);
    } catch (err) {
      console.error(err);
      setItems([]);
      setTotal(0);
      setError("Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, limit, offset, enabled]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  return { items, total, loading, error, refetch: fetchHistory };
}
