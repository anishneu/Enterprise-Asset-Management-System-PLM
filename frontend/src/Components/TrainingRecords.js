import { useCallback, useEffect, useMemo, useState } from "react";

import apiClient from "../api/client";
import AppDataGrid from "./common/AppDataGrid";
import RecordActionsCellRenderer from "./common/RecordActionsCellRenderer";
import TrainingRecordStatusBadge from "./common/TrainingRecordStatusBadge";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { useAppFeedback } from "../context/AppFeedbackContext";
import keycloak from "../keycloak";
import { filterBySearch } from "../utils/filterBySearch";
import { formatTrainingDateTime, normalizeRecordStatus } from "../constants/trainingPlm";
import {
  DocFormRenderer,
  buildFieldValues,
  getDocFieldEntries,
  parseFormTemplate,
} from "./docs/docFormUtils";
import { normalizeFormField } from "./forms/formBuilderConstants";

import "./Docs.css";
import "./Training.css";

function buildRecordFormFields(templateFields, curriculumFielddata) {
  const template = templateFields.map((field) => normalizeFormField(field));
  const custom = (curriculumFielddata?.customFields || []).map((field) =>
    normalizeFormField(field)
  );
  const seen = new Set();
  return [...template, ...custom].filter((field) => {
    if (seen.has(field.id)) return false;
    seen.add(field.id);
    return true;
  });
}

function buildRecordFormValues(fields, recordFielddata, curriculumFielddata) {
  const saved = getDocFieldEntries({ fielddata: recordFielddata });
  const defaults = getDocFieldEntries({ fielddata: curriculumFielddata });
  const values = {};
  fields.forEach((field) => {
    const entry = saved.find((item) => item.id === field.id);
    const fallback = defaults.find((item) => item.id === field.id);
    if (entry) {
      values[field.id] = entry.value;
    } else if (fallback) {
      values[field.id] = fallback.value;
    } else if (field.type === "checkbox") {
      values[field.id] = false;
    } else if (field.type === "file") {
      values[field.id] = null;
    } else {
      values[field.id] = "";
    }
  });
  return values;
}

