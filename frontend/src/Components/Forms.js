import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../api/client";
import keycloak from "../keycloak";
import FormBuilderDesigner from "./forms/FormBuilderDesigner";
import AppDataGrid from "./common/AppDataGrid";
import FormNameCellRenderer from "./common/FormNameCellRenderer";
import FormDetailRowRenderer from "./common/FormDetailRowRenderer";
import FormSavedActionsCellRenderer from "./common/FormSavedActionsCellRenderer";
import { multiRowSelection } from "./common/gridHelpers";
import {
  createFieldFromPalette,
  normalizeFormField,
} from "./forms/formBuilderConstants";
import WorkflowStatusBadge from "./common/WorkflowStatusBadge";
import SubmitReviewDrawer from "./common/SubmitReviewDrawer";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { filterBySearch } from "../utils/filterBySearch";
import { formatKeycloakOwner, formatStoredOwner } from "../utils/ownerDisplay";
import { DEFAULT_FORM_TYPES } from "../constants/documentCatalog";
import { canSendToReview, canEdit, canDelete, canRevise, INITIAL_WORKFLOW_STATUS } from "../constants/workflowCatalog";
import { useAppFeedback } from "../context/AppFeedbackContext";
import { nextRevision, revisionHelpText } from "../utils/revisionUtils";
import { parseFormTemplate, formatWorkflowDate } from "./docs/docFormUtils";

