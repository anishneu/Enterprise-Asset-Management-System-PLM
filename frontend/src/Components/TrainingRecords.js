import { useCallback, useEffect, useMemo, useState } from "react";



import apiClient from "../api/client";

import AppDataGrid from "./common/AppDataGrid";

import RecordViewCellRenderer from "./common/RecordViewCellRenderer";

import TrainingRecordStatusBadge from "./common/TrainingRecordStatusBadge";

import { usePageInsight } from "./dashboard/PageInsightContext";

import { useAppFeedback } from "../context/AppFeedbackContext";

import { filterBySearch } from "../utils/filterBySearch";

import {

  RECORD_STATUSES,

  dateInputToIso,

  formatTrainingDateTime,

  toDateInputValue,

} from "../constants/trainingPlm";

import {

  DocFormRenderer,

  buildFieldValues,

  getDocFieldEntries,

  parseFormTemplate,

} from "./docs/docFormUtils";

import { normalizeFormField } from "./forms/formBuilderConstants";



import "./Docs.css";

import "./Training.css";



function buildInitialFormValues(fields, fielddata) {

  const saved = getDocFieldEntries({ fielddata });

  const values = {};

  fields.forEach((field) => {

    const entry = saved.find((item) => item.id === field.id);

    if (entry) {

      values[field.id] = entry.value;

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



function TrainingRecords({ searchText = "" }) {

  const { setInsight } = usePageInsight();

  const feedback = useAppFeedback();

  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(false);

  const [detail, setDetail] = useState(null);

  const [formFields, setFormFields] = useState([]);

  const [formValues, setFormValues] = useState({});

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

        "course_code",

        "course_name",

        "curriculum_name",

        "form_name",

        "status",

        "trainer",

      ]),

    [records, searchText]

  );



  useEffect(() => {

    setInsight({

      recordCount: filtered.length,

      selectedCount: detail ? 1 : 0,

      auditEntity: detail

        ? {

            type: "training",

            id: detail.id,

            label: detail.course_name,

            revision: detail.course_revision,

          }

        : null,

    });

  }, [filtered.length, detail, setInsight]);



  const openDetail = useCallback((record) => setDetail({ ...record }), []);



  const recordGridContext = useMemo(

    () => ({

      onViewRecord: openDetail,

    }),

    [openDetail]

  );



  useEffect(() => {

    if (!detail?.form_id) {

      setFormFields([]);

      setFormValues({});

      return;

    }



    let cancelled = false;

    setFormLoading(true);

    apiClient

      .get(`/forms/${detail.form_id}`)

      .then((res) => {

        if (cancelled) return;

        const template = parseFormTemplate(res.data?.fmjson);

        setFormFields(template.fields.map((field) => normalizeFormField(field)));

        setFormValues(buildInitialFormValues(template.fields, detail.fielddata));

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



  const saveDetail = async () => {

    if (!detail) return;

    setSaving(true);

    try {

      const payload = {

        status: detail.status,

        trainer: detail.trainer || null,

        score: detail.score === "" || detail.score == null ? null : Number(detail.score),

        training_date: dateInputToIso(detail.training_date),

        completion_date: dateInputToIso(detail.completion_date),

        remarks: detail.remarks || null,

      };



      if (detail.form_id && formFields.length > 0) {

        payload.fielddata = {

          formId: detail.form_id,

          values: buildFieldValues(formFields, formValues),

        };

      }



      await apiClient.put(`/training-plm/records/${detail.id}`, payload);

      feedback.success("Training record updated.");

      setDetail(null);

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

        field: "user_display",

        headerName: "Trainee",

        flex: 0,

        width: 140,

        minWidth: 120,

        tooltipField: "user_display",

      },

      { field: "course_code", headerName: "Code", flex: 0, width: 100, minWidth: 90 },

      {

        field: "course_name",

        headerName: "Course",

        flex: 1,

        minWidth: 200,

        tooltipField: "course_name",

      },

      {

        field: "form_name",

        headerName: "Form",

        flex: 0,

        width: 120,

        minWidth: 100,

        tooltipField: "form_name",

        valueFormatter: (params) => params.value?.trim() || "—",

      },

      {

        field: "curriculum_name",

        headerName: "Curriculum",

        flex: 0,

        width: 130,

        minWidth: 110,

        tooltipField: "curriculum_name",

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

        field: "status",

        headerName: "Status",

        flex: 0,

        width: 120,

        minWidth: 110,

        cellClass: "training-status-cell",

        cellRenderer: (params) => <TrainingRecordStatusBadge status={params.value} />,

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

        headerName: "Actions",

        flex: 0,

        width: 72,

        minWidth: 68,

        maxWidth: 80,

        sortable: false,

        filter: false,

        cellClass: "training-actions-col",

        cellRenderer: RecordViewCellRenderer,

      },

    ],

    []

  );



  return (

    <div className="training-plm-page training-records-page grid-page">

      <div className="training-plm-toolbar">

        <div>

          <h3 className="training-plm-title">Training records</h3>

          <p className="training-plm-lead">

            Track assignments, training form responses, and completion dates.

          </p>

        </div>

        <button type="button" className="parts-btn" onClick={fetchRecords} disabled={loading}>

          Refresh

        </button>

      </div>



      <div className="training-plm-grid-wrap">

        <AppDataGrid

          rowData={filtered}

          columnDefs={columnDefs}

          context={recordGridContext}

          loading={loading}

          showSerialColumn

          getRowId={(params) => String(params.data.id)}

        />

      </div>



      {detail && (

        <div className="modal-overlay" onClick={() => !saving && setDetail(null)}>

          <div

            className="modal training-plm-modal training-plm-modal--wide training-plm-modal--record"

            onClick={(e) => e.stopPropagation()}

          >

            <header className="training-modal-header">
              <h3>Training record</h3>
              <button
                type="button"
                className="training-modal-close"
                onClick={() => !saving && setDetail(null)}
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

            <dl className="training-record-detail">

              <div>

                <dt>Trainee</dt>

                <dd>{detail.user_display}</dd>

              </div>

              <div>

                <dt>Course</dt>

                <dd>

                  {detail.course_name} (Rev {detail.course_revision})

                </dd>

              </div>

              <div>

                <dt>Training form</dt>

                <dd>{detail.form_name || "—"}</dd>

              </div>

              <div>

                <dt>Curriculum</dt>

                <dd>{detail.curriculum_name || "—"}</dd>

              </div>

              <div>

                <dt>Assigned</dt>

                <dd>{formatTrainingDateTime(detail.assigned_date)}</dd>

              </div>

              <div>

                <dt>Due date</dt>

                <dd>{formatTrainingDateTime(detail.due_date)}</dd>

              </div>

            </dl>



            {detail.form_id && (

              <div className="training-plm-form-section">

                <h4>Training form responses</h4>

                <p className="training-plm-section-hint">

                  Enter answers here for each assigned trainee. Dropdown options come from the form template

                  in Forms Builder.

                </p>

                {formLoading ? (

                  <p className="training-plm-empty">Loading form…</p>

                ) : formFields.length === 0 ? (

                  <p className="training-plm-empty">Form template not available.</p>

                ) : (

                  <div className="doc-form-fields">

                    <DocFormRenderer

                      fields={formFields}

                      values={formValues}

                      onChange={(fieldId, value) =>

                        setFormValues((prev) => ({ ...prev, [fieldId]: value }))

                      }

                    />

                  </div>

                )}

              </div>

            )}



            <div className="training-plm-form-section">

              <h4>Completion</h4>

              <label>

                Status

                <select

                  value={detail.status || "Pending"}

                  onChange={(e) =>

                    setDetail((prev) => ({ ...prev, status: e.target.value }))

                  }

                >

                  {RECORD_STATUSES.map((status) => (

                    <option key={status} value={status}>

                      {status}

                    </option>

                  ))}

                </select>

              </label>

              <div className="training-plm-form-row">

                <label>

                  Training date

                  <input

                    type="date"

                    value={toDateInputValue(detail.training_date)}

                    onChange={(e) =>

                      setDetail((prev) => ({ ...prev, training_date: e.target.value }))

                    }

                  />

                </label>

                <label>

                  Completion date

                  <input

                    type="date"

                    value={toDateInputValue(detail.completion_date)}

                    onChange={(e) =>

                      setDetail((prev) => ({ ...prev, completion_date: e.target.value }))

                    }

                  />

                </label>

              </div>

              <label>

                Trainer

                <input

                  value={detail.trainer || ""}

                  placeholder="Assigned at course design; editable if needed"

                  onChange={(e) =>

                    setDetail((prev) => ({ ...prev, trainer: e.target.value }))

                  }

                />

              </label>

              <label>

                Score (%)

                <input

                  type="number"

                  min="0"

                  max="100"

                  value={detail.score ?? ""}

                  onChange={(e) =>

                    setDetail((prev) => ({ ...prev, score: e.target.value }))

                  }

                />

              </label>

              <label>

                Remarks

                <textarea

                  rows={2}

                  value={detail.remarks || ""}

                  onChange={(e) =>

                    setDetail((prev) => ({ ...prev, remarks: e.target.value }))

                  }

                />

              </label>

            </div>

            </div>



            <div className="training-modal-footer modal-actions">
              <button
                type="button"
                className="parts-btn primary"
                onClick={saveDetail}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>

          </div>

        </div>

      )}

    </div>

  );

}



export default TrainingRecords;

