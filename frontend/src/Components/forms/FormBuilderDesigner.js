import { useMemo, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";

import FormTypeSelect from "../common/FormTypeSelect";
import FieldPropertiesPanel from "./FieldPropertiesPanel";
import FormCanvasField from "./FormCanvasField";
import { FIELD_PALETTE } from "./formBuilderConstants";

function DraggablePaletteItem({ field }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${field.id}`,
    data: field,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={`forms-library-item${isDragging ? " is-dragging" : ""}`}
      {...listeners}
      {...attributes}
    >
      <span className="forms-library-item-label">{field.label}</span>
      <span className="forms-library-item-grip" aria-hidden="true">
        ⋮
      </span>
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

function FormBuilderDesigner({
  formName,
  formType,
  formRevision,
  formTypes,
  formTypesLoading,
  fields,
  selectedFieldId,
  selectedField,
  previewMode,
  editingFormId,
  onFormNameChange,
  onFormTypeChange,
  onFormRevisionChange,
  onTogglePreview,
  onSave,
  onCancelEdit,
  onSelectField,
  onDeleteField,
  onUpdateField,
}) {
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [librarySearch, setLibrarySearch] = useState("");

  const filteredPalette = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();
    if (!query) return FIELD_PALETTE;
    return FIELD_PALETTE.filter((field) => field.label.toLowerCase().includes(query));
  }, [librarySearch]);

  return (
    <section className={`forms-builder${libraryOpen ? " is-library-open" : ""}`}>
      <div className="forms-workspace">
        <aside className="forms-workspace-library" aria-label="Field library">
          {libraryOpen ? (
            <>
              <header className="forms-library-rail-head">
                <h4 className="forms-panel-title">Field library</h4>
                <button
                  type="button"
                  className="forms-icon-btn"
                  onClick={() => setLibraryOpen(false)}
                  aria-label="Collapse field library"
                  title="Collapse"
                >
                  ‹
                </button>
              </header>
              <div className="forms-library-search">
                <input
                  className="forms-control"
                  type="search"
                  placeholder="Search fields"
                  aria-label="Search fields"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                />
              </div>
              <div className="forms-library-list">
                {filteredPalette.length === 0 ? (
                  <p className="forms-library-empty">No matching fields.</p>
                ) : (
                  filteredPalette.map((field) => (
                    <DraggablePaletteItem key={field.id} field={field} />
                  ))
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="forms-library-tab"
              onClick={() => setLibraryOpen(true)}
              aria-label="Expand field library"
              title="Field library"
            >
              <span className="forms-library-tab-label">Fields</span>
              <span className="forms-library-tab-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          )}
        </aside>

        <main className="forms-workspace-canvas">
          <header className="forms-canvas-chrome">
            {editingFormId && (
              <div className="forms-canvas-chrome-status">
                <span className="forms-editing-tag">
                  Editing
                  <button type="button" className="forms-link-btn" onClick={onCancelEdit}>
                    Cancel
                  </button>
                </span>
              </div>
            )}

            <div className="forms-canvas-chrome-meta">
              <input
                className="forms-control forms-toolbar-input"
                placeholder="Form name"
                aria-label="Form name"
                value={formName}
                onChange={(e) => onFormNameChange(e.target.value)}
              />
              <FormTypeSelect
                formTypes={formTypes}
                value={formType}
                onChange={onFormTypeChange}
                loading={formTypesLoading}
                className="forms-control forms-toolbar-input forms-toolbar-select"
              />
              <input
                className="forms-control forms-toolbar-input forms-toolbar-revision"
                placeholder="Revision"
                aria-label="Revision"
                value={formRevision}
                onChange={(e) => onFormRevisionChange(e.target.value)}
              />
              <div className="forms-canvas-chrome-meta-actions">
                <button type="button" className="parts-btn primary" onClick={onSave}>
                  {editingFormId ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  className={`parts-btn${previewMode ? " primary" : ""}`}
                  onClick={onTogglePreview}
                >
                  {previewMode ? "Edit" : "Preview"}
                </button>
              </div>
            </div>
          </header>

          <div className="forms-canvas-scroll">
            <CanvasDropZone>
              <p className="forms-field-count" aria-live="polite">
                {fields.length} {fields.length === 1 ? "field" : "fields"}
              </p>
              {fields.length === 0 ? (
                <p className="forms-canvas-empty">
                  Drag fields from the library to start building.
                </p>
              ) : (
                fields.map((field) => (
                  <FormCanvasField
                    key={field.id}
                    field={field}
                    selected={selectedFieldId === field.id}
                    previewMode={previewMode}
                    onSelect={onSelectField}
                    onDelete={onDeleteField}
                  />
                ))
              )}
            </CanvasDropZone>
          </div>
        </main>

        <aside className="forms-workspace-properties" aria-label="Field properties">
          <div className="forms-properties-head">
            <h4 className="forms-panel-title">Properties</h4>
          </div>
          <div className="forms-properties-body">
            <FieldPropertiesPanel field={selectedField} onUpdate={onUpdateField} />
          </div>
        </aside>
      </div>
    </section>
  );
}

export default FormBuilderDesigner;
