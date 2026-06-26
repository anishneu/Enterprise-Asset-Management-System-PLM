import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../api/client";
import keycloak from "../keycloak";
import FormTypeSelect from "./common/FormTypeSelect";
import WorkflowStatusBadge from "./common/WorkflowStatusBadge";
import SubmitReviewDrawer from "./common/SubmitReviewDrawer";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { filterBySearch } from "../utils/filterBySearch";
import { formatKeycloakOwner, formatStoredOwner } from "../utils/ownerDisplay";
import { DEFAULT_FORM_TYPES } from "../constants/documentCatalog";
import { canSendToReview, canEdit, canDelete, canRevise, INITIAL_WORKFLOW_STATUS } from "../constants/workflowCatalog";
import { useAppFeedback } from "../context/AppFeedbackContext";
import { nextRevision, revisionHelpText } from "../utils/revisionUtils";
import { parseFormTemplate } from "./docs/docFormUtils";

import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";

import "./Forms.css";
import "./Docs.css";

const FIELD_PALETTE = [
  { id: "text", label: "Text Input", type: "text" },
  { id: "textarea", label: "Textarea", type: "textarea" },
  { id: "number", label: "Number", type: "number" },
  { id: "dropdown", label: "Dropdown", type: "dropdown", options: ["Option 1", "Option 2"] },
  { id: "date", label: "Date", type: "date" },
  { id: "email", label: "Email", type: "email" },
  { id: "checkbox", label: "Checkbox", type: "checkbox" },
  { id: "radio", label: "Radio Group", type: "radio", options: ["Option 1", "Option 2"] },
  { id: "file", label: "File Upload", type: "file" },
  { id: "hyperlink", label: "Hyperlink", type: "hyperlink" },
];

const PLACEHOLDER_TYPES = new Set(["text", "textarea", "number", "email", "hyperlink"]);

