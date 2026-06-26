import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DocFormRenderer,
  buildFieldValues,
  getDocFieldEntries,
  parseFormTemplate,
} from "./docs/docFormUtils";
import AppDataGrid from "./common/AppDataGrid";
import TraineeCombobox from "./common/TraineeCombobox";
import TrainingCompletionBadge from "./common/TrainingCompletionBadge";
import TrainingDetailRowRenderer from "./common/TrainingDetailRowRenderer";
import TrainingDisapproveCellRenderer from "./common/TrainingDisapproveCellRenderer";
import TrainingDocTitleCellRenderer from "./common/TrainingDocTitleCellRenderer";
import { multiRowSelection } from "./common/gridHelpers";
import apiClient from "../api/client";
import {
  INITIAL_COMPLETION_STATUS,
  TRAINING_FORM_TYPE,
  completionStatusHelpText,
} from "../constants/trainingCatalog";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { useAppFeedback } from "../context/AppFeedbackContext";
import { filterBySearch } from "../utils/filterBySearch";

import "./Docs.css";
import "./Training.css";

const emptyCreateSetup = {
  formId: "",
  trainee: "",
  dueDate: "",
};

function formatDateTime(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function Training({ searchText = "" }) {
  const [training, setTraining] = useState([]);
  const [trainingForms, setTrainingForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formDetailLoading, setFormDetailLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("list");
  const [createSetup, setCreateSetup] = useState(emptyCreateSetup);
  const [fillDraft, setFillDraft] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [expandedTrainingId, setExpandedTrainingId] = useState(null);
  const [activeTrainingId, setActiveTrainingId] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [assignDialog, setAssignDialog] = useState(null);
  const [assignTrainee, setAssignTrainee] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();

  const rowSelection = useMemo(() => multiRowSelection, []);

  const activeTraining = useMemo(
    () => training.find((record) => record.id === activeTrainingId) || null,
    [training, activeTrainingId]
  );

  const filteredTraining = useMemo(
    () =>
      filterBySearch(training, searchText, [
        "id",
        "title",
        "completionstatus",
        "trainee",
        "assigndate",
        "duedate",
      ]),
    [training, searchText]
  );

  const gridRows = useMemo(() => {
    const rows = [];

    filteredTraining.forEach((record) => {
      rows.push(record);
      if (expandedTrainingId === record.id) {
        rows.push({
          id: `detail-${record.id}`,
          detailRow: true,
          record,
        });
      }
    });

    return rows;
  }, [filteredTraining, expandedTrainingId]);

  const fetchTraining = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/training");
      setTraining(res.data);
    } catch (err) {
      console.error(err);
      feedback.error("Failed to load training records.");
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

  const fetchTrainingForms = async () => {
    setFormsLoading(true);
    try {
      const res = await apiClient.get("/forms/", {
        params: { ftype: TRAINING_FORM_TYPE },
      });
      setTrainingForms(res.data);
    } catch (err) {
      console.error(err);
      setTrainingForms([]);
      feedback.error("Failed to load training forms.");
    } finally {
      setFormsLoading(false);
    }
  };

  const handleDisapprove = useCallback(
    async (record) => {
      const confirmed = window.confirm(
        `Remove training record #${record.id} for "${record.title}"?`
      );
      if (!confirmed) return;

      try {
        await apiClient.delete(`/training/${record.id}`);
        if (expandedTrainingId === record.id) {
          setExpandedTrainingId(null);
        }
        if (activeTrainingId === record.id) {
          setActiveTrainingId(null);
        }
        await fetchTraining();
      } catch (err) {
        console.error(err);
        feedback.error(err.response?.data?.detail || "Failed to remove training record.");
      }
    },
    [fetchTraining, expandedTrainingId, activeTrainingId, feedback]
  );

  const handleToggleExpand = useCallback((trainingId) => {
    setExpandedTrainingId((current) => (current === trainingId ? null : trainingId));
    setActiveTrainingId(trainingId);
  }, []);

  const handleRowClicked = useCallback((event) => {
    if (event.data?.detailRow) return;
    setActiveTrainingId(event.data.id);
  }, []);

  const updateCompletionStatus = useCallback(
    async (trainingId, completionstatus) => {
      const record = training.find((item) => item.id === trainingId);
      if (!record || record.completionstatus === completionstatus) return;

      setStatusSaving(true);
      try {
        await apiClient.put(`/training/${trainingId}`, {
          title: record.title,
          completionstatus,
        });
        await fetchTraining();
      } catch (err) {
        console.error(err);
        feedback.error(err.response?.data?.detail || "Failed to update completion status.");
      } finally {
        setStatusSaving(false);
      }
    },
    [training, fetchTraining, feedback]
  );

  const gridContext = useMemo(
    () => ({
      expandedTrainingId,
      onToggleExpand: handleToggleExpand,
      onDisapprove: handleDisapprove,
    }),
    [expandedTrainingId, handleToggleExpand, handleDisapprove]
  );

  const getTrainingRowClass = useCallback(
    (params) => {
      if (params.data?.detailRow) return "doc-row-detail-wrapper";
      return params.data?.id === expandedTrainingId ? "doc-row-active" : "";
    },
    [expandedTrainingId]
  );

  const getTrainingRowId = useCallback((params) => {
    const row = params.data;
    return row.detailRow ? `detail-${row.record.id}` : String(row.id);
  }, []);

  const isTrainingFullWidthRow = useCallback(
    (params) => Boolean(params.rowNode?.data?.detailRow),
    []
  );

  const getTrainingRowHeight = useCallback((params) => {
    const row = params.node?.data ?? params.data;
    if (row?.detailRow) {
      const fieldCount = getDocFieldEntries({ fielddata: row.record?.fielddata }).length;
      return Math.min(520, 260 + fieldCount * 28);
    }
    return 52;
  }, []);

  const isTrainingRowSelectable = useCallback(
    (params) => !params.rowNode?.data?.detailRow,
    []
  );

  const columnDefs = useMemo(
    () => [
      {
        field: "id",
        headerName: "Training ID",
        maxWidth: 120,
        valueGetter: (params) => (params.data?.detailRow ? "" : params.data.id),
      },
      {
        field: "title",
        headerName: "Form",
        minWidth: 200,
        flex: 1.2,
        cellRenderer: TrainingDocTitleCellRenderer,
      },
      {
        field: "trainee",
        headerName: "Trainee",
        minWidth: 160,
        valueGetter: (params) => (params.data?.detailRow ? "" : params.data.trainee || "—"),
      },
      {
        field: "assigndate",
        headerName: "Assign Date",
        minWidth: 180,
        valueGetter: (params) => (params.data?.detailRow ? "" : params.data.assigndate),
        valueFormatter: (params) => formatDateTime(params.value),
      },
      {
        field: "duedate",
        headerName: "Due Date",
        minWidth: 180,
        valueGetter: (params) => (params.data?.detailRow ? "" : params.data.duedate),
        valueFormatter: (params) => formatDateTime(params.value),
      },
      {
        field: "completionstatus",
        headerName: "Completion",
        minWidth: 150,
        valueGetter: (params) =>
          params.data?.detailRow ? "" : params.data.completionstatus || INITIAL_COMPLETION_STATUS,
        cellRenderer: (params) => {
          if (params.data?.detailRow) return "";
          return <TrainingCompletionBadge status={params.data?.completionstatus} />;
        },
      },
      {
        headerName: "Disapprove",
        colId: "disapprove",
        maxWidth: 140,
        sortable: false,
        filter: false,
        cellRenderer: TrainingDisapproveCellRenderer,
      },
    ],
    []
  );

  useEffect(() => {
    fetchTraining();
  }, [fetchTraining]);

  useEffect(() => {
    if (view !== "list") return;

    setInsight({
      recordCount: filteredTraining.length,
      selectedCount: activeTrainingId ? 1 : 0,
      trainingDetail: activeTraining
        ? {
            id: activeTraining.id,
            title: activeTraining.title,
            trainee: activeTraining.trainee || "—",
            completionstatus: activeTraining.completionstatus || INITIAL_COMPLETION_STATUS,
            assigndate: activeTraining.assigndate,
            duedate: activeTraining.duedate,
          }
        : null,
      onTrainingStatusChange: updateCompletionStatus,
      trainingStatusSaving: statusSaving,
    });
  }, [
    filteredTraining.length,
    view,
    activeTrainingId,
    activeTraining,
    updateCompletionStatus,
    statusSaving,
    setInsight,
  ]);

  const openCreateSetup = () => {
    setCreateSetup(emptyCreateSetup);
    setView("create-setup");
    fetchTrainingForms();
    if (users.length === 0) {
      fetchUsers();
    }
  };

  const openAssignDialog = () => {
    if (selectedIds.length !== 1) {
      feedback.error("Select exactly one training record to assign a trainee.");
      return;
    }

    const record = training.find((item) => item.id === selectedIds[0]);
    if (!record) {
      feedback.error("Selected training record was not found.");
      return;
    }

    setAssignTrainee(record.trainee || "");
    setAssignDialog(record);
    if (users.length === 0) {
      fetchUsers();
    }
  };

  const closeAssignDialog = () => {
    if (assignSaving) return;
    setAssignDialog(null);
    setAssignTrainee("");
  };

  const confirmAssignTrainee = async () => {
    if (!assignDialog) return;

    if (!assignTrainee.trim()) {
      feedback.error("Select a trainee.");
      return;
    }

    setAssignSaving(true);
    try {
      await apiClient.put(`/training/${assignDialog.id}`, {
        title: assignDialog.title,
        trainee: assignTrainee.trim(),
        assigndate: assignDialog.assigndate || new Date().toISOString(),
        duedate: assignDialog.duedate,
        completionstatus: assignDialog.completionstatus || INITIAL_COMPLETION_STATUS,
        fid: assignDialog.fid,
        rev: assignDialog.rev || "1",
        fielddata: assignDialog.fielddata,
      });
      await fetchTraining();
      closeAssignDialog();
      setSelectedIds([]);
      feedback.success("Trainee assigned successfully.");
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to assign trainee.");
    } finally {
      setAssignSaving(false);
    }
  };

  const handleSelectionChanged = useCallback((event) => {
    const ids = event.api.getSelectedRows().map((row) => row.id);
    setSelectedIds(ids);
  }, []);

  const cancelCreate = () => {
    setView("list");
    setCreateSetup(emptyCreateSetup);
    setFillDraft(null);
    setFieldValues({});
  };

  const continueToFill = async () => {
    if (!createSetup.formId) {
      feedback.error("Select a form.");
      return;
    }
    if (!createSetup.dueDate) {
      feedback.error("Select a due date and time.");
      return;
    }
    if (!createSetup.trainee.trim()) {
      feedback.error("Select a trainee.");
      return;
    }

    setFormDetailLoading(true);
    try {
      const res = await apiClient.get(`/forms/${createSetup.formId}`);
      const selectedForm = res.data;

      if (selectedForm.ftype !== TRAINING_FORM_TYPE) {
        feedback.error("Selected form is not a Training form.");
        return;
      }

      const template = parseFormTemplate(selectedForm.fmjson);
      const initialValues = {};
      template.fields.forEach((field) => {
        initialValues[field.id] = field.type === "checkbox" ? false : "";
      });

      setFillDraft({
        formId: selectedForm.id,
        formName: selectedForm.fmname,
        trainee: createSetup.trainee.trim(),
        dueDate: createSetup.dueDate,
        fields: template.fields,
      });
      setFieldValues(initialValues);
      setView("create-fill");
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to load the selected form.");
    } finally {
      setFormDetailLoading(false);
    }
  };

  const handleFieldChange = useCallback((fieldId, value) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const validateFillForm = () => {
    if (!fillDraft) return false;

    for (const field of fillDraft.fields) {
      if (!field.required) continue;
      const value = fieldValues[field.id];
      if (field.type === "checkbox") {
        if (!value) return false;
      } else if (value === null || value === undefined || String(value).trim() === "") {
        return false;
      }
    }

    return true;
  };

  const createTraining = async () => {
    if (!fillDraft || !validateFillForm()) {
      feedback.error("Fill in all required fields before creating the training record.");
      return;
    }

    const payload = {
      fid: Number(fillDraft.formId),
      title: fillDraft.formName,
      rev: "1",
      trainee: fillDraft.trainee,
      duedate: new Date(fillDraft.dueDate).toISOString(),
      completionstatus: INITIAL_COMPLETION_STATUS,
      fielddata: {
        formId: fillDraft.formId,
        values: buildFieldValues(fillDraft.fields, fieldValues),
      },
    };

    setSaving(true);
    try {
      await apiClient.post("/training/", payload);
      await fetchTraining();
      cancelCreate();
      feedback.success("Training record created and assigned.");
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to create training record.");
    } finally {
      setSaving(false);
    }
  };

  if (view === "create-setup") {
    return (
      <div className="training-assign-fill">
        <header className="doc-create-header">
          <div>
            <h3>Create training record</h3>
            <p className="forms-muted">
              Assign a trainee and due date. Completion starts as Pending (updated in Records).
            </p>
          </div>
          <div className="doc-create-actions">
            <button type="button" className="parts-btn" onClick={cancelCreate}>
              Cancel
            </button>
            <button
              type="button"
              className="parts-btn primary"
              onClick={continueToFill}
              disabled={formDetailLoading}
            >
              {formDetailLoading ? "Loading..." : "Continue"}
            </button>
          </div>
        </header>

        <div className="training-assign-body">
          <div className="doc-form-fields">
            <label className="doc-form-field">
              <span className="doc-form-label">
                Form<span className="doc-form-required">*</span>
              </span>
              <select
                className="doc-form-control"
                value={createSetup.formId}
                onChange={(e) =>
                  setCreateSetup((prev) => ({ ...prev, formId: e.target.value }))
                }
                disabled={formsLoading}
              >
                <option value="">
                  {formsLoading ? "Loading forms..." : "Select an option"}
                </option>
                {trainingForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.fmname} (ID: {form.id})
                  </option>
                ))}
              </select>
            </label>

            <label className="doc-form-field">
              <span className="doc-form-label">
                Trainee<span className="doc-form-required">*</span>
              </span>
              <TraineeCombobox
                users={users}
                value={createSetup.trainee}
                onChange={(value) =>
                  setCreateSetup((prev) => ({ ...prev, trainee: value }))
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
                value={createSetup.dueDate}
                onChange={(e) =>
                  setCreateSetup((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </label>

            <label className="doc-form-field">
              <span className="doc-form-label">Initial completion status</span>
              <input
                className="doc-form-control training-readonly"
                value={INITIAL_COMPLETION_STATUS}
                readOnly
                aria-readonly="true"
              />
              <span className="forms-muted training-field-hint">
                {completionStatusHelpText()}
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (view === "create-fill" && fillDraft) {
    return (
      <div className="doc-create-fill">
        <header className="doc-create-header">
          <div>
            <h3>Create training</h3>
            <p className="forms-muted">Complete the training form fields below.</p>
            <div className="doc-create-meta">
              <span className="doc-create-pill">Form: {fillDraft.formName}</span>
              <span className="doc-create-pill">Trainee: {fillDraft.trainee}</span>
              <span className="doc-create-pill">
                Due: {formatDateTime(fillDraft.dueDate)}
              </span>
              <span className="doc-create-pill">Status: {INITIAL_COMPLETION_STATUS}</span>
            </div>
          </div>
          <div className="doc-create-actions">
            <button type="button" className="parts-btn" onClick={cancelCreate} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="parts-btn primary"
              onClick={createTraining}
              disabled={saving}
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </header>

        <div className="doc-create-body">
          <DocFormRenderer
            fields={fillDraft.fields}
            values={fieldValues}
            onChange={handleFieldChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid-page">
      <p className="forms-muted forms-revision-hint">{completionStatusHelpText()}</p>
      <AppDataGrid
        rowData={gridRows}
        columnDefs={columnDefs}
        context={gridContext}
        rowSelection={rowSelection}
        onSelectionChanged={handleSelectionChanged}
        onRowClicked={handleRowClicked}
        getRowClass={getTrainingRowClass}
        getRowId={getTrainingRowId}
        isFullWidthRow={isTrainingFullWidthRow}
        fullWidthCellRenderer={TrainingDetailRowRenderer}
        getRowHeight={getTrainingRowHeight}
        isRowSelectable={isTrainingRowSelectable}
        loading={loading}
        searchPlaceholder="Search training..."
        overlayNoRowsTemplate="<span>No training records found.</span>"
        toolbarActions={
          <>
            <button type="button" className="parts-btn primary" onClick={openCreateSetup}>
              Create
            </button>
            <button
              type="button"
              className="parts-btn"
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
              Assign a trainee to <strong>{assignDialog.title}</strong> (ID {assignDialog.id}).
            </p>
            <label className="doc-form-field">
              <span className="doc-form-label">
                Trainee<span className="doc-form-required">*</span>
              </span>
              <TraineeCombobox
                users={users}
                value={assignTrainee}
                onChange={setAssignTrainee}
                loading={usersLoading}
              />
            </label>
            <div className="forms-delete-actions">
              <button
                type="button"
                className="parts-btn primary"
                onClick={confirmAssignTrainee}
                disabled={assignSaving}
              >
                {assignSaving ? "Saving..." : "Assign"}
              </button>
              <button
                type="button"
                className="parts-btn"
                onClick={closeAssignDialog}
                disabled={assignSaving}
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

export default Training;
