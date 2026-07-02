import { useState } from "react";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Paragraph" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file", label: "File" },
];

function emptyDraft() {
  return {
    label: "",
    type: "text",
    required: false,
    options: "",
  };
}

function DocFormBuilderPanel({
  customFields = [],
  onAddField,
  onRemoveField,
  compact = false,
}) {
  const [draft, setDraft] = useState(emptyDraft);

  const handleAddField = () => {
    const label = draft.label.trim();
    if (!label) return;

    const id = `extra-${Date.now()}`;
    const nextField = {
      id,
      label,
      type: draft.type,
      required: draft.required,
      options:
        draft.type === "dropdown"
          ? draft.options
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : undefined,
      custom: true,
    };

    const initialValue =
      draft.type === "checkbox" ? false : draft.type === "file" ? null : "";

    onAddField(nextField, initialValue);
    setDraft(emptyDraft());
  };

  const builderBody = (
    <>
      <p className={`forms-muted${compact ? " doc-form-builder-sidebar-hint" : ""}`}>
        {compact
          ? "Add fields to this document. They appear in Form responses on the left."
          : "Add new fields to this document. They appear in Form responses and are saved with the document."}
      </p>

      {customFields.length > 0 && (
        <div className="doc-form-builder-added">
          <span className="doc-form-builder-added-label">Added fields</span>
          <div className="doc-form-builder-chips">
            {customFields.map((field) => (
              <span key={field.id} className="doc-form-builder-chip">
                {field.label}
                <span className="doc-form-builder-chip-type">{field.type}</span>
                <button
                  type="button"
                  className="doc-form-builder-chip-remove"
                  onClick={() => onRemoveField(field.id)}
                  aria-label={`Remove ${field.label}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className={`doc-custom-field-builder${
          compact ? " doc-custom-field-builder--compact" : ""
        }`}
      >
        <label className="doc-form-field">
          <span className="doc-form-label">Field label</span>
          <input
            className="doc-form-control"
            value={draft.label}
            onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="e.g. Supplier reference"
          />
        </label>

        <label className="doc-form-field">
          <span className="doc-form-label">Field type</span>
          <select
            className="doc-form-control"
            value={draft.type}
            onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
          >
            {FIELD_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {draft.type === "dropdown" && (
          <label className="doc-form-field">
            <span className="doc-form-label">Options (comma-separated)</span>
            <input
              className="doc-form-control"
              value={draft.options}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, options: e.target.value }))
              }
              placeholder="Option A, Option B"
            />
          </label>
        )}

        <label className="doc-form-field doc-form-field-inline">
          <input
            type="checkbox"
            checked={draft.required}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, required: e.target.checked }))
            }
          />
          <span className="doc-form-label">Required</span>
        </label>

        <button
          type="button"
          className="parts-btn primary"
          onClick={handleAddField}
          disabled={!draft.label.trim()}
        >
          Add field
        </button>
      </div>
    </>
  );

  if (compact) {
    return <div className="doc-form-builder-sidebar">{builderBody}</div>;
  }

  return (
    <section className="doc-panel-card">
      <div className="doc-panel-card-header">
        <h4>Form builder</h4>
      </div>
      {builderBody}
    </section>
  );
}

export default DocFormBuilderPanel;
