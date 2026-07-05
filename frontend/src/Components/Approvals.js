import { useCallback, useEffect, useMemo, useState } from "react";

import apiClient from "../api/client";
import AppDataGrid from "./common/AppDataGrid";
import ApprovalActionsCellRenderer from "./common/ApprovalActionsCellRenderer";
import WorkflowStatusBadge from "./common/WorkflowStatusBadge";
import { entityTypeLabel } from "../constants/workflowCatalog";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { useAppFeedback } from "../context/AppFeedbackContext";
import usePermission from "../hooks/usePermission";
import { filterBySearch } from "../utils/filterBySearch";

import "./Approvals.css";
import "./Docs.css";

const VIEW_COPY = {
  pending: {
    empty: "No pending approval requests.",
  },
  my: {
    empty: "You have not submitted any approval requests.",
  },
  approved: {
    empty: "No approved requests yet.",
  },
  rejected: {
    empty: "No rejected requests.",
  },
};

function formatTimestamp(value) {
  if (!value) return "—";
  return String(value);
}

function Approvals({ view = "pending", searchText = "" }) {
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();
  const permission = usePermission();
  const copy = VIEW_COPY[view] || VIEW_COPY.pending;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [approveDialog, setApproveDialog] = useState(null);
  const [approveComments, setApproveComments] = useState("");
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectComments, setRejectComments] = useState("");
  const [rejectError, setRejectError] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/approvals", { params: { view } });
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
      setRequests([]);
      feedback.error(err.response?.data?.detail || "Failed to load approval requests.");
    } finally {
      setLoading(false);
    }
  }, [view, feedback]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const gridRows = useMemo(() => {
    const normalized = requests.map((request) => ({
      ...request,
      id: request.request_id,
    }));

    return filterBySearch(normalized, searchText, [
      "request_id",
      "entity_type",
      "entity_title",
      "revision",
      "status",
      "requester_display",
      "approver_display",
      "comments",
      "requested_at",
      "completed_at",
    ]);
  }, [requests, searchText]);

  useEffect(() => {
    setInsight({
      recordCount: gridRows.length,
      selectedCount: 0,
    });
  }, [gridRows.length, setInsight]);

  const openApproveDialog = useCallback((request) => {
    setApproveComments("");
    setApproveDialog(request);
  }, []);

  const closeApproveDialog = () => {
    if (actingId) return;
    setApproveDialog(null);
    setApproveComments("");
  };

  const confirmApprove = async () => {
    if (!approveDialog) return;

    setActingId(approveDialog.request_id);
    try {
      await apiClient.post(`/approvals/${approveDialog.request_id}/approve`, {
        comments: approveComments.trim() || null,
      });
      setApproveDialog(null);
      setApproveComments("");
      feedback.success("Request approved. The item is now Released.");
      await fetchRequests();
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to approve request.");
    } finally {
      setActingId(null);
    }
  };

  const openRejectDialog = useCallback((request) => {
    setRejectComments("");
    setRejectError("");
    setRejectDialog(request);
  }, []);

  const closeRejectDialog = () => {
    if (actingId) return;
    setRejectDialog(null);
    setRejectComments("");
    setRejectError("");
  };

  const confirmReject = async () => {
    if (!rejectDialog) return;
    if (!rejectComments.trim()) {
      setRejectError("Comments are required when rejecting.");
      return;
    }

    setActingId(rejectDialog.request_id);
    try {
      await apiClient.post(`/approvals/${rejectDialog.request_id}/reject`, {
        comments: rejectComments.trim(),
      });
      setRejectDialog(null);
      setRejectComments("");
      setRejectError("");
      feedback.success("Request rejected. The item returned to Draft.");
      await fetchRequests();
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to reject request.");
    } finally {
      setActingId(null);
    }
  };

  const gridContext = useMemo(
    () => ({
      actingId,
      onApprove: openApproveDialog,
      onReject: openRejectDialog,
      canApprove: permission.canApprove,
      canReject: permission.canReject,
    }),
    [actingId, openApproveDialog, openRejectDialog, permission.canApprove, permission.canReject]
  );

  const columnDefs = useMemo(() => {
    const base = [
      {
        field: "request_id",
        headerName: "ID",
        maxWidth: 90,
        valueGetter: (params) => params.data?.request_id ?? "",
      },
      {
        field: "entity_type",
        headerName: "Type",
        minWidth: 110,
        maxWidth: 130,
        valueGetter: (params) => entityTypeLabel(params.data?.entity_type),
      },
      {
        field: "entity_title",
        headerName: "Title",
        minWidth: 200,
        flex: 1.2,
      },
      {
        field: "revision",
        headerName: "Rev",
        maxWidth: 90,
        valueGetter: (params) => params.data?.revision || "—",
      },
      {
        field: "status",
        headerName: "Request status",
        minWidth: 140,
        maxWidth: 160,
        cellRenderer: (params) => <WorkflowStatusBadge status={params.data?.status} />,
      },
      {
        field: "requester_display",
        headerName: "Requested by",
        minWidth: 180,
        valueGetter: (params) => params.data?.requester_display || "—",
      },
      {
        field: "approver_display",
        headerName: "Approver",
        minWidth: 180,
        valueGetter: (params) => params.data?.approver_display || "—",
      },
      {
        field: "requested_at",
        headerName: "Requested",
        minWidth: 180,
        flex: 0,
        valueGetter: (params) => formatTimestamp(params.data?.requested_at),
      },
    ];

    if (view === "pending" && (permission.canApprove || permission.canReject)) {
      return [
        ...base,
        {
          headerName: "Actions",
          colId: "actions",
          minWidth: 180,
          maxWidth: 200,
          sortable: false,
          filter: false,
          cellRenderer: ApprovalActionsCellRenderer,
        },
      ];
    }

    return [
      ...base,
      {
        field: "completed_at",
        headerName: "Completed",
        minWidth: 180,
        flex: 0,
        valueGetter: (params) => formatTimestamp(params.data?.completed_at),
      },
      {
        field: "comments",
        headerName: "Comments",
        minWidth: 220,
        flex: 1,
        valueGetter: (params) => params.data?.comments || "—",
      },
    ];
  }, [view, permission.canApprove, permission.canReject]);

  const getRowId = useCallback((params) => String(params.data.request_id), []);

  return (
    <div className="grid-page approvals-page">
      <AppDataGrid
        rowData={gridRows}
        columnDefs={columnDefs}
        context={gridContext}
        getRowId={getRowId}
        loading={loading}
        showSerialColumn
        searchPlaceholder="Search approvals..."
        overlayNoRowsTemplate={`<span>${copy.empty}</span>`}
      />

      {approveDialog && (
        <div className="modal-overlay" onClick={closeApproveDialog}>
          <div
            className="modal forms-delete-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Approve request</h3>
            <p className="forms-delete-message">
              Approve <strong>{approveDialog.entity_title}</strong> (
              {entityTypeLabel(approveDialog.entity_type)} Rev{" "}
              {approveDialog.revision || "—"}) and release it.
            </p>
            <label className="approvals-reject-field">
              <span className="approver-box-label">Approver comments (optional)</span>
              <textarea
                className="forms-control approvals-reject-textarea"
                rows={3}
                value={approveComments}
                onChange={(event) => setApproveComments(event.target.value)}
                placeholder="Add release notes or approval comments..."
              />
            </label>
            <div className="forms-delete-actions">
              <button
                type="button"
                className="parts-btn primary"
                onClick={confirmApprove}
                disabled={actingId === approveDialog.request_id}
              >
                {actingId === approveDialog.request_id ? "Approving..." : "Approve"}
              </button>
              <button
                type="button"
                className="parts-btn"
                onClick={closeApproveDialog}
                disabled={actingId === approveDialog.request_id}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectDialog && (
        <div className="modal-overlay" onClick={closeRejectDialog}>
          <div
            className="modal forms-delete-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Reject request</h3>
            <p className="forms-delete-message">
              Reject <strong>{rejectDialog.entity_title}</strong> and return it to Draft.
              Comments are required so the owner knows what to fix.
            </p>
            <label className="approvals-reject-field">
              <span className="approver-box-label">Rejection comments</span>
              <textarea
                className={`forms-control approvals-reject-textarea${
                  rejectError ? " approvals-reject-textarea--error" : ""
                }`}
                rows={4}
                value={rejectComments}
                onChange={(event) => {
                  setRejectComments(event.target.value);
                  if (rejectError) setRejectError("");
                }}
                placeholder="Explain what needs to change..."
              />
              {rejectError && <span className="approvals-field-error">{rejectError}</span>}
            </label>
            <div className="forms-delete-actions">
              <button
                type="button"
                className="parts-btn danger"
                onClick={confirmReject}
                disabled={actingId === rejectDialog.request_id}
              >
                {actingId === rejectDialog.request_id ? "Rejecting..." : "Reject"}
              </button>
              <button
                type="button"
                className="parts-btn"
                onClick={closeRejectDialog}
                disabled={actingId === rejectDialog.request_id}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Approvals;