function DraggablePaletteItem({ field }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${field.id}`,
    data: field,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={`forms-chip${isDragging ? " is-dragging" : ""}`}
      {...listeners}
      {...attributes}
    >
      {field.label}
    </button>
  );
}

function CanvasDropZone({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div ref={setNodeRef} className={`forms-canvas${isOver ? " is-over" : ""}`}>
      {children}
    </div>
  );
}

function FormFieldControl({ field, interactive }) {
  const disabled = !interactive;
  const placeholder = field.placeholder || "";
  const options = field.options || ["Option 1", "Option 2"];

  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          className="forms-control"
          disabled={disabled}
          placeholder={placeholder}
          readOnly={!interactive}
        />
      );
    case "email":
      return (
        <input
          type="email"
          className="forms-control"
          disabled={disabled}
          placeholder={placeholder || "name@example.com"}
          readOnly={!interactive}
        />
      );
    case "textarea":
      return (
        <textarea
          className="forms-control"
          disabled={disabled}
          placeholder={placeholder}
          readOnly={!interactive}
          rows={3}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className="forms-control"
          disabled={disabled}
          placeholder={placeholder}
          readOnly={!interactive}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className="forms-control"
          disabled={disabled}
          readOnly={!interactive}
        />
      );
    case "dropdown":
      return (
        <select className="forms-control" disabled={disabled}>
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "checkbox":
      return (
        <label className="forms-inline-control">
          <input type="checkbox" disabled={disabled} />
          <span>{field.label}</span>
        </label>
      );
    case "radio":
      return (
        <div className="forms-radio-group">
          {options.map((option) => (
            <label key={option} className="forms-inline-control">
              <input
                type="radio"
                name={`field-${field.id}`}
                disabled={disabled}
                readOnly={!interactive}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );
    case "file":
      return <input type="file" className="forms-control forms-control-file" disabled={disabled} />;
    case "hyperlink":
      return (
        <input
          type="url"
          className="forms-control"
          disabled={disabled}
          placeholder={placeholder || "https://example.com"}
          readOnly={!interactive}
        />
      );
    default:
      return (
        <input
          type="text"
          className="forms-control"
          disabled={disabled}
          readOnly={!interactive}
        />
      );
  }
}

const FormCanvasField = memo(function FormCanvasField({
  field,
  selected,
  previewMode,
  onSelect,
  onDelete,
}) {
  const showLabel = field.type !== "checkbox";

  return (
    <div
      className={`forms-field${selected ? " selected" : ""}${previewMode ? " preview" : ""}`}
      onClick={() => !previewMode && onSelect(field.id)}
      onKeyDown={(e) => {
        if (previewMode) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(field.id);
        }
      }}
      role={previewMode ? undefined : "button"}
      tabIndex={previewMode ? undefined : 0}
    >
      {!previewMode && (
        <button
          type="button"
          className="forms-field-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(field.id);
          }}
          aria-label="Remove field"
        >
          ×
        </button>
      )}

      {showLabel && (
        <span className="forms-field-label">
          {field.label}
          {field.required && <span className="forms-required">*</span>}
        </span>
      )}

      <div className="forms-field-control" aria-hidden={!previewMode}>
        <FormFieldControl field={field} interactive={previewMode} />
      </div>
    </div>
  );
});

function FieldPropertiesPanel({ field, onUpdate }) {
  const [label, setLabel] = useState("");
  const [placeholder, setPlaceholder] = useState("");

  useEffect(() => {
    if (!field) return;
    setLabel(field.label || "");
    setPlaceholder(field.placeholder || "");
  }, [field?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!field) {
    return <p className="forms-muted">Select a field to edit.</p>;
  }

  const commitLabel = () => {
    if (label !== field.label) {
      onUpdate(field.id, { label });
    }
  };

  const commitPlaceholder = () => {
    const next = placeholder.trim();
    if (next !== (field.placeholder || "")) {
      onUpdate(field.id, { placeholder: next });
    }
  };

  const showPlaceholder = PLACEHOLDER_TYPES.has(field.type);

  return (
    <div className="forms-properties-form">
      <label className="forms-prop-field">
        Label
        <input
          className="forms-control"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </label>

      {showPlaceholder && (
        <label className="forms-prop-field">
          Placeholder
          <input
            className="forms-control"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            onBlur={commitPlaceholder}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </label>
      )}

      <label className="forms-checkbox-row">
        <input
          type="checkbox"
          checked={Boolean(field.required)}
          onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
        />
        Required
      </label>
    </div>
  );
}

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
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();

  const showBuilderPanel = showBuilder || editingFormId !== null;

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

  useEffect(() => {
    fetchForms();
    fetchFormTypes();
    if (showSaved) {
      fetchUsers();
    }
  }, [showSaved]);

  useEffect(() => {
    if (editingFormId && builderRef.current) {
      builderRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingFormId]);

  useEffect(() => {
    setInsight({
      recordCount: filteredSavedForms.length,
      selectedCount: fields.length,
      extra: {
        Fields: fields.length,
        Mode: previewMode ? "Preview" : "Edit",
      },
    });
  }, [filteredSavedForms.length, fields.length, previewMode, setInsight]);

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
    setFields((prev) => [
      ...prev,
      {
        id: newId,
        label: field.label,
        type: field.type,
        options: field.options ? [...field.options] : undefined,
        required: false,
        placeholder: "",
      },
    ]);
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

  const openJsonDrawer = (form) => {
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
  };

  const closeJsonDrawer = () => {
    setJsonDrawer({ open: false, collapsed: false, title: "", content: "" });
  };

  const collapseJsonDrawer = () => {
    setJsonDrawer((prev) => ({ ...prev, collapsed: true }));
  };

  const expandJsonDrawer = () => {
    setJsonDrawer((prev) => ({ ...prev, collapsed: false }));
  };

  const cancelEditForm = () => {
    setEditingFormId(null);
    setFormName("");
    setFormType("");
    setFormRevision("");
    setFields([]);
    setSelectedFieldId(null);
    setPreviewMode(false);
  };

  const loadFormForEdit = (form) => {
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
        ? template.fields.map((field) => ({ ...field }))
        : []
    );
    setSelectedFieldId(null);
    setPreviewMode(false);
    setExpandedFormId(null);
  };

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

  const deleteForm = (form) => {
    if (!canDelete(form.fmstatus)) {
      feedback.workflowBlocked({
        itemType: "form",
        itemName: form.fmname,
        status: form.fmstatus,
      });
      return;
    }
    openDeleteDialog({ type: "single", form });
  };

  const openReviseDialog = (form) => {
    if (!canRevise(form.fmstatus)) {
      feedback.workflowBlocked({
        itemType: "form",
        itemName: form.fmname,
        status: form.fmstatus,
      });
      return;
    }
    setReviseDialog(form);
  };

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

  const toggleFormExpand = (formId) => {
    setExpandedFormId((current) => (current === formId ? null : formId));
  };

  const toggleFormSelection = (formId) => {
    setSelectedFormIds((current) =>
      current.includes(formId)
        ? current.filter((id) => id !== formId)
        : [...current, formId]
    );
  };

  const toggleSelectAllForms = () => {
    setSelectedFormIds((current) =>
      current.length === filteredSavedForms.length
        ? []
        : filteredSavedForms.map((form) => form.id)
    );
  };

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
      className={`forms-page${
        view === "builder" ? " forms-page--builder" : view === "saved" ? " forms-page--saved" : ""
      }`}
    >
      {showBuilderPanel && (
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <section className="forms-builder" ref={builderRef}>
          {editingFormId && (
            <div className="forms-editing-banner">
              <span>
                Editing <strong>{formName || "form"}</strong>
              </span>
              <button type="button" className="forms-link-btn" onClick={cancelEditForm}>
                Cancel edit
              </button>
            </div>
          )}
          <div className="forms-toolbar">
            <input
              className="forms-control forms-toolbar-input"
              placeholder="Form name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <FormTypeSelect
              formTypes={formTypes}
              value={formType}
              onChange={setFormType}
              loading={formTypesLoading}
              className="forms-control forms-toolbar-select"
            />
            <input
              className="forms-control forms-toolbar-revision"
              placeholder="Revision"
              value={formRevision}
              onChange={(e) => setFormRevision(e.target.value)}
            />
            <div className="forms-toolbar-actions">
              <button
                type="button"
                className={`parts-btn${previewMode ? " primary" : ""}`}
                onClick={() => setPreviewMode((prev) => !prev)}
              >
                {previewMode ? "Edit" : "Preview"}
              </button>
              <button type="button" className="parts-btn primary" onClick={saveForm}>
                {editingFormId ? "Update" : "Save"}
              </button>
            </div>
          </div>

          <div className="forms-palette">
            <span className="forms-palette-label">Add field</span>
            <div className="forms-palette-chips">
              {FIELD_PALETTE.map((field) => (
                <DraggablePaletteItem key={field.id} field={field} />
              ))}
            </div>
          </div>

          <div className="forms-editor">
            <div className="forms-canvas-wrap">
              <CanvasDropZone>
                {fields.length === 0 ? (
                  <p className="forms-canvas-empty">Drag a field here to start building.</p>
                ) : (
                  fields.map((field) => (
                    <FormCanvasField
                      key={field.id}
                      field={field}
                      selected={selectedFieldId === field.id}
                      previewMode={previewMode}
                      onSelect={selectField}
                      onDelete={deleteField}
                    />
                  ))
                )}
              </CanvasDropZone>
            </div>

            <aside className="forms-properties">
              <h4 className="forms-properties-heading">Properties</h4>
              <FieldPropertiesPanel field={selectedField} onUpdate={updateField} />
            </aside>
          </div>
        </section>

        <DragOverlay dropAnimation={null}>
          {activeDragField ? (
            <div className="forms-chip forms-chip-overlay">{activeDragField.label}</div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}

      {showSaved && (
        <section className="forms-saved">
          <div className="forms-saved-header">
            <div>
              <h3 className="forms-section-title">Saved forms</h3>
              <p className="forms-muted forms-revision-hint">{revisionHelpText()}</p>
            </div>
            <div className="forms-saved-toolbar">
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
            </div>
          </div>
          <div className="forms-saved-table-wrap">
            <table className="forms-saved-table">
              <thead>
                <tr>
                  <th className="forms-saved-select-col">
                    <input
                      type="checkbox"
                      aria-label="Select all forms"
                      checked={
                        filteredSavedForms.length > 0 &&
                        selectedFormIds.length === filteredSavedForms.length
                      }
                      onChange={toggleSelectAllForms}
                      disabled={filteredSavedForms.length === 0}
                    />
                  </th>
                  <th>Name</th>
                  <th>Form type</th>
                  <th>Revision</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>JSON</th>
                  <th>Updated</th>
                  <th className="forms-saved-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSavedForms.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="forms-muted forms-saved-empty">
                      No saved forms yet.
                    </td>
                  </tr>
                ) : (
                  filteredSavedForms.map((form) => (
                    <Fragment key={form.id}>
                      <tr
                        className={
                          expandedFormId === form.id || editingFormId === form.id
                            ? "forms-saved-row-active"
                            : ""
                        }
                      >
                        <td className="forms-saved-select-col">
                          <input
                            type="checkbox"
                            aria-label={`Select ${form.fmname}`}
                            checked={selectedFormIds.includes(form.id)}
                            onChange={() => toggleFormSelection(form.id)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`doc-name-link${
                              expandedFormId === form.id ? " is-expanded" : ""
                            }`}
                            aria-expanded={expandedFormId === form.id}
                            onClick={() => toggleFormExpand(form.id)}
                          >
                            {form.fmname}
                          </button>
                        </td>
                        <td>{form.ftype}</td>
                        <td>{form.fmrev || "1"}</td>
                        <td>
                          <WorkflowStatusBadge status={form.fmstatus} />
                        </td>
                        <td title={form.fowner || ""}>{formatStoredOwner(form.fowner)}</td>
                        <td>
                          <button
                            type="button"
                            className="forms-link-btn"
                            onClick={() => openJsonDrawer(form)}
                          >
                            View JSON
                          </button>
                        </td>
                        <td className="forms-muted">{form.updated}</td>
                        <td className="forms-saved-actions-col">
                          <div className="forms-saved-row-actions">
                            <button
                              type="button"
                              className="group-edit-btn"
                              aria-label={`Edit ${form.fmname}`}
                              title="Edit form"
                              onClick={() => loadFormForEdit(form)}
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
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                            {canRevise(form.fmstatus) && (
                              <button
                                type="button"
                                className="forms-link-btn forms-revise-btn"
                                onClick={() => openReviseDialog(form)}
                              >
                                Revise
                              </button>
                            )}
                            <button
                              type="button"
                              className="forms-delete-btn"
                              aria-label={`Delete ${form.fmname}`}
                              disabled={deleting}
                              title="Delete form"
                              onClick={() => deleteForm(form)}
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
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedFormId === form.id && (() => {
                        const template = parseFormTemplate(form.fmjson);
                        const templateFields = template.fields || [];

                        return (
                          <tr className="forms-saved-detail-row">
                            <td colSpan={9}>
                              <div className="forms-saved-detail">
                                <h4 className="forms-saved-detail-heading">Form content</h4>
                                {templateFields.length > 0 ? (
                                  <dl className="forms-saved-detail-list forms-saved-detail-list--fields">
                                    {templateFields.map((field) => (
                                      <div key={field.id}>
                                        <dt>
                                          {field.label}
                                          {field.required && (
                                            <span className="forms-required">*</span>
                                          )}
                                        </dt>
                                        <dd>
                                          {field.type}
                                          {field.options?.length
                                            ? ` · ${field.options.join(", ")}`
                                            : ""}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                ) : (
                                  <p className="forms-muted">No fields in this form template.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
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
