import { useCallback, useEffect, useMemo, useState } from "react";

import AppDataGrid from "./common/AppDataGrid";
import DocDetailRowRenderer from "./common/DocDetailRowRenderer";
import DocNameCellRenderer from "./common/DocNameCellRenderer";
import DocActionsCellRenderer from "./common/DocActionsCellRenderer";
import ApproverBox from "./common/ApproverBox";
import SubmitReviewDrawer from "./common/SubmitReviewDrawer";
import WorkflowStatusBadge from "./common/WorkflowStatusBadge";
import { multiRowSelection } from "./common/gridHelpers";
import { usePageInsight } from "./dashboard/PageInsightContext";
import apiClient from "../api/client";
import { DOCUMENT_FORM_TYPE, DOCUMENT_TYPES } from "../constants/documentCatalog";
import { canSendToReview, canDelete, canEdit, canRevise, INITIAL_WORKFLOW_STATUS } from "../constants/workflowCatalog";
import { useAppFeedback } from "../context/AppFeedbackContext";
import { nextRevision, revisionHelpText } from "../utils/revisionUtils";
import { filterBySearch } from "../utils/filterBySearch";
import {
  DocFormRenderer,
  buildFieldValues,
  buildDocDescription,
  getDocFieldEntries,
  parseFormTemplate,
  resolveDocDescription,
} from "./docs/docFormUtils";

import "./Docs.css";
import "./Forms.css";

const emptySetupDraft = {
  documentType: "",
  formId: "",
  revision: "",
  description: "",
  approver: "",
  effectiveDate: "",
};

