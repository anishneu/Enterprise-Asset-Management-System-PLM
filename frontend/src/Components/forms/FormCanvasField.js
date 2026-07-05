import { memo } from "react";

import FormFieldControl from "./FormFieldControl";

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
      className={`forms-field${selected ? " selected" : ""}${previewMode ? " preview" : ""}${
        field.readOnly ? " read-only" : ""
      }`}
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
          title="Remove field"
        >
          ×
        </button>
      )}

      {showLabel && (
        <span className="forms-field-label">
          {field.label}
          {field.required && <span className="forms-required">*</span>}
          {field.readOnly && <span className="forms-field-badge">Read only</span>}
        </span>
      )}

      <div className="forms-field-control" aria-hidden={!previewMode}>
        <FormFieldControl field={field} interactive={previewMode} />
      </div>
    </div>
  );
});

export default FormCanvasField;
