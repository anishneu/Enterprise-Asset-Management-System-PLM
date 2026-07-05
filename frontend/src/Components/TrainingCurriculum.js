import { useCallback, useEffect, useMemo, useState } from "react";

import apiClient from "../api/client";
import AppDataGrid from "./common/AppDataGrid";
import ApproverBox from "./common/ApproverBox";
import CurriculumActionsCellRenderer from "./common/CurriculumActionsCellRenderer";
import CurriculumDocPreviewModal from "./common/CurriculumDocPreviewModal";
import CurriculumFormFieldsModal from "./common/CurriculumFormFieldsModal";
import TagMultiSelect from "./common/TagMultiSelect";
import WorkflowStatusBadge from "./common/WorkflowStatusBadge";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { useAppFeedback } from "../context/AppFeedbackContext";
import usePermission from "../hooks/usePermission";
import { TRAINING_FORM_TYPE } from "../constants/trainingCatalog";
import { formatWorkflowStatus } from "../constants/workflowCatalog";
import { nextRevision } from "../utils/revisionUtils";
import { filterBySearch } from "../utils/filterBySearch";
import { dateInputToIso, toDateInputValue } from "../constants/trainingPlm";
import {
  DocFormRenderer,
  formatDocDisplayName,
  getDocFieldEntries,
  parseFormTemplate,
} from "./docs/docFormUtils";
import { normalizeFormField } from "./forms/formBuilderConstants";

import "./Docs.css";
import "./Training.css";

const emptyCurriculumForm = {
  curriculum_code: "",
  curriculum_name: "",
  description: "",
  revision: "A",
  form_id: "",
  approver: "",
  effectiveDate: "",
  document_ids: [],
  fielddata: null,
  previewFields: [],
  previewValues: {},
};

const emptyAssign = {
  userIds: [],
  groupIds: [],
  dueDate: "",
};

function formatRevisionLabel(revision) {
  return revision?.trim() || "—";
}

function resolveApproverUsername(value, users = []) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  const byUsername = users.find((user) => user.username === trimmed);
  if (byUsername) return byUsername.username;
  const byId = users.find((user) => user.id === trimmed);
  return byId?.username || trimmed;
}

function resolveApproverUserId(value, users = []) {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  const byUsername = users.find((user) => user.username === trimmed);
  if (byUsername) return byUsername.id;
  const byId = users.find((user) => user.id === trimmed);
  return byId?.id || trimmed;
}

function curriculumToForm(detail, users = []) {
  const customFields = (detail.fielddata?.customFields || []).map((field) =>
    normalizeFormField(field)
  );
  const templateFieldIds = new Set();
  return {
    curriculum_code: detail.curriculum_code || "",
    curriculum_name: detail.curriculum_name || "",
    description: detail.description || "",
    revision: detail.revision || "A",
    form_id: detail.form_id ? String(detail.form_id) : "",
    approver: resolveApproverUsername(detail.approver_user_id || detail.approver_display, users),
    effectiveDate: toDateInputValue(detail.effective_date),
    document_ids: (detail.documents || []).map((item) => item.doc_id),
    fielddata: detail.fielddata || null,
    previewFields: customFields,
    previewValues: {},
    _templateFieldIds: templateFieldIds,
  };
}

function buildSharedPayload(form, users = []) {
  return {
    form_id: form.form_id === "" ? null : Number(form.form_id),
    approver_user_id: resolveApproverUserId(form.approver, users),
    effective_date: dateInputToIso(form.effectiveDate),
    document_ids: form.document_ids || [],
    fielddata: form.fielddata,
  };
}

function buildCreatePayload(form, users = []) {
  return {
    curriculum_code: form.curriculum_code.trim(),
    curriculum_name: form.curriculum_name.trim(),
    description: form.description.trim() || null,
    revision: form.revision?.trim() || "A",
    ...buildSharedPayload(form, users),
  };
}