function toDateInputValue(value) {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function Docs({ searchText = "" }) {
  const [docs, setDocs] = useState([]);
  const [documentForms, setDocumentForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formDetailLoading, setFormDetailLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [view, setView] = useState("list");
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [setupDraft, setSetupDraft] = useState(emptySetupDraft);
  const [fillDraft, setFillDraft] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [reviewApprover, setReviewApprover] = useState("");
  const [reviewEffectiveDate, setReviewEffectiveDate] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [reviseDialog, setReviseDialog] = useState(null);
  const [revising, setRevising] = useState(false);
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();

  const fetchDocs = useCallback(async () => {
    try {
      const res = await apiClient.get("/docs");
      setDocs(res.data);
    } catch (err) {
      console.error(err);
      feedback.error("Failed to load documents. Check that you are logged in.");
    }
  }, [feedback]);

  const rowSelection = useMemo(() => multiRowSelection, []);

  const filteredDocs = useMemo(
    () =>
      filterBySearch(docs, searchText, [
        "dname",
        "ddesc",
        "dtype",
        "ftype",
        "fmat",
        "drev",
        "dstatus",
        "dlink",
        "downer",
        "updated",
        "created",
      ]).map((doc) => ({
        ...doc,
        ddesc: resolveDocDescription(doc),
      })),
    [docs, searchText]
  );

  const gridRows = useMemo(() => {
    const rows = [];

    filteredDocs.forEach((doc) => {
      rows.push(doc);
      if (expandedDocId === doc.id) {
        rows.push({
          id: `detail-${doc.id}`,
          detailRow: true,
          doc,
        });
      }
    });

    return rows;
  }, [filteredDocs, expandedDocId]);

  const expandedDoc = useMemo(
    () => docs.find((doc) => doc.id === expandedDocId) || null,
    [docs, expandedDocId]
  );

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    if (view === "create-fill") return;

    setInsight({
      recordCount: filteredDocs.length,
      selectedCount: selectedIds.length,
      docDetail: expandedDoc
        ? {
            fielddataJson: JSON.stringify(
              {
                dtype: expandedDoc.dtype ?? null,
                ftype: expandedDoc.ftype ?? null,
                fid: expandedDoc.fid ?? expandedDoc.fielddata?.formId ?? null,
                fmat: expandedDoc.fmat ?? null,
                drev: expandedDoc.drev || "1",
                ...(expandedDoc.fielddata || {}),
              },
              null,
              2
            ),
          }
        : null,
    });
  }, [
    filteredDocs.length,
    selectedIds.length,
    expandedDoc,
    view,
    setInsight,
  ]);

  const fetchDocumentForms = async () => {
    setFormsLoading(true);
    try {
      const res = await apiClient.get("/forms/", {
        params: { ftype: DOCUMENT_FORM_TYPE },
      });
      setDocumentForms(res.data);
    } catch (err) {
      console.error(err);
      setDocumentForms([]);
      feedback.error("Failed to load document forms.");
    } finally {
      setFormsLoading(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await apiClient.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const openCreateSetup = () => {
    setSetupDraft(emptySetupDraft);
    setShowSetupModal(true);
    fetchDocumentForms();
    fetchUsers();
  };

  const closeCreateSetup = () => {
    setShowSetupModal(false);
    setSetupDraft(emptySetupDraft);
    setDocumentForms([]);
  };

  const cancelDocumentFlow = () => {
    setView("list");
    setShowSetupModal(false);
    setFillDraft(null);
    setFieldValues({});
    setSetupDraft(emptySetupDraft);
    setDocumentForms([]);
    setEditingDocId(null);
  };

  const cancelCreate = () => {
    cancelDocumentFlow();
  };

  const fetchFormById = useCallback(async (formId) => {
    const res = await apiClient.get(`/forms/${formId}`);
    return res.data;
  }, []);

  const continueToFill = async () => {
    if (!setupDraft.documentType) {
      feedback.error("Select a document type.");
      return;
    }

    if (!setupDraft.formId) {
      feedback.error("Select a form.");
      return;
    }

    if (!setupDraft.revision.trim()) {
      feedback.error("Enter a revision.");
      return;
    }

    setFormDetailLoading(true);
    try {
      const selectedForm = await fetchFormById(setupDraft.formId);

      if (selectedForm.ftype !== DOCUMENT_FORM_TYPE) {
        feedback.error("Selected form is not a Documents form.");
        return;
      }

      const template = parseFormTemplate(selectedForm.fmjson);
      const initialValues = {};

      template.fields.forEach((field) => {
        initialValues[field.id] = field.type === "checkbox" ? false : "";
      });

      setFillDraft({
        documentType: setupDraft.documentType,
        revision: setupDraft.revision.trim() || "1",
        description: setupDraft.description.trim(),
        approver: setupDraft.approver.trim(),
        effectiveDate: setupDraft.effectiveDate,
        formId: selectedForm.id,
        formName: selectedForm.fmname,
        fields: template.fields,
      });
      setFieldValues(initialValues);
      setShowSetupModal(false);
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

  const createDocument = async () => {
    if (!fillDraft) return;

    if (!validateFillForm()) {
      feedback.error("Fill in all required fields before saving the document.");
      return;
    }

    const manualDescription = fillDraft.description?.trim();
    const fielddata = {
      formId: fillDraft.formId,
      values: buildFieldValues(fillDraft.fields, fieldValues),
    };
    const payload = {
      ddesc:
        manualDescription ||
        buildDocDescription({
          dtype: fillDraft.documentType,
          fmat: fillDraft.formName,
          drev: fillDraft.revision,
        }),
      dtype: fillDraft.documentType,
      ftype: DOCUMENT_FORM_TYPE,
      fid: Number(fillDraft.formId),
      fmat: fillDraft.formName,
      drev: fillDraft.revision,
      dapprover: fillDraft.approver || null,
      deffective: fillDraft.effectiveDate || null,
      fielddata,
    };

    setSaving(true);
    try {
      if (editingDocId) {
        const existing = docs.find((doc) => doc.id === editingDocId);
        await apiClient.put(`/docs/${editingDocId}`, {
          ...payload,
          dname: existing?.dname,
          dstatus: existing?.dstatus || INITIAL_WORKFLOW_STATUS,
          downer: existing?.downer,
          dlink: existing?.dlink ?? null,
        });
      } else {
        await apiClient.post("/docs/", {
          ...payload,
          dstatus: INITIAL_WORKFLOW_STATUS,
        });
      }

      await fetchDocs();
      cancelDocumentFlow();
      setSelectedIds([]);
      feedback.success(
        editingDocId ? "Document updated successfully." : "Document created successfully."
      );
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.detail ||
        (editingDocId ? "Failed to update document" : "Failed to create document");
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (target) => {
    setDeleteDialog(target);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteDialog(null);
  };

  const deleteDoc = useCallback(
    (doc) => {
      if (!canDelete(doc.dstatus)) {
        feedback.workflowBlocked({
          itemType: "document",
          itemName: doc.dname,
          status: doc.dstatus,
        });
        return;
      }
      openDeleteDialog({ type: "single", doc });
    },
    [feedback]
  );

  const reviseDoc = useCallback(
    (doc) => {
      if (!canRevise(doc.dstatus)) {
        feedback.workflowBlocked({
          itemType: "document",
          itemName: doc.dname,
          status: doc.dstatus,
        });
        return;
      }
      setReviseDialog(doc);
    },
    [feedback]
  );

  const closeReviseDialog = () => {
    if (revising) return;
    setReviseDialog(null);
  };

  const confirmReviseDoc = async () => {
    if (!reviseDialog) return;

    setRevising(true);
    try {
      const res = await apiClient.post(`/docs/${reviseDialog.id}/revise`);
      await fetchDocs();
      setReviseDialog(null);
      feedback.success(
        `Revision created. Document is now Rev ${res.data.drev} in Draft.`
      );
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to create revision.");
    } finally {
      setRevising(false);
    }
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) {
      feedback.error("Select at least one document to delete.");
      return;
    }

    const selected = docs.filter((doc) => selectedIds.includes(doc.id));
    const nonDraft = selected.filter((doc) => !canDelete(doc.dstatus));
    if (nonDraft.length > 0) {
      feedback.workflowBlocked({
        itemType: "document",
        itemName: nonDraft[0].dname,
        status: nonDraft[0].dstatus,
      });
      return;
    }

    openDeleteDialog({ type: "bulk", ids: [...selectedIds] });
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;

    setDeleting(true);
    try {
      if (deleteDialog.type === "single") {
        const { doc } = deleteDialog;
        await apiClient.delete(`/docs/${doc.id}`);
        if (activeDocId === doc.id) {
          setActiveDocId(null);
        }
        if (expandedDocId === doc.id) {
          setExpandedDocId(null);
        }
        if (editingDocId === doc.id) {
          cancelDocumentFlow();
        }
        setSelectedIds((current) => current.filter((id) => id !== doc.id));
      } else {
        const ids = deleteDialog.ids;
        await Promise.all(ids.map((id) => apiClient.delete(`/docs/${id}`)));
        if (activeDocId && ids.includes(activeDocId)) {
          setActiveDocId(null);
        }
        if (expandedDocId && ids.includes(expandedDocId)) {
          setExpandedDocId(null);
        }
        if (editingDocId && ids.includes(editingDocId)) {
          cancelDocumentFlow();
        }
        setSelectedIds([]);
      }

      await fetchDocs();
      setDeleteDialog(null);
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to delete document(s).");
    } finally {
      setDeleting(false);
    }
  };

  const loadDocForEdit = useCallback(
    async (doc) => {
      if (!canEdit(doc.dstatus)) {
        feedback.workflowBlocked({
          itemType: "document",
          itemName: doc.dname,
          status: doc.dstatus,
        });
        return;
      }

      setFormDetailLoading(true);
      try {
        const formId = doc.fid || doc.fielddata?.formId;
        if (!formId) {
          feedback.error("This document is not linked to a form template.");
          return;
        }

        const selectedForm = await fetchFormById(formId);
        const template = parseFormTemplate(selectedForm.fmjson);
        const fields = template.fields || [];
        const entries = getDocFieldEntries(doc);
        const initialValues = {};

        fields.forEach((field) => {
          const saved = entries.find((entry) => entry.id === field.id);
          if (field.type === "checkbox") {
            initialValues[field.id] = Boolean(saved?.value);
          } else {
            initialValues[field.id] = saved?.value ?? "";
          }
        });

        setEditingDocId(doc.id);
        setFillDraft({
          documentType: doc.dtype,
          revision: doc.drev || "",
          description: (doc.ddesc || "").trim(),
          approver: doc.dapprover || "",
          effectiveDate: toDateInputValue(doc.deffective),
          formId: selectedForm.id,
          formName: doc.fmat || selectedForm.fmname,
          fields,
          docName: doc.dname,
          docStatus: doc.dstatus || INITIAL_WORKFLOW_STATUS,
        });
        setFieldValues(initialValues);
        setView("create-fill");
        setExpandedDocId(null);
        if (users.length === 0) {
          fetchUsers();
        }
      } catch (err) {
        console.error(err);
        feedback.error(err.response?.data?.detail || "Failed to load document for editing.");
      } finally {
        setFormDetailLoading(false);
      }
    },
    [fetchFormById, fetchUsers, users.length, feedback]
  );

  const draftDocsForReview = useMemo(
    () =>
      docs.filter(
        (doc) => selectedIds.includes(doc.id) && canSendToReview(doc.dstatus)
      ),
    [docs, selectedIds]
  );

  const openReviewDrawer = () => {
    if (selectedIds.length === 0) {
      feedback.error("Select at least one document to send for review.");
      return;
    }

    if (draftDocsForReview.length === 0) {
      feedback.error("Only draft documents can be sent for review.");
      return;
    }

    setReviewApprover("");
    setReviewEffectiveDate("");
    setReviewDrawerOpen(true);
    if (users.length === 0) {
      fetchUsers();
    }
  };

  const closeReviewDrawer = () => {
    if (reviewSubmitting) return;
    setReviewDrawerOpen(false);
    setReviewApprover("");
    setReviewEffectiveDate("");
  };

  const confirmSendReview = async () => {
    if (!reviewApprover.trim()) {
      feedback.error("Select an approver before sending.");
      return;
    }

    setReviewSubmitting(true);
    try {
      const payload = {
        dapprover: reviewApprover.trim(),
        deffective: reviewEffectiveDate || null,
      };
      const results = await Promise.allSettled(
        draftDocsForReview.map((doc) =>
          apiClient.post(`/docs/${doc.id}/submit-review`, payload)
        )
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        feedback.error(`${failed.length} document(s) could not be sent for review.`);
      } else {
        feedback.success("Document(s) submitted for approval.");
      }
      await fetchDocs();
      setSelectedIds([]);
      setReviewDrawerOpen(false);
      setReviewApprover("");
      setReviewEffectiveDate("");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleSelectionChanged = useCallback((event) => {
    const ids = event.api
      .getSelectedRows()
      .filter((row) => !row.detailRow)
      .map((row) => row.id);
    setSelectedIds(ids);
  }, []);

  const handleToggleExpand = useCallback((docId) => {
    setExpandedDocId((current) => (current === docId ? null : docId));
  }, []);

  const handleRowClicked = useCallback((event) => {
    if (event.data?.detailRow) return;
    setActiveDocId(event.data.id);
  }, []);

  const getRowClass = useCallback(
    (params) => {
      if (params.data?.detailRow) return "doc-row-detail-wrapper";
      if (params.data?.id === editingDocId) return "doc-row-active";
      return params.data.id === expandedDocId ? "doc-row-active" : "";
    },
    [expandedDocId, editingDocId]
  );

  const gridContext = useMemo(
    () => ({
      expandedDocId,
      onToggleExpand: handleToggleExpand,
      onEditDoc: loadDocForEdit,
      onDeleteDoc: deleteDoc,
      onReviseDoc: reviseDoc,
    }),
    [expandedDocId, handleToggleExpand, loadDocForEdit, deleteDoc, reviseDoc]
  );

  const getDocRowId = useCallback((params) => {
    const row = params.data;
    return row.detailRow ? `detail-${row.doc.id}` : String(row.id);
  }, []);

  const isDocFullWidthRow = useCallback(
    (params) => Boolean(params.rowNode?.data?.detailRow),
    []
  );

  const getDocRowHeight = useCallback((params) => {
    const row = params.node?.data ?? params.data;
    if (row?.detailRow) {
      const fieldCount = getDocFieldEntries(row.doc).length;
      return Math.min(420, 220 + fieldCount * 28);
    }
    return 52;
  }, []);

  const isDocRowSelectable = useCallback(
    (params) => !params.rowNode?.data?.detailRow,
    []
  );

  const columnDefs = useMemo(
    () => [
      {
        field: "dname",
        headerName: "Document Name",
        minWidth: 220,
        cellRenderer: DocNameCellRenderer,
      },
      {
        field: "ddesc",
        headerName: "Description",
        minWidth: 240,
        flex: 1.4,
      },
      {
        field: "dtype",
        headerName: "Document Type",
        minWidth: 140,
        maxWidth: 180,
        valueGetter: (params) => (params.data?.detailRow ? "" : params.data.dtype || "—"),
      },
      {
        field: "ftype",
        headerName: "Form Type",
        minWidth: 130,
        maxWidth: 160,
        valueGetter: (params) => (params.data?.detailRow ? "" : params.data.ftype || "—"),
      },
      {
        field: "drev",
        headerName: "Revision",
        maxWidth: 120,
        valueGetter: (params) => {
          if (params.data?.detailRow) return "";
          return params.data.drev || "1";
        },
      },
      {
        field: "dstatus",
        headerName: "Status",
        minWidth: 130,
        maxWidth: 150,
        cellRenderer: (params) => {
          if (params.data?.detailRow) return "";
          return <WorkflowStatusBadge status={params.data.dstatus} />;
        },
      },
      {
        field: "updated",
        headerName: "Updated",
        minWidth: 200,
        flex: 0,
        valueGetter: (params) => {
          if (params.data?.detailRow) return "";
          return params.data.updated || "—";
        },
      },
      {
        field: "created",
        headerName: "Created",
        minWidth: 200,
        flex: 0,
        valueGetter: (params) => {
          if (params.data?.detailRow) return "";
          return params.data.created || params.data.updated || "—";
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 140,
        maxWidth: 160,
        sortable: false,
        filter: false,
        cellRenderer: DocActionsCellRenderer,
      },
    ],
    []
  );

  if (view === "create-fill" && fillDraft) {
    return (
      <div className="doc-create-fill">
        <header className="doc-create-header">
          <div>
            <h3>{editingDocId ? "Edit document" : "Create document"}</h3>
            <p className="forms-muted">
              {editingDocId
                ? "Update the form responses below, then save your changes."
                : "Complete the form fields below to create the document."}
            </p>
            <div className="doc-create-meta">
              {fillDraft.docName && (
                <span className="doc-create-pill">Name: {fillDraft.docName}</span>
              )}
              <span className="doc-create-pill">Document type: {fillDraft.documentType}</span>
              <span className="doc-create-pill">Form: {fillDraft.formName}</span>
              <span className="doc-create-pill">Revision: {fillDraft.revision}</span>
              <span className="doc-create-pill">
                Status:{" "}
                <WorkflowStatusBadge
                  status={fillDraft.docStatus || INITIAL_WORKFLOW_STATUS}
                />
              </span>
              {fillDraft.description && (
                <span className="doc-create-pill">Description: {fillDraft.description}</span>
              )}
            </div>
          </div>
          <div className="doc-create-actions">
            <button type="button" className="parts-btn" onClick={cancelCreate} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="parts-btn primary"
              onClick={createDocument}
              disabled={saving}
            >
              {saving
                ? editingDocId
                  ? "Updating..."
                  : "Creating..."
                : editingDocId
                  ? "Update"
                  : "Create"}
            </button>
          </div>
        </header>

        <div className="doc-create-body">
          {editingDocId && (
            <ApproverBox
              optional
              compact
              approver={fillDraft.approver}
              effectiveDate={fillDraft.effectiveDate}
              onApproverChange={(value) =>
                setFillDraft((prev) => (prev ? { ...prev, approver: value } : prev))
              }
              onEffectiveDateChange={(value) =>
                setFillDraft((prev) => (prev ? { ...prev, effectiveDate: value } : prev))
              }
              users={users}
              usersLoading={usersLoading}
            />
          )}
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
      <p className="forms-muted forms-revision-hint docs-revision-hint">{revisionHelpText()}</p>
      <AppDataGrid
        rowData={gridRows}
        columnDefs={columnDefs}
        context={gridContext}
        rowSelection={rowSelection}
        onSelectionChanged={handleSelectionChanged}
        onRowClicked={handleRowClicked}
        getRowClass={getRowClass}
        getRowId={getDocRowId}
        isFullWidthRow={isDocFullWidthRow}
        fullWidthCellRenderer={DocDetailRowRenderer}
        getRowHeight={getDocRowHeight}
        isRowSelectable={isDocRowSelectable}
        searchPlaceholder="Search documents..."
        overlayNoRowsTemplate="<span>No documents found.</span>"
        toolbarActions={
          <>
            <button type="button" className="parts-btn primary" onClick={openCreateSetup}>
              Create
            </button>
            <button
              type="button"
              className="parts-btn"
              onClick={openReviewDrawer}
              disabled={selectedIds.length === 0}
            >
              Send to review
            </button>
            <button
              type="button"
              className="parts-btn danger"
              onClick={deleteSelected}
              disabled={selectedIds.length === 0}
            >
              Delete
            </button>
            {selectedIds.length > 0 && (
              <span className="parts-selection-count">{selectedIds.length} selected</span>
            )}
          </>
        }
      />

      {showSetupModal && (
        <div className="modal-overlay">
          <div className="modal modal-compact">
            <h3>Create document</h3>
            <p className="forms-muted">Set up the document, then fill in the form.</p>

            <div className="doc-setup-grid">
              <label className="doc-form-field">
                <span className="doc-form-label">
                  Document type<span className="doc-form-required">*</span>
                </span>
                <select
                  className="doc-form-control"
                  value={setupDraft.documentType}
                  onChange={(e) =>
                    setSetupDraft((prev) => ({ ...prev, documentType: e.target.value }))
                  }
                >
                  <option value="">Select type</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="doc-form-field">
                <span className="doc-form-label">
                  Revision<span className="doc-form-required">*</span>
                </span>
                <input
                  className="doc-form-control"
                  placeholder="Revision"
                  value={setupDraft.revision}
                  onChange={(e) =>
                    setSetupDraft((prev) => ({ ...prev, revision: e.target.value }))
                  }
                />
              </label>
            </div>

            <label className="doc-form-field">
              <span className="doc-form-label">
                Form<span className="doc-form-required">*</span>
              </span>
              <select
                className="doc-form-control"
                value={setupDraft.formId}
                onChange={(e) =>
                  setSetupDraft((prev) => ({ ...prev, formId: e.target.value }))
                }
                disabled={formsLoading}
              >
                <option value="">
                  {formsLoading ? "Loading forms..." : "Select form"}
                </option>
                {documentForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.fmname}
                  </option>
                ))}
              </select>
            </label>

            <label className="doc-form-field">
              <span className="doc-form-label">Description</span>
              <textarea
                className="doc-form-control"
                placeholder="Brief summary — purpose, scope, or key notes"
                rows={2}
                value={setupDraft.description}
                onChange={(e) =>
                  setSetupDraft((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </label>

            <ApproverBox
              optional
              compact
              approver={setupDraft.approver}
              effectiveDate={setupDraft.effectiveDate}
              onApproverChange={(value) =>
                setSetupDraft((prev) => ({ ...prev, approver: value }))
              }
              onEffectiveDateChange={(value) =>
                setSetupDraft((prev) => ({ ...prev, effectiveDate: value }))
              }
              users={users}
              usersLoading={usersLoading}
            />

            <div className="modal-actions">
              <button
                type="button"
                className="parts-btn primary"
                onClick={continueToFill}
                disabled={formDetailLoading}
              >
                {formDetailLoading ? "Loading form..." : "Continue"}
              </button>
              <button type="button" className="parts-btn" onClick={closeCreateSetup}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <SubmitReviewDrawer
        open={reviewDrawerOpen}
        title="Send documents for review"
        subtitle="Choose an approver and effective date for the selected documents."
        itemCount={draftDocsForReview.length}
        approver={reviewApprover}
        effectiveDate={reviewEffectiveDate}
        onApproverChange={setReviewApprover}
        onEffectiveDateChange={setReviewEffectiveDate}
        users={users}
        usersLoading={usersLoading}
        submitting={reviewSubmitting}
        onSubmit={confirmSendReview}
        onClose={closeReviewDrawer}
      />

      {reviseDialog && (
        <div className="modal-overlay" onClick={closeReviseDialog}>
          <div
            className="modal modal-compact forms-delete-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Create revision</h3>
            <p className="forms-delete-message">
              Archive this document at Rev <strong>{reviseDialog.drev || "1"}</strong> (Released)
              and start Rev <strong>{nextRevision(reviseDialog.drev || "1")}</strong> in Draft.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="parts-btn primary"
                onClick={confirmReviseDoc}
                disabled={revising}
              >
                {revising ? "Creating..." : "Create revision"}
              </button>
              <button
                type="button"
                className="parts-btn"
                onClick={closeReviseDialog}
                disabled={revising}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDialog && (
        <div className="modal-overlay" onClick={closeDeleteDialog}>
          <div
            className="modal modal-compact forms-delete-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>
              Delete document
              {deleteDialog.type === "bulk" && deleteDialog.ids.length > 1 ? "s" : ""}
            </h3>
            <p className="forms-delete-message">
              {deleteDialog.type === "single" ? (
                <>
                  Are you sure you want to delete{" "}
                  <strong>{deleteDialog.doc.dname}</strong>? This cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <strong>{deleteDialog.ids.length}</strong> selected document
                  {deleteDialog.ids.length === 1 ? "" : "s"}? This cannot be undone.
                </>
              )}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="parts-btn danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                className="parts-btn"
                onClick={closeDeleteDialog}
                disabled={deleting}
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

export default Docs;