import {
  DndContext,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";

import "./Forms.css";
import "./Docs.css";

function JsonViewerDrawer({ drawer, onClose, onCollapse, onExpand }) {
  if (!drawer.open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(drawer.content);
    } catch (err) {
      console.error(err);
    }
  };

  if (drawer.collapsed) {
    return (
      <button
        type="button"
        className="forms-json-tab"
        onClick={onExpand}
        aria-label="Expand JSON panel"
        title="Show JSON"
      >
        <span className="forms-json-tab-label">JSON</span>
        <span className="forms-json-tab-chevron" aria-hidden="true">
          ‹
        </span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="forms-json-backdrop"
        aria-label="Close JSON panel"
        onClick={onClose}
      />
      <aside className="forms-json-drawer" aria-label="Form JSON viewer">
        <header className="forms-json-header">
          <div>
            <h3>{drawer.title}</h3>
            <p className="forms-muted">Form JSON</p>
          </div>
          <div className="forms-json-header-actions">
            <button
              type="button"
              className="forms-icon-btn"
              onClick={onCollapse}
              aria-label="Collapse panel"
              title="Collapse"
            >
              ›
            </button>
            <button
              type="button"
              className="forms-icon-btn"
              onClick={onClose}
              aria-label="Close panel"
              title="Close"
            >
              ×
            </button>
          </div>
        </header>

        <div className="forms-json-body">
          <button type="button" className="parts-btn" onClick={handleCopy}>
            Copy
          </button>
          <pre className="forms-json-content">{drawer.content}</pre>
        </div>
      </aside>
    </>
  );
}

function Forms({ searchText = "", view = "all" }) {
  const showBuilder = view === "all" || view === "builder";
  const showSaved = view === "all" || view === "saved";
  const [formsOpen, setFormsOpen] = useState([]);
  const [formTypes, setFormTypes] = useState([]);
  const [formTypesLoading, setFormTypesLoading] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("");
  const [formRevision, setFormRevision] = useState("");
  const [expandedFormId, setExpandedFormId] = useState(null);
  const [selectedFormIds, setSelectedFormIds] = useState([]);
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [reviewApprover, setReviewApprover] = useState("");
  const [reviewEffectiveDate, setReviewEffectiveDate] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [fields, setFields] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [activeDragField, setActiveDragField] = useState(null);
  const [jsonDrawer, setJsonDrawer] = useState({
    open: false,
    collapsed: false,
    title: "",
    content: "",
  });
  const [editingFormId, setEditingFormId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [reviseDialog, setReviseDialog] = useState(null);
  const [revising, setRevising] = useState(false);
  const builderRef = useRef(null);
  const gridApiRef = useRef(null);
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();

  const showBuilderPanel = showBuilder || editingFormId !== null;
  const showSavedTable = showSaved && editingFormId === null;

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );

  const filteredSavedForms = useMemo(
    () =>
      filterBySearch(formsOpen, searchText, [
        "fmname",
        "ftype",
        "fmrev",
        "fmstatus",
        "fmlink",
        "fowner",
        "updated",
      ]),
    [formsOpen, searchText]
  );

  const selectedAuditForm = useMemo(() => {
    if (selectedFormIds.length !== 1) return null;
    return formsOpen.find((form) => form.id === selectedFormIds[0]) || null;
  }, [formsOpen, selectedFormIds]);

  useEffect(() => {
    fetchForms();
    fetchFormTypes();
    if (showSaved) {
      fetchUsers();
    }
  }, [showSaved]);

  const cancelEditForm = useCallback(() => {
    setEditingFormId(null);
    setFormName("");
    setFormType("");
    setFormRevision("");
    setFields([]);
    setSelectedFieldId(null);
    setPreviewMode(false);
  }, []);

  useEffect(() => {
    if (view === "builder") {
      setInsight({
        hideInsightPanel: true,
        hidePageHeader: false,
        breadcrumbs: null,
        formsEditorActive: false,
      });
      return () => {
        setInsight({
          hideInsightPanel: false,
          hidePageHeader: false,
          breadcrumbs: null,
          formsEditorActive: false,
        });
      };
    }

    if (editingFormId) {
      setInsight({
        hideInsightPanel: true,
        hidePageHeader: false,
        formsEditorActive: true,
        breadcrumbs: [
          { label: "Saved Forms", onClick: cancelEditForm },
          { label: formName.trim() || "Form" },
          { label: "Edit" },
        ],
      });
      return;
    }

    setInsight({
      recordCount: filteredSavedForms.length,
      selectedCount: selectedFormIds.length,
      hideInsightPanel: false,
      hidePageHeader: false,
      breadcrumbs: null,
      formsEditorActive: false,
      extra: {
        Records: filteredSavedForms.length,
      },
      auditEntity: selectedAuditForm
        ? {
            type: "form",
            id: selectedAuditForm.id,
            label: selectedAuditForm.fmname,
            revision: selectedAuditForm.fmrev || null,
          }
        : null,
    });
  }, [
    view,
    editingFormId,
    formName,
    filteredSavedForms.length,
    selectedFormIds.length,
    selectedAuditForm,
    cancelEditForm,
    setInsight,
  ]);

  const fetchUsers = async () => {
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
  };

  const fetchForms = async () => {
    try {
      const res = await apiClient.get("/forms/");
      setFormsOpen(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFormTypes = async () => {
    setFormTypesLoading(true);
    try {
      const res = await apiClient.get("/form-types/");
      setFormTypes(res.data);
    } catch (err) {
      console.error(err);
      setFormTypes(DEFAULT_FORM_TYPES.map((name) => ({ name })));
    } finally {
      setFormTypesLoading(false);
    }
  };

  const handleDragStart = useCallback((event) => {
    setActiveDragField(event.active.data.current || null);
  }, []);

  const handleDragEnd = useCallback((event) => {
    setActiveDragField(null);

    const { active, over } = event;
    if (!over || over.id !== "canvas") return;

    const field = active.data.current;
    if (!field) return;

    const newId = Date.now();
    setFields((prev) => [...prev, createFieldFromPalette(field, newId)]);
    setSelectedFieldId(newId);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragField(null);
  }, []);

  const deleteField = useCallback((id) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedFieldId((current) => (current === id ? null : current));
  }, []);

  const updateField = useCallback((id, updates) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, []);

  const selectField = useCallback((id) => {
    setSelectedFieldId(id);
  }, []);

  const openJsonDrawer = useCallback((form) => {
    let payload;
    try {
      payload =
        typeof form.fmjson === "string" ? JSON.parse(form.fmjson) : { ...form.fmjson };
    } catch {
      payload = { raw: form.fmjson };
    }

    if (form.ftype && !payload.ftype) {
      payload = { ...payload, ftype: form.ftype };
    }

    const formatted = JSON.stringify(payload, null, 2);

    setJsonDrawer({
      open: true,
      collapsed: false,
      title: form.fmname,
      content: formatted,
    });
  }, []);

  const closeJsonDrawer = () => {
    setJsonDrawer({ open: false, collapsed: false, title: "", content: "" });
  };

  const collapseJsonDrawer = () => {
    setJsonDrawer((prev) => ({ ...prev, collapsed: true }));
  };

  const expandJsonDrawer = () => {
    setJsonDrawer((prev) => ({ ...prev, collapsed: false }));
  };

  const loadFormForEdit = useCallback((form) => {
    if (!canEdit(form.fmstatus)) {
      feedback.workflowBlocked({
        itemType: "form",
        itemName: form.fmname,
        status: form.fmstatus,
      });
      return;
    }

    const template = parseFormTemplate(form.fmjson);

    setEditingFormId(form.id);
    setFormName(form.fmname || template.name || "");
    setFormType(form.ftype || template.ftype || "");
    setFormRevision(form.fmrev && form.fmrev !== "1" ? form.fmrev : "");
    setFields(
      Array.isArray(template.fields)
        ? template.fields.map((field) => normalizeFormField(field))
        : []
    );
    setSelectedFieldId(null);
    setPreviewMode(false);
    setExpandedFormId(null);
  }, [feedback]);

  const saveForm = async () => {
    if (!formName.trim()) {
      feedback.error("Form name is required.");
      return;
    }

    if (!formType.trim()) {
      feedback.error("Form type is required.");
      return;
    }

    try {
      const wasEditing = Boolean(editingFormId);
      const existing = editingFormId
        ? formsOpen.find((form) => form.id === editingFormId)
        : null;

      const formData = {
        fmname: formName.trim(),
        ftype: formType.trim(),
        fmrev: formRevision.trim() || "1",
        fmstatus: existing?.fmstatus || INITIAL_WORKFLOW_STATUS,
        fowner: existing?.fowner || formatKeycloakOwner(keycloak.tokenParsed),
        fmlink: existing?.fmlink || null,
        fmapprover: existing?.fmapprover || null,
        fmeffective: existing?.fmeffective || null,
        fmjson: JSON.stringify({
          name: formName.trim(),
          ftype: formType,
          fields,
        }),
      };

      if (editingFormId) {
        await apiClient.put(`/forms/${editingFormId}`, formData);
      } else {
        await apiClient.post("/forms/", formData);
      }

      await fetchForms();
      await fetchFormTypes();

      cancelEditForm();

      feedback.success(wasEditing ? "Form updated successfully." : "Form saved successfully.");
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to save form");
    }
  };

  const openDeleteDialog = (target) => {
    setDeleteDialog(target);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteDialog(null);
  };

  const deleteForm = useCallback((form) => {
    if (!canDelete(form.fmstatus)) {
      feedback.workflowBlocked({
        itemType: "form",
        itemName: form.fmname,
        status: form.fmstatus,
      });
      return;
    }
    openDeleteDialog({ type: "single", form });
  }, [feedback]);

  const openReviseDialog = useCallback((form) => {
    if (!canRevise(form.fmstatus)) {
      feedback.workflowBlocked({
        itemType: "form",
        itemName: form.fmname,
        status: form.fmstatus,
      });
      return;
    }
    setReviseDialog(form);
  }, [feedback]);

  const closeReviseDialog = () => {
    if (revising) return;
    setReviseDialog(null);
  };

  const confirmReviseForm = async () => {
    if (!reviseDialog) return;

    setRevising(true);
    try {
      const res = await apiClient.post(`/forms/${reviseDialog.id}/revise`);
      await fetchForms();
      setReviseDialog(null);
      feedback.success(
        `Revision created. ${reviseDialog.fmname} is now Rev ${res.data.fmrev} in Draft.`
      );
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to create revision.");
    } finally {
      setRevising(false);
    }
  };

  const deleteSelectedForms = () => {
    if (selectedFormIds.length === 0) {
      feedback.error("Select at least one form to delete.");
      return;
    }

    const selected = formsOpen.filter((form) => selectedFormIds.includes(form.id));
    const nonDraft = selected.filter((form) => !canDelete(form.fmstatus));
    if (nonDraft.length > 0) {
      feedback.workflowBlocked({
        itemType: "form",
        itemName: nonDraft[0].fmname,
        status: nonDraft[0].fmstatus,
      });
      return;
    }

    openDeleteDialog({ type: "bulk", ids: [...selectedFormIds] });
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;

    setDeleting(true);
    try {
      if (deleteDialog.type === "single") {
        const { form } = deleteDialog;
        await apiClient.delete(`/forms/${form.id}`);
        if (editingFormId === form.id) {
          cancelEditForm();
        }
        if (expandedFormId === form.id) {
          setExpandedFormId(null);
        }
        setSelectedFormIds((current) => current.filter((id) => id !== form.id));
      } else {
        const ids = deleteDialog.ids;
        await Promise.all(ids.map((id) => apiClient.delete(`/forms/${id}`)));
        if (editingFormId && ids.includes(editingFormId)) {
          cancelEditForm();
        }
        if (expandedFormId && ids.includes(expandedFormId)) {
          setExpandedFormId(null);
        }
        setSelectedFormIds([]);
        gridApiRef.current?.deselectAll?.();
      }

      await fetchForms();
      setDeleteDialog(null);
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to delete form(s).");
    } finally {
      setDeleting(false);
    }
  };

  const toggleFormExpand = useCallback((formId) => {
    setExpandedFormId((current) => (current === formId ? null : formId));
  }, []);

  const rowSelection = useMemo(() => multiRowSelection, []);

  const savedFormGridRows = useMemo(() => {
    const rows = [];
    filteredSavedForms.forEach((form) => {
      rows.push(form);
      if (expandedFormId === form.id) {
        rows.push({
          id: `detail-${form.id}`,
          detailRow: true,
          form,
        });
      }
    });
    return rows;
  }, [filteredSavedForms, expandedFormId]);

  const handleSavedFormSelectionChanged = useCallback((event) => {
    gridApiRef.current = event.api;
    const ids = event.api
      .getSelectedRows()
      .filter((row) => !row.detailRow)
      .map((row) => row.id);
    setSelectedFormIds(ids);
  }, []);

  const handleSavedFormGridReady = useCallback((event) => {
    gridApiRef.current = event.api;
  }, []);

  const getSavedFormRowId = useCallback((params) => {
    const row = params.data;
    return row.detailRow ? `detail-${row.form.id}` : String(row.id);
  }, []);

  const isSavedFormFullWidthRow = useCallback(
    (params) => Boolean(params.rowNode?.data?.detailRow),
    []
  );

  const getSavedFormRowHeight = useCallback((params) => {
    const row = params.node?.data ?? params.data;
    if (row?.detailRow) {
      const template = parseFormTemplate(row.form.fmjson);
      const fieldCount = template.fields?.length || 0;
      return Math.min(480, 120 + fieldCount * 36);
    }
    return 52;
  }, []);

  const isSavedFormRowSelectable = useCallback(
    (params) => !params.rowNode?.data?.detailRow,
    []
  );

  const getSavedFormRowClass = useCallback(
    (params) => {
      if (params.data?.detailRow) return "forms-saved-detail-wrapper";
      if (params.data?.id === editingFormId) return "forms-saved-row-active";
      return params.data?.id === expandedFormId ? "forms-saved-row-active" : "";
    },
    [expandedFormId, editingFormId]
  );

  const savedFormGridContext = useMemo(
    () => ({
      expandedFormId,
      onToggleExpand: toggleFormExpand,
      onEditForm: loadFormForEdit,
      onReviseForm: openReviseDialog,
      onDeleteForm: deleteForm,
      onOpenJson: openJsonDrawer,
      deleting,
    }),
    [
      expandedFormId,
      toggleFormExpand,
      deleting,
      loadFormForEdit,
      openReviseDialog,
      deleteForm,
      openJsonDrawer,
    ]
  );

  const savedFormColumnDefs = useMemo(
    () => [
      {
        field: "fmname",
        headerName: "Name",
        minWidth: 180,
        flex: 1,
        cellRenderer: FormNameCellRenderer,
      },
      {
        field: "ftype",
        headerName: "Form type",
        flex: 0,
        minWidth: 120,
        width: 130,
        valueGetter: (params) => (params.data?.detailRow ? "" : params.data.ftype || "—"),
      },
      {
        field: "fmrev",
        headerName: "Revision",
        flex: 0,
        width: 90,
        maxWidth: 100,
        valueGetter: (params) => (params.data?.detailRow ? "" : params.data.fmrev || "1"),
      },
      {
        field: "fmstatus",
        headerName: "Status",
        flex: 0,
        minWidth: 110,
        width: 120,
        cellRenderer: (params) => {
          if (params.data?.detailRow) return null;
          return <WorkflowStatusBadge status={params.data.fmstatus} />;
        },
      },
      {
        field: "fowner",
        headerName: "Owner",
        flex: 0,
        minWidth: 110,
        width: 120,
        valueGetter: (params) =>
          params.data?.detailRow ? "" : formatStoredOwner(params.data.fowner),
        tooltipValueGetter: (params) => params.data?.fowner || "",
      },
      {
        headerName: "JSON",
        flex: 0,
        width: 100,
        maxWidth: 110,
        sortable: false,
        filter: false,
        cellRenderer: (params) => {
          if (params.data?.detailRow) return null;
          return (
            <button
              type="button"
              className="forms-link-btn"
              onClick={(event) => {
                event.stopPropagation();
                params.context?.onOpenJson?.(params.data);
              }}
            >
              View JSON
            </button>
          );
        },
      },
      {
        field: "updated",
        headerName: "Updated",
        flex: 0,
        minWidth: 112,
        width: 118,
        valueGetter: (params) => (params.data?.detailRow ? "" : params.data.updated || ""),
        valueFormatter: (params) => formatWorkflowDate(params.value),
        tooltipValueGetter: (params) => {
          if (params.data?.detailRow || !params.value) return "";
          const date = new Date(params.value);
          return Number.isNaN(date.getTime()) ? String(params.value) : date.toLocaleString();
        },
        cellClass: "forms-muted forms-updated-col",
      },
      {
        headerName: "Actions",
        flex: 0,
        minWidth: 112,
        maxWidth: 120,
        width: 116,
        sortable: false,
        filter: false,
        cellRenderer: FormSavedActionsCellRenderer,
        cellClass: "forms-saved-actions-col",
      },
    ],
    []
  );

  const draftFormsForReview = useMemo(
    () =>
      formsOpen.filter(
        (form) => selectedFormIds.includes(form.id) && canSendToReview(form.fmstatus)
      ),
    [formsOpen, selectedFormIds]
  );

  const openReviewDrawer = () => {
    if (selectedFormIds.length === 0) {
      feedback.error("Select at least one form to send for review.");
      return;
    }

    if (draftFormsForReview.length === 0) {
      feedback.error("Only draft forms can be sent for review.");
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
        fmapprover: reviewApprover.trim(),
        fmeffective: reviewEffectiveDate || null,
      };
      const results = await Promise.allSettled(
        draftFormsForReview.map((form) =>
          apiClient.post(`/forms/${form.id}/submit-review`, payload)
        )
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        feedback.error(`${failed.length} form(s) could not be sent for review.`);
      } else {
        feedback.success("Form(s) submitted for approval.");
      }
      await fetchForms();
      setSelectedFormIds([]);
      setReviewDrawerOpen(false);
      setReviewApprover("");
      setReviewEffectiveDate("");
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div
      className={
        showBuilderPanel
          ? `forms-page${
              view === "builder" ? " forms-page--builder" : " forms-page--editing"
            }`
          : "grid-page"
      }
    >
      {showBuilderPanel && (
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <section className="forms-builder-shell" ref={builderRef}>
          <FormBuilderDesigner
            formName={formName}
            formType={formType}
            formRevision={formRevision}
            formTypes={formTypes}
            formTypesLoading={formTypesLoading}
            fields={fields}
            selectedFieldId={selectedFieldId}
            selectedField={selectedField}
            previewMode={previewMode}
            editingFormId={editingFormId}
            onFormNameChange={setFormName}
            onFormTypeChange={setFormType}
            onFormRevisionChange={setFormRevision}
            onTogglePreview={() => setPreviewMode((prev) => !prev)}
            onSave={saveForm}
            onCancelEdit={cancelEditForm}
            onSelectField={selectField}
            onDeleteField={deleteField}
            onUpdateField={updateField}
          />
        </section>

        <DragOverlay dropAnimation={null}>
          {activeDragField ? (
            <div className="forms-library-item forms-library-item-overlay">
              <span className="forms-library-item-label">{activeDragField.label}</span>
              <span className="forms-library-item-grip" aria-hidden="true">
                ⋮
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}

      {showSavedTable && (
        <>
          <p className="forms-muted forms-revision-hint docs-revision-hint">{revisionHelpText()}</p>
          <AppDataGrid
            rowData={savedFormGridRows}
            columnDefs={savedFormColumnDefs}
            context={savedFormGridContext}
            rowSelection={rowSelection}
            onSelectionChanged={handleSavedFormSelectionChanged}
            onGridReady={handleSavedFormGridReady}
            getRowClass={getSavedFormRowClass}
            getRowId={getSavedFormRowId}
            isFullWidthRow={isSavedFormFullWidthRow}
            fullWidthCellRenderer={FormDetailRowRenderer}
            getRowHeight={getSavedFormRowHeight}
            isRowSelectable={isSavedFormRowSelectable}
            overlayNoRowsTemplate="<span>No saved forms yet.</span>"
            searchPlaceholder="Search saved forms..."
            toolbarActions={
              <>
                <button
                  type="button"
                  className="parts-btn danger"
                  onClick={deleteSelectedForms}
                  disabled={selectedFormIds.length === 0 || deleting}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="parts-btn"
                  onClick={openReviewDrawer}
                  disabled={selectedFormIds.length === 0}
                >
                  Send to review
                </button>
                {selectedFormIds.length > 0 && (
                  <span className="parts-selection-count">
                    {selectedFormIds.length} selected
                  </span>
                )}
              </>
            }
          />
        </>
      )}

      {showSaved && (
      <JsonViewerDrawer
        drawer={jsonDrawer}
        onClose={closeJsonDrawer}
        onCollapse={collapseJsonDrawer}
        onExpand={expandJsonDrawer}
      />
      )}

      <SubmitReviewDrawer
        open={reviewDrawerOpen}
        title="Send forms for review"
        subtitle="Choose an approver and effective date for the selected forms."
        itemCount={draftFormsForReview.length}
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
              Archive <strong>{reviseDialog.fmname}</strong> at Rev{" "}
              <strong>{reviseDialog.fmrev || "1"}</strong> (Released) and start Rev{" "}
              <strong>{nextRevision(reviseDialog.fmrev || "1")}</strong> in Draft.
            </p>
            <div className="forms-delete-actions">
              <button
                type="button"
                className="parts-btn primary"
                onClick={confirmReviseForm}
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
              Delete form
              {deleteDialog.type === "bulk" && deleteDialog.ids.length > 1 ? "s" : ""}
            </h3>
            <p className="forms-delete-message">
              {deleteDialog.type === "single" ? (
                <>
                  Are you sure you want to delete{" "}
                  <strong>{deleteDialog.form.fmname}</strong>? This cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <strong>{deleteDialog.ids.length}</strong> selected form
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

export default Forms;
