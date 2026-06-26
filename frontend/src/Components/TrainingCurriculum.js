import { useCallback, useEffect, useMemo, useState } from "react";

import apiClient from "../api/client";
import AppDataGrid from "./common/AppDataGrid";
import TraineeCombobox from "./common/TraineeCombobox";
import WorkflowStatusBadge from "./common/WorkflowStatusBadge";
import { multiRowSelection } from "./common/gridHelpers";
import {
  INITIAL_COMPLETION_STATUS,
  TRAINING_FORM_TYPE,
  completionStatusHelpText,
} from "../constants/trainingCatalog";
import { formatWorkflowStatus } from "../constants/workflowCatalog";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { useAppFeedback } from "../context/AppFeedbackContext";
import { filterBySearch } from "../utils/filterBySearch";

import "./Docs.css";
import "./Training.css";

const emptyAssignDraft = {
  trainee: "",
  dueDate: "",
};

function TrainingCurriculum({ searchText = "" }) {
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();

  const [forms, setForms] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignDialog, setAssignDialog] = useState(null);
  const [assignDraft, setAssignDraft] = useState(emptyAssignDraft);

  const rowSelection = useMemo(() => multiRowSelection, []);

  const releasedForms = useMemo(
    () =>
      forms.filter((form) => formatWorkflowStatus(form.fmstatus) === "Released"),
    [forms]
  );

  const filteredForms = useMemo(
    () =>
      filterBySearch(releasedForms, searchText, [
        "id",
        "fmname",
        "fmrev",
        "fmstatus",
        "ftype",
        "fowner",
      ]),
    [releasedForms, searchText]
  );

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/forms/", {
        params: { ftype: TRAINING_FORM_TYPE },
      });
      setForms(res.data || []);
    } catch (err) {
      console.error(err);
      feedback.error("Failed to load training curriculum.");
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await apiClient.get("/users");
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  useEffect(() => {
    setInsight({
      recordCount: filteredForms.length,
      selectedCount: selectedIds.length,
    });
  }, [filteredForms.length, selectedIds.length, setInsight]);

  const handleSelectionChanged = useCallback((event) => {
    const ids = event.api.getSelectedRows().map((row) => row.id);
    setSelectedIds(ids);
  }, []);

  const openAssignDialog = () => {
    if (selectedIds.length !== 1) {
      feedback.error("Select exactly one released training form to assign.");
      return;
    }

    const form = releasedForms.find((item) => item.id === selectedIds[0]);
    if (!form) {
      feedback.error("Selected form is not available for assignment.");
      return;
    }

    setAssignDraft(emptyAssignDraft);
    setAssignDialog(form);
    if (users.length === 0) {
      fetchUsers();
    }
  };

  const closeAssignDialog = () => {
    if (saving) return;
    setAssignDialog(null);
    setAssignDraft(emptyAssignDraft);
  };

  const confirmAssign = async () => {
    if (!assignDialog) return;

    if (!assignDraft.trainee.trim()) {
      feedback.error("Select a trainee.");
      return;
    }

    if (!assignDraft.dueDate) {
      feedback.error("Select a due date and time.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/training/", {
        fid: assignDialog.id,
        title: assignDialog.fmname,
        rev: assignDialog.fmrev || "1",
        trainee: assignDraft.trainee.trim(),
        duedate: new Date(assignDraft.dueDate).toISOString(),
        completionstatus: INITIAL_COMPLETION_STATUS,
      });
      setAssignDialog(null);
      setAssignDraft(emptyAssignDraft);
      setSelectedIds([]);
      feedback.success("Trainee assigned. Open Training → Records to track completion.");
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to assign trainee.");
    } finally {
      setSaving(false);
    }
  };

  const columnDefs = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        maxWidth: 90,
      },
      {
        field: "fmname",
        headerName: "Training module",
        minWidth: 220,
        flex: 1.4,
      },
      {
        field: "fmrev",
        headerName: "Rev",
        maxWidth: 90,
        valueGetter: (params) => params.data?.fmrev || "1",
      },
      {
        field: "fmstatus",
        headerName: "Form status",
        minWidth: 150,
        cellRenderer: (params) => <WorkflowStatusBadge status={params.data?.fmstatus} />,
      },
      {
        field: "fowner",
        headerName: "Owner",
        minWidth: 180,
        valueGetter: (params) => params.data?.fowner || "—",
      },
    ],
    []
  );

  return (
    <div className="grid-page">
      <p className="forms-muted forms-revision-hint">{completionStatusHelpText()}</p>
      <p className="forms-muted training-curriculum-hint">
        Curriculum lists <strong>Released</strong> training forms. Assign a trainee here to
        create a record in Training → Records (starts as Pending).
      </p>

      <AppDataGrid
        rowData={filteredForms}
        columnDefs={columnDefs}
        rowSelection={rowSelection}
        onSelectionChanged={handleSelectionChanged}
        loading={loading}
        searchPlaceholder="Search curriculum..."
        overlayNoRowsTemplate="<span>No released training forms in curriculum.</span>"
        toolbarActions={
          <>
            <button
              type="button"
              className="parts-btn primary"
              onClick={openAssignDialog}
              disabled={selectedIds.length !== 1}
            >
              Assign trainee
            </button>
            {selectedIds.length > 0 && (
              <span className="parts-selection-count">{selectedIds.length} selected</span>
            )}
          </>
        }
      />

      {assignDialog && (
        <div className="modal-overlay" onClick={closeAssignDialog}>
          <div
            className="modal modal-compact forms-delete-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Assign trainee</h3>
            <p className="forms-delete-message">
              Create a training assignment for <strong>{assignDialog.fmname}</strong> (Rev{" "}
              {assignDialog.fmrev || "1"}).
            </p>

            <div className="doc-form-fields">
              <label className="doc-form-field">
                <span className="doc-form-label">
                  Trainee<span className="doc-form-required">*</span>
                </span>
                <TraineeCombobox
                  users={users}
                  value={assignDraft.trainee}
                  onChange={(value) =>
                    setAssignDraft((prev) => ({ ...prev, trainee: value }))
                  }
                  loading={usersLoading}
                />
              </label>

              <label className="doc-form-field">
                <span className="doc-form-label">
                  Due date<span className="doc-form-required">*</span>
                </span>
                <input
                  type="datetime-local"
                  className="doc-form-control"
                  value={assignDraft.dueDate}
                  onChange={(event) =>
                    setAssignDraft((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="forms-delete-actions">
              <button
                type="button"
                className="parts-btn primary"
                onClick={confirmAssign}
                disabled={saving}
              >
                {saving ? "Assigning..." : "Assign"}
              </button>
              <button
                type="button"
                className="parts-btn"
                onClick={closeAssignDialog}
                disabled={saving}
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

export default TrainingCurriculum;