function buildUpdatePayload(form, users = []) {
  return {
    curriculum_name: form.curriculum_name.trim(),
    description: form.description.trim() || null,
    revision: form.revision?.trim() || "A",
    ...buildSharedPayload(form, users),
  };
}

function CurriculumDocumentLinks({ documents = [], releasedDocuments = [], onPreview }) {
  if (!documents.length) {
    return <p className="training-curriculum-panel-hint">No linked documents.</p>;
  }

  return (
    <ul className="training-curriculum-doc-links">
      {documents.map((doc) => {
        const meta = releasedDocuments.find((item) => item.id === doc.doc_id);
        const label =
          doc.doc_name ||
          (meta ? formatDocDisplayName(meta) : null) ||
          `Document ${doc.doc_id}`;
        return (
          <li key={doc.doc_id}>
            <button type="button" className="doc-name-link" onClick={() => onPreview(doc.doc_id)}>
              {label}
              {doc.doc_revision ? ` (Rev ${doc.doc_revision})` : ""}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CurriculumFormPreviewShell({ formId, fields = [], values = {}, loading = false }) {
  if (!formId) return null;

  return (
    <div className="training-form-preview-shell">
      <div className="training-form-preview-shell-head">
        <div>
          <h4>Form preview</h4>
          <p>Read-only preview — use Configure form fields to edit responses.</p>
        </div>
        <span className="training-form-preview-badge">Preview</span>
      </div>
      {loading ? (
        <p className="training-plm-empty">Loading preview…</p>
      ) : fields.length === 0 ? (
        <p className="training-plm-empty">Select a form and configure fields to see a preview.</p>
      ) : (
        <div className="training-form-preview-shell-body doc-form-fields">
          <DocFormRenderer fields={fields} values={values} readOnly />
        </div>
      )}
    </div>
  );
}

function CurriculumFormPanel({
  form,
  setForm,
  trainingForms,
  releasedDocuments,
  users,
  usersLoading,
  optionsLoading,
  readOnly = false,
  lockIdentity = false,
  onPreviewDocument,
  onConfigureFormFields,
  previewLoading = false,
}) {
  const documentOptions = useMemo(
    () =>
      releasedDocuments.map((doc) => ({
        value: doc.id,
        label: formatDocDisplayName(doc),
      })),
    [releasedDocuments]
  );

  const selectedDocuments = useMemo(() => {
    return (form.document_ids || []).map((docId, index) => {
      const linked = releasedDocuments.find((item) => item.id === docId);
      return {
        doc_id: docId,
        doc_name: linked ? formatDocDisplayName(linked) : `Document ${docId}`,
        doc_revision: linked?.drev,
        sequence_order: index,
      };
    });
  }, [form.document_ids, releasedDocuments]);

  return (
    <div className="training-curriculum-definition">
      <div className="training-plm-form-row">
        <label>
          Code
          <input
            value={form.curriculum_code}
            disabled={readOnly || lockIdentity}
            onChange={(e) => setForm((prev) => ({ ...prev, curriculum_code: e.target.value }))}
          />
        </label>
        <label>
          Revision
          <input
            value={form.revision}
            disabled={readOnly || lockIdentity}
            placeholder="A, 1, 1.1"
            onChange={(e) => setForm((prev) => ({ ...prev, revision: e.target.value }))}
          />
        </label>
      </div>
      <p className="training-curriculum-panel-hint">
        Revision steps: A→B→C, or 1→1.1→1.2→1.5→2→2.1. Use Revise after release for the next step.
      </p>
      <label>
        Name
        <input
          value={form.curriculum_name}
          disabled={readOnly}
          onChange={(e) => setForm((prev) => ({ ...prev, curriculum_name: e.target.value }))}
        />
      </label>
      <label>
        Description
        <textarea
          rows={3}
          value={form.description}
          disabled={readOnly}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </label>
      <label>
        Training form
        <select
          value={form.form_id}
          disabled={readOnly || optionsLoading}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              form_id: e.target.value,
              fielddata: null,
              previewFields: [],
              previewValues: {},
            }))
          }
        >
          <option value="">
            {optionsLoading ? "Loading forms…" : "Select a training form"}
          </option>
          {trainingForms.map((trainingForm) => (
            <option key={trainingForm.id} value={trainingForm.id}>
              {trainingForm.fmname} (ID: {trainingForm.id})
            </option>
          ))}
        </select>
      </label>

      {form.form_id && !readOnly && (
        <div className="training-form-preview-actions">
          <button
            type="button"
            className="parts-btn"
            onClick={onConfigureFormFields}
            disabled={!form.form_id}
          >
            Configure form fields
          </button>
        </div>
      )}

      <CurriculumFormPreviewShell
        formId={form.form_id}
        fields={form.previewFields}
        values={form.previewValues}
        loading={previewLoading}
      />

      {!readOnly ? (
        <TagMultiSelect
          label="Linked documents (released)"
          options={documentOptions}
          value={form.document_ids}
          onChange={(document_ids) => setForm((prev) => ({ ...prev, document_ids }))}
          placeholder="Attach one or more documents"
          getOptionValue={(option) => option.value}
          getOptionLabel={(option) => option.label}
        />
      ) : (
        <div className="training-plm-form-section">
          <h4>Linked documents</h4>
          <CurriculumDocumentLinks
            documents={selectedDocuments}
            releasedDocuments={releasedDocuments}
            onPreview={onPreviewDocument}
          />
        </div>
      )}

      {!readOnly && selectedDocuments.length > 0 && (
        <div className="training-plm-form-section">
          <h4>Attached documents</h4>
          <CurriculumDocumentLinks
            documents={selectedDocuments}
            releasedDocuments={releasedDocuments}
            onPreview={onPreviewDocument}
          />
        </div>
      )}

      <ApproverBox
        optional
        compact
        approver={form.approver}
        effectiveDate={form.effectiveDate}
        onApproverChange={(value) => setForm((prev) => ({ ...prev, approver: value }))}
        onEffectiveDateChange={(value) => setForm((prev) => ({ ...prev, effectiveDate: value }))}
        users={users}
        usersLoading={usersLoading}
        disabled={readOnly}
      />
      <p className="training-curriculum-panel-hint">
        Optional reviewer. If set when saving a new curriculum, it is submitted for approval automatically.
        Otherwise use Send for review from the grid; approval is handled in the Approvals menu.
      </p>
    </div>
  );
}

function ViewCurriculumFormPreview({ formId, fielddata }) {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!formId) return undefined;
    let cancelled = false;
    setLoading(true);
    apiClient
      .get(`/forms/${formId}`)
      .then((res) => {
        if (cancelled) return;
        const template = parseFormTemplate(res.data?.fmjson);
        const templateFields = template.fields.map((field) => normalizeFormField(field));
        const customFields = (fielddata?.customFields || []).map((field) =>
          normalizeFormField(field)
        );
        const allFields = [...templateFields, ...customFields];
        const saved = getDocFieldEntries({ fielddata });
        const nextValues = {};
        allFields.forEach((field) => {
          const entry = saved.find((item) => item.id === field.id);
          if (entry) nextValues[field.id] = entry.value;
          else if (field.type === "checkbox") nextValues[field.id] = false;
          else if (field.type === "file") nextValues[field.id] = null;
          else nextValues[field.id] = "";
        });
        setFields(allFields);
        setValues(nextValues);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formId, fielddata]);

  return (
    <CurriculumFormPreviewShell formId={formId} fields={fields} values={values} loading={loading} />
  );
}

function hydratePreviewFromFormId(formId, fielddata, setForm) {
  if (!formId) return;
  apiClient.get(`/forms/${formId}`).then((res) => {
    const template = parseFormTemplate(res.data?.fmjson);
    const fields = template.fields.map((field) => normalizeFormField(field));
    const customFields = (fielddata?.customFields || []).map((field) =>
      normalizeFormField(field)
    );
    const allFields = [...fields, ...customFields];
    const values = {};
    const saved = getDocFieldEntries({ fielddata });
    allFields.forEach((field) => {
      const entry = saved.find((item) => item.id === field.id);
      if (entry) values[field.id] = entry.value;
      else if (field.type === "checkbox") values[field.id] = false;
      else if (field.type === "file") values[field.id] = null;
      else values[field.id] = "";
    });
    setForm((prev) => ({
      ...prev,
      previewFields: allFields,
      previewValues: values,
    }));
  });
}

function TrainingCurriculum({ searchText = "" }) {
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();
  const permission = usePermission();

  const [curricula, setCurricula] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [trainingForms, setTrainingForms] = useState([]);
  const [releasedDocuments, setReleasedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reviseTarget, setReviseTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewApprover, setReviewApprover] = useState("");
  const [reviewEffectiveDate, setReviewEffectiveDate] = useState("");
  const [formFieldsModal, setFormFieldsModal] = useState(null);
  const [previewDocId, setPreviewDocId] = useState(null);
  const [createForm, setCreateForm] = useState(emptyCurriculumForm);
  const [editForm, setEditForm] = useState(emptyCurriculumForm);
  const [assignForm, setAssignForm] = useState(emptyAssign);

  const fetchCurricula = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/training-plm/curricula");
      setCurricula(res.data || []);
    } catch (err) {
      feedback.error("Failed to load curricula.");
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const [usersRes, groupsRes] = await Promise.all([
        apiClient.get("/users"),
        apiClient.get("/groups"),
      ]);
      setUsers(usersRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchContentOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const [formsRes, docsRes] = await Promise.all([
        apiClient.get("/forms/", { params: { ftype: TRAINING_FORM_TYPE } }),
        apiClient.get("/docs"),
      ]);
      setTrainingForms(formsRes.data || []);
      setReleasedDocuments((docsRes.data || []).filter((doc) => doc.dstatus === "Released"));
    } catch (err) {
      console.error(err);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurricula();
    fetchUsers();
    fetchContentOptions();
  }, [fetchCurricula, fetchUsers, fetchContentOptions]);

  const filtered = useMemo(
    () =>
      filterBySearch(curricula, searchText, [
        "curriculum_code",
        "curriculum_name",
        "revision",
        "form_name",
        "status",
      ]),
    [curricula, searchText]
  );

  useEffect(() => {
    setInsight({ recordCount: filtered.length, selectedCount: viewDetail || editModal ? 1 : 0 });
  }, [filtered.length, viewDetail, editModal, setInsight]);

  useEffect(() => {
    if (!createModal || !createForm.form_id) return;
    hydratePreviewFromFormId(createForm.form_id, createForm.fielddata, setCreateForm);
  }, [createModal, createForm.form_id, createForm.fielddata]);

  useEffect(() => {
    if (!editModal || !editForm.form_id) return;
    hydratePreviewFromFormId(editForm.form_id, editForm.fielddata, setEditForm);
  }, [editModal, editForm.form_id, editForm.fielddata]);

  const loadCurriculum = useCallback(async (row) => {
    const res = await apiClient.get(`/training-plm/curricula/${row.id}`);
    return res.data || row;
  }, []);

  const openView = useCallback(
    async (row) => {
      try {
        const detail = await loadCurriculum(row);
        setViewDetail(detail);
      } catch (err) {
        feedback.error("Failed to load curriculum.");
      }
    },
    [feedback, loadCurriculum]
  );

  const openEdit = useCallback(
    async (row) => {
      try {
        const detail = await loadCurriculum(row);
        const nextForm = curriculumToForm(detail, users);
        setEditForm(nextForm);
        setEditModal(detail);
        hydratePreviewFromFormId(nextForm.form_id, nextForm.fielddata, setEditForm);
      } catch (err) {
        feedback.error("Failed to load curriculum.");
      }
    },
    [feedback, loadCurriculum, users]
  );

  const openAssign = useCallback(
    async (row) => {
      try {
        setAssignTarget(await loadCurriculum(row));
        setAssignForm(emptyAssign);
      } catch (err) {
        feedback.error("Failed to load curriculum.");
      }
    },
    [feedback, loadCurriculum]
  );

  const openReview = useCallback((row) => {
    setReviewTarget(row);
    setReviewApprover("");
    setReviewEffectiveDate("");
  }, []);

  const openRevise = useCallback((row) => {
    setReviseTarget(row);
  }, []);

  const gridContext = useMemo(
    () => ({
      canEditCurriculum: permission.canEditRecord,
      canDeleteCurriculum: permission.canDeleteRecord,
      onViewCurriculum: openView,
      onEditCurriculum: openEdit,
      onDeleteCurriculum: (row) => setDeleteTarget(row),
      onSubmitReview: openReview,
      onAssignCurriculum: openAssign,
      onReviseCurriculum: openRevise,
    }),
    [
      permission.canEditRecord,
      permission.canDeleteRecord,
      openView,
      openEdit,
      openAssign,
      openReview,
      openRevise,
    ]
  );

  const validateForm = (form, { requireCode = true } = {}) => {
    if (requireCode && !form.curriculum_code?.trim()) {
      feedback.error("Code and name are required.");
      return false;
    }
    if (!form.curriculum_name?.trim()) {
      feedback.error("Name is required.");
      return false;
    }
    if (!form.form_id) {
      feedback.error("Select a training form.");
      return false;
    }
    return true;
  };

  const applyFormFields = (mode, result) => {
    const updater = (prev) => ({
      ...prev,
      fielddata: result.fielddata,
      previewFields: result.previewFields,
      previewValues: result.previewValues,
    });
    if (mode === "create") setCreateForm(updater);
    else setEditForm(updater);
    setFormFieldsModal(null);
  };

  const createCurriculum = async () => {
    if (!validateForm(createForm)) return;
    const approver = createForm.approver?.trim();
    setSaving(true);
    try {
      const res = await apiClient.post("/training-plm/curricula", buildCreatePayload(createForm, users));
      const created = res.data;
      if (approver) {
        await apiClient.post(`/training-plm/curricula/${created.id}/submit-review`, {
          approver,
          effective_date: dateInputToIso(createForm.effectiveDate),
        });
        feedback.success("Curriculum submitted for approval. Track it under Approvals.");
      } else {
        feedback.success("Curriculum created as Draft.");
      }
      setCreateModal(false);
      setCreateForm(emptyCurriculumForm);
      await fetchCurricula();
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to create curriculum.");
    } finally {
      setSaving(false);
    }
  };

  const reviseCurriculum = async () => {
    if (!reviseTarget) return;
    const nextLabel = nextRevision(reviseTarget.revision || "A");
    setSaving(true);
    try {
      await apiClient.post(`/training-plm/curricula/${reviseTarget.id}/revise`);
      setReviseTarget(null);
      await fetchCurricula();
      feedback.success(`Curriculum updated to revision ${nextLabel} (Draft).`);
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to revise curriculum.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editModal || !validateForm(editForm, { requireCode: false })) return;
    setSaving(true);
    try {
      await apiClient.put(`/training-plm/curricula/${editModal.id}`, buildUpdatePayload(editForm, users));
      setEditModal(null);
      setEditForm(emptyCurriculumForm);
      await fetchCurricula();
      feedback.success("Curriculum updated.");
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to update curriculum.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCurriculum = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiClient.delete(`/training-plm/curricula/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchCurricula();
      feedback.success("Curriculum deleted.");
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to delete curriculum.");
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    if (!reviewApprover.trim()) {
      feedback.error("Select an approver before sending for review.");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/training-plm/curricula/${reviewTarget.id}/submit-review`, {
        approver: reviewApprover.trim(),
        effective_date: dateInputToIso(reviewEffectiveDate),
      });
      setReviewTarget(null);
      setReviewApprover("");
      setReviewEffectiveDate("");
      await fetchCurricula();
      feedback.success("Curriculum submitted for approval. Track it under Approvals.");
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to send for review.");
    } finally {
      setSaving(false);
    }
  };

  const assignTrainees = async () => {
    if (!assignTarget) return;
    if (assignForm.userIds.length === 0 && assignForm.groupIds.length === 0) {
      feedback.error("Select at least one user or group.");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post("/training-plm/assignments", {
        curriculum_id: assignTarget.id,
        user_ids: assignForm.userIds,
        group_ids: assignForm.groupIds,
        due_date: assignForm.dueDate ? new Date(assignForm.dueDate).toISOString() : null,
      });
      setAssignTarget(null);
      setAssignForm(emptyAssign);
      feedback.success("Trainees assigned. Open Training Records to track progress.");
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to assign trainees.");
    } finally {
      setSaving(false);
    }
  };

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.username || user.name || user.id,
      })),
    [users]
  );

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        value: group.id,
        label: group.name || group.id,
      })),
    [groups]
  );

  const columnDefs = useMemo(
    () => [
      {
        field: "updated_at",
        colId: "updated_at",
        hide: true,
        sort: "desc",
        sortIndex: 0,
      },
      { field: "curriculum_code", headerName: "Code", flex: 0, width: 112, minWidth: 96 },
      { field: "curriculum_name", headerName: "Name", flex: 1, minWidth: 180, tooltipField: "curriculum_name" },
      { field: "revision", headerName: "Revision", flex: 0, width: 100, minWidth: 92,
        valueFormatter: (params) => params.value?.trim() || "—",
      },
      {
        field: "form_name",
        headerName: "Training form",
        flex: 0,
        width: 160,
        minWidth: 130,
        valueFormatter: (params) => params.value?.trim() || "—",
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0,
        width: 148,
        minWidth: 130,
        cellClass: "training-status-cell",
        cellRenderer: (params) => <WorkflowStatusBadge status={params.value} />,
        valueFormatter: (params) => formatWorkflowStatus(params.value),
      },
      {
        colId: "actions",
        headerName: "Actions",
        flex: 0,
        width: 164,
        minWidth: 152,
        maxWidth: 176,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellClass: "training-actions-col",
        cellRenderer: CurriculumActionsCellRenderer,
      },
    ],
    []
  );

  const viewApproverName =
    viewDetail?.approver_display ||
    users.find((user) => user.id === viewDetail?.approver_user_id)?.username ||
    viewDetail?.approver_user_id;

  const viewDocuments = useMemo(() => {
    if (!viewDetail) return [];
    return (viewDetail.documents || []).map((doc, index) => ({
      doc_id: doc.doc_id,
      doc_name: doc.doc_name,
      doc_revision: doc.doc_revision,
      sequence_order: index,
    }));
  }, [viewDetail]);

  return (
    <div className="training-plm-page training-curriculum-page grid-page">
      <div className="training-plm-grid-wrap">
        <AppDataGrid
          rowData={filtered}
          columnDefs={columnDefs}
          context={gridContext}
          loading={loading}
          showSerialColumn
          getRowId={(params) => String(params.data.id)}
          searchPlaceholder="Search curriculum..."
          toolbarInstructions="Build curriculum templates with training forms and linked documents. Set an optional approver when creating to submit for approval, or use Send for review from the grid. Assign trainees only after a curriculum is Released."
          toolbarActions={
            <>
              <button type="button" className="parts-btn" onClick={fetchCurricula} disabled={loading}>
                Refresh
              </button>
              {permission.canCreateRecord && (
                <button
                  type="button"
                  className="parts-btn primary"
                  onClick={() => {
                    setCreateForm(emptyCurriculumForm);
                    setCreateModal(true);
                  }}
                >
                  New curriculum
                </button>
              )}
            </>
          }
        />
      </div>

      {createModal && (
        <div className="modal-overlay" onClick={() => !saving && setCreateModal(false)}>
          <div
            className="modal training-plm-modal training-plm-modal--wide training-plm-modal--scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="training-modal-header">
              <h3>New curriculum</h3>
              <button
                type="button"
                className="training-modal-close"
                onClick={() => !saving && setCreateModal(false)}
                disabled={saving}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>
            <div className="training-modal-body">
              <CurriculumFormPanel
                form={createForm}
                setForm={setCreateForm}
                trainingForms={trainingForms}
                releasedDocuments={releasedDocuments}
                users={users}
                usersLoading={usersLoading}
                optionsLoading={optionsLoading}
                onPreviewDocument={setPreviewDocId}
                onConfigureFormFields={() => setFormFieldsModal("create")}
              />
            </div>
            <div className="training-modal-footer modal-actions">
              <button type="button" className="parts-btn" onClick={() => setCreateModal(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="parts-btn primary" onClick={createCurriculum} disabled={saving}>
                {saving ? "Creating…" : "Create draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={() => !saving && setEditModal(null)}>
          <div
            className="modal training-plm-modal training-plm-modal--wide training-plm-modal--scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="training-modal-header">
              <h3>Edit curriculum</h3>
              <button
                type="button"
                className="training-modal-close"
                onClick={() => !saving && setEditModal(null)}
                disabled={saving}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>
            <div className="training-modal-body">
              <CurriculumFormPanel
                form={editForm}
                setForm={setEditForm}
                trainingForms={trainingForms}
                releasedDocuments={releasedDocuments}
                users={users}
                usersLoading={usersLoading}
                optionsLoading={optionsLoading}
                lockIdentity
                onPreviewDocument={setPreviewDocId}
                onConfigureFormFields={() => setFormFieldsModal("edit")}
              />
            </div>
            <div className="training-modal-footer modal-actions">
              <button type="button" className="parts-btn" onClick={() => setEditModal(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="parts-btn primary" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewDetail && (
        <div className="modal-overlay" onClick={() => setViewDetail(null)}>
          <div
            className="modal training-plm-modal training-plm-modal--wide training-plm-modal--record"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="training-modal-header">
              <h3>{viewDetail.curriculum_name}</h3>
              <button
                type="button"
                className="training-modal-close"
                onClick={() => setViewDetail(null)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>
            <div className="training-modal-body">
              <dl className="training-record-detail">
                <div>
                  <dt>Code</dt>
                  <dd>{viewDetail.curriculum_code}</dd>
                </div>
                <div>
                  <dt>Name</dt>
                  <dd>{viewDetail.curriculum_name}</dd>
                </div>
                <div>
                  <dt>Revision</dt>
                  <dd>{formatRevisionLabel(viewDetail.revision)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <WorkflowStatusBadge status={viewDetail.status} />
                  </dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{viewDetail.description?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt>Training form</dt>
                  <dd>{viewDetail.form_name || "—"}</dd>
                </div>
                <div>
                  <dt>Reviewer</dt>
                  <dd>{viewApproverName || "—"}</dd>
                </div>
                <div>
                  <dt>Effective date</dt>
                  <dd>{viewDetail.effective_date ? toDateInputValue(viewDetail.effective_date) : "—"}</dd>
                </div>
              </dl>
              {viewDetail.form_id && (
                <ViewCurriculumFormPreview
                  formId={viewDetail.form_id}
                  fielddata={viewDetail.fielddata}
                />
              )}
              <div className="training-plm-form-section">
                <h4>Linked documents</h4>
                <CurriculumDocumentLinks
                  documents={viewDocuments}
                  releasedDocuments={releasedDocuments}
                  onPreview={setPreviewDocId}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <CurriculumFormFieldsModal
        open={Boolean(formFieldsModal)}
        formId={formFieldsModal === "create" ? createForm.form_id : editForm.form_id}
        fielddata={formFieldsModal === "create" ? createForm.fielddata : editForm.fielddata}
        saving={saving}
        onClose={() => setFormFieldsModal(null)}
        onSave={(result) => applyFormFields(formFieldsModal, result)}
      />

      {reviewTarget && (
        <div className="modal-overlay" onClick={() => !saving && setReviewTarget(null)}>
          <div className="modal training-plm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Send for review</h3>
            <p className="training-curriculum-panel-hint">
              Submits {reviewTarget.curriculum_name} for approval before it can be released.
            </p>
            <ApproverBox
              approver={reviewApprover}
              effectiveDate={reviewEffectiveDate}
              onApproverChange={setReviewApprover}
              onEffectiveDateChange={setReviewEffectiveDate}
              users={users}
              usersLoading={usersLoading}
            />
            <div className="modal-actions">
              <button type="button" className="parts-btn" onClick={() => {
                setReviewTarget(null);
                setReviewApprover("");
                setReviewEffectiveDate("");
              }} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="parts-btn primary" onClick={submitReview} disabled={saving}>
                {saving ? "Sending…" : "Send for review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignTarget && (
        <div className="modal-overlay" onClick={() => !saving && setAssignTarget(null)}>
          <div className="modal training-plm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign trainees</h3>
            <p className="training-curriculum-panel-hint">
              Creates one training record per trainee for {assignTarget.curriculum_name}. Track progress in
              Training Records.
            </p>
            <TagMultiSelect
              label="Users"
              options={userOptions}
              value={assignForm.userIds}
              onChange={(userIds) => setAssignForm((prev) => ({ ...prev, userIds }))}
              placeholder="Select users"
              getOptionValue={(option) => option.value}
              getOptionLabel={(option) => option.label}
            />
            <TagMultiSelect
              label="Groups"
              options={groupOptions}
              value={assignForm.groupIds}
              onChange={(groupIds) => setAssignForm((prev) => ({ ...prev, groupIds }))}
              placeholder="Select groups"
              getOptionValue={(option) => option.value}
              getOptionLabel={(option) => option.label}
            />
            <label>
              Due date &amp; time
              <input
                type="datetime-local"
                value={assignForm.dueDate}
                onChange={(e) => setAssignForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="parts-btn" onClick={() => setAssignTarget(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="parts-btn primary" onClick={assignTrainees} disabled={saving}>
                {saving ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviseTarget && (
        <div className="modal-overlay" onClick={() => !saving && setReviseTarget(null)}>
          <div className="modal training-plm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Update revision</h3>
            <p>
              Update <strong>{reviseTarget.curriculum_name}</strong> to revision{" "}
              <strong>{nextRevision(reviseTarget.revision || "A")}</strong> and return it to Draft?
            </p>
            <div className="modal-actions">
              <button type="button" className="parts-btn" onClick={() => setReviseTarget(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="parts-btn primary" onClick={reviseCurriculum} disabled={saving}>
                {saving ? "Updating…" : "Update revision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !saving && setDeleteTarget(null)}>
          <div className="modal training-plm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete curriculum</h3>
            <p>
              Delete <strong>{deleteTarget.curriculum_name}</strong>? Only draft curricula can be deleted.
            </p>
            <div className="modal-actions">
              <button type="button" className="parts-btn" onClick={() => setDeleteTarget(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="parts-btn primary" onClick={deleteCurriculum} disabled={saving}>
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDocId && (
        <CurriculumDocPreviewModal docId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}
    </div>
  );
}

export default TrainingCurriculum;