function RecordDetailSummary({ record }) {
  const startedAt = record.training_date || record.assigned_date;
  return (
    <dl className="training-record-detail">
      <div>
        <dt>Trainee</dt>
        <dd>{record.user_display}</dd>
      </div>
      <div>
        <dt>Code</dt>
        <dd>{record.curriculum_code || "—"}</dd>
      </div>
      <div>
        <dt>Curriculum</dt>
        <dd>
          {record.curriculum_name || "—"}
          {record.curriculum_revision ? ` (Rev ${record.curriculum_revision})` : ""}
        </dd>
      </div>
      <div>
        <dt>Training form</dt>
        <dd>{record.form_name || "—"}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>
          <TrainingRecordStatusBadge status={record.status} />
        </dd>
      </div>
      <div>
        <dt>Assigned</dt>
        <dd>{formatTrainingDateTime(record.assigned_date)}</dd>
      </div>
      <div>
        <dt>Due date</dt>
        <dd>{formatTrainingDateTime(record.due_date)}</dd>
      </div>
      <div>
        <dt>Started</dt>
        <dd>{formatTrainingDateTime(startedAt)}</dd>
      </div>
      <div>
        <dt>Completed</dt>
        <dd>{formatTrainingDateTime(record.completion_date)}</dd>
      </div>
      {record.remarks ? (
        <div>
          <dt>Remarks</dt>
          <dd>{record.remarks}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function TrainingRecords({ searchText = "" }) {
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();
  const currentUserId = keycloak.tokenParsed?.sub || "";

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [detail, setDetail] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [remarks, setRemarks] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/training-plm/records");
      setRecords(res.data || []);
    } catch (err) {
      feedback.error("Failed to load training records.");
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filtered = useMemo(
    () =>
      filterBySearch(records, searchText, [
        "user_display",
        "curriculum_code",
        "curriculum_name",
        "curriculum_revision",
        "course_code",
        "form_name",
        "status",
        "trainer",
      ]),
    [records, searchText]
  );

  const closeModal = useCallback(() => {
    if (saving) return;
    setModalMode(null);
    setDetail(null);
    setFormFields([]);
    setFormValues({});
    setRemarks("");
  }, [saving]);

  const loadRecord = useCallback(
    async (record, mode) => {
      try {
        const res = await apiClient.get(`/training-plm/records/${record.id}`);
        const loaded = res.data || record;
        if (mode === "train" && loaded.user_id !== currentUserId) {
          feedback.error("Only the assigned trainee can open training for this record.");
          return;
        }
        if (
          mode === "train" &&
          normalizeRecordStatus(loaded.status) === "Completed"
        ) {
          feedback.error("This training is already completed.");
          return;
        }
        setDetail(loaded);
        setRemarks(loaded.remarks || "");
        setModalMode(mode);
      } catch (err) {
        feedback.error("Failed to load training record.");
      }
    },
    [currentUserId, feedback]
  );

  const recordGridContext = useMemo(
    () => ({
      currentUserId,
      onViewRecord: (row) => loadRecord(row, "view"),
      onOpenTraining: (row) => loadRecord(row, "train"),
    }),
    [currentUserId, loadRecord]
  );

  useEffect(() => {
    setInsight({
      recordCount: filtered.length,
      selectedCount: detail ? 1 : 0,
      auditEntity: detail
        ? {
            type: "training",
            id: detail.id,
            label: detail.curriculum_name || detail.course_name,
            revision: detail.curriculum_revision || detail.course_revision,
          }
        : null,
    });
  }, [filtered.length, detail, setInsight]);

  useEffect(() => {
    const formId = detail?.form_id;
    if (!formId) {
      setFormFields([]);
      setFormValues({});
      return undefined;
    }

    let cancelled = false;
    setFormLoading(true);
    apiClient
      .get(`/forms/${formId}`)
      .then((res) => {
        if (cancelled) return;
        const template = parseFormTemplate(res.data?.fmjson);
        const fields = buildRecordFormFields(template.fields, detail.curriculum_fielddata);
        setFormFields(fields);
        setFormValues(
          buildRecordFormValues(fields, detail.fielddata, detail.curriculum_fielddata)
        );
      })
      .catch(() => {
        if (!cancelled) {
          setFormFields([]);
          setFormValues({});
        }
      })
      .finally(() => {
        if (!cancelled) setFormLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [detail]);

  const persistTraining = async (submitAction) => {
    if (!detail || modalMode !== "train") return;
    setSaving(true);
    try {
      const payload = {
        submit_action: submitAction,
        remarks: remarks.trim() || null,
      };

      if (detail.form_id && formFields.length > 0) {
        payload.fielddata = {
          formId: detail.form_id,
          values: buildFieldValues(formFields, formValues),
        };
      }

      await apiClient.put(`/training-plm/records/${detail.id}`, payload);
      feedback.success(
        submitAction === "submit"
          ? "Training submitted and marked completed."
          : "Training saved. You can return to finish and submit later."
      );
      setSaving(false);
      setModalMode(null);
      setDetail(null);
      setFormFields([]);
      setFormValues({});
      setRemarks("");
      await fetchRecords();
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to update record.");
    } finally {
      setSaving(false);
    }
  };

  const columnDefs = useMemo(
    () => [
      {
        field: "updated_at",
        colId: "updated_at",
        hide: true,
        sort: "desc",
        sortIndex: 0,
      },
      {
        field: "curriculum_code",
        headerName: "Code",
        flex: 0,
        width: 110,
        minWidth: 96,
        tooltipField: "curriculum_code",
        valueFormatter: (params) => params.value?.trim() || "—",
      },
      {
        field: "curriculum_name",
        headerName: "Curriculum",
        flex: 1.4,
        minWidth: 220,
        tooltipField: "curriculum_name",
        valueFormatter: (params) => params.value?.trim() || "—",
      },
      {
        field: "user_display",
        headerName: "Trainee",
        flex: 0,
        width: 140,
        minWidth: 120,
        tooltipField: "user_display",
      },
      {
        field: "curriculum_revision",
        headerName: "Revision",
        flex: 0,
        width: 100,
        minWidth: 92,
        valueFormatter: (params) => params.value?.trim() || "—",
      },
      {
        field: "assigned_date",
        headerName: "Assigned",
        flex: 0,
        width: 168,
        minWidth: 156,
        cellClass: "training-datetime-cell",
        valueFormatter: (params) => formatTrainingDateTime(params.value),
        tooltipValueGetter: (params) => formatTrainingDateTime(params.value),
      },
      {
        field: "due_date",
        headerName: "Due date",
        flex: 0,
        width: 168,
        minWidth: 156,
        cellClass: "training-datetime-cell",
        valueFormatter: (params) => formatTrainingDateTime(params.value),
        tooltipValueGetter: (params) => formatTrainingDateTime(params.value),
      },
      {
        field: "completion_date",
        headerName: "Completed",
        flex: 0,
        width: 168,
        minWidth: 156,
        cellClass: "training-datetime-cell",
        valueFormatter: (params) => formatTrainingDateTime(params.value),
        tooltipValueGetter: (params) => formatTrainingDateTime(params.value),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0,
        width: 132,
        minWidth: 120,
        cellClass: "training-status-cell",
        cellRenderer: (params) => <TrainingRecordStatusBadge status={params.value} />,
      },
      {
        colId: "actions",
        headerName: "Actions",
        flex: 0,
        width: 136,
        minWidth: 128,
        maxWidth: 148,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellClass: "training-actions-col",
        cellRenderer: RecordActionsCellRenderer,
      },
    ],
    []
  );

  const isTrainMode = modalMode === "train";
  const modalTitle = isTrainMode ? "Open training" : "View record";

  return (
    <div className="training-plm-page training-records-page grid-page">
      <div className="training-plm-grid-wrap">
        <AppDataGrid
          rowData={filtered}
          columnDefs={columnDefs}
          context={recordGridContext}
          loading={loading}
          showSerialColumn
          getRowId={(params) => String(params.data.id)}
          searchPlaceholder="Search training records..."
          toolbarInstructions="View any assignment with the eye icon. Only the assigned trainee sees Open training to fill the form—Save keeps it in progress; Submit marks it completed."
          toolbarActions={
            <button type="button" className="parts-btn" onClick={fetchRecords} disabled={loading}>
              Refresh
            </button>
          }
        />
      </div>

      {detail && modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal training-plm-modal training-plm-modal--wide training-plm-modal--record"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="training-modal-header">
              <h3>{modalTitle}</h3>
              <button
                type="button"
                className="training-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
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
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>

            <div className="training-modal-body">
              <RecordDetailSummary record={detail} />

              {detail.form_id ? (
                <div className="training-plm-form-section">
                  <h4>Training form</h4>
                  {isTrainMode ? (
                    <p className="training-plm-section-hint">
                      Fill in your training responses. Save to continue later or Submit when finished.
                    </p>
                  ) : (
                    <p className="training-plm-section-hint">Read-only view of submitted responses.</p>
                  )}
                  {formLoading ? (
                    <p className="training-plm-empty">Loading form…</p>
                  ) : formFields.length === 0 ? (
                    <p className="training-plm-empty">Form template not available.</p>
                  ) : (
                    <div className="doc-form-fields">
                      <DocFormRenderer
                        fields={formFields}
                        values={formValues}
                        readOnly={!isTrainMode}
                        onChange={(fieldId, value) =>
                          setFormValues((prev) => ({ ...prev, [fieldId]: value }))
                        }
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="training-plm-empty">No training form is linked to this record.</p>
              )}

              {isTrainMode && (
                <div className="training-plm-form-section">
                  <label>
                    Remarks
                    <textarea
                      rows={2}
                      value={remarks}
                      placeholder="Optional notes for this training"
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="training-modal-footer modal-actions">
              {isTrainMode ? (
                <>
                  <button type="button" className="parts-btn" onClick={closeModal} disabled={saving}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="parts-btn"
                    onClick={() => persistTraining("save")}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="parts-btn primary"
                    onClick={() => persistTraining("submit")}
                    disabled={saving}
                  >
                    {saving ? "Submitting…" : "Submit"}
                  </button>
                </>
              ) : (
                <button type="button" className="parts-btn" onClick={closeModal}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingRecords;
