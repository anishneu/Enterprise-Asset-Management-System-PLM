import { useState } from "react";

import {
  DEFAULT_FILE_TYPES,
  FILE_TYPE_OPTIONS,
  PLACEHOLDER_TYPES,
  fieldTypeLabel,
} from "./formBuilderConstants";

function OptionsEditor({ field, onUpdate }) {
  const [draftOption, setDraftOption] = useState("");
  const options = field.options || [];

  const addOption = () => {
    const value = draftOption.trim();
    if (!value || options.includes(value)) return;
    onUpdate(field.id, { options: [...options, value] });
    setDraftOption("");
  };

  const removeOption = (option) => {
    onUpdate(field.id, { options: options.filter((item) => item !== option) });
  };

  const moveOption = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= options.length) return;
    const next = [...options];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onUpdate(field.id, { options: next });
  };

  return (
    <div className="forms-prop-section">
      <h5 className="forms-prop-section-title">Options</h5>
      <div className="forms-options-list">
        {options.map((option, index) => (
          <div key={option} className="forms-option-row">
            <span>{option}</span>
            <div className="forms-option-actions">
              <button
                type="button"
                className="forms-icon-btn"
                onClick={() => moveOption(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="forms-icon-btn"
                onClick={() => moveOption(index, 1)}
                disabled={index === options.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className="forms-icon-btn forms-icon-btn-danger"
                onClick={() => removeOption(option)}
                aria-label="Delete option"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="forms-option-add">
        <input
          className="forms-control"
          value={draftOption}
          onChange={(e) => setDraftOption(e.target.value)}
          placeholder="New option"
          onKeyDown={(e) => e.key === "Enter" && addOption()}
        />
        <button type="button" className="parts-btn" onClick={addOption}>
          Add
        </button>
      </div>
    </div>
  );
}

function FieldPropertiesPanel({ field, onUpdate }) {
  if (!field) {
    return (
      <div className="forms-properties-empty">
        <p className="forms-muted">Select a field on the canvas to edit its properties.</p>
      </div>
    );
  }

  const showPlaceholder = PLACEHOLDER_TYPES.has(field.type);
  const showValidation = ["text", "textarea", "email", "hyperlink"].includes(field.type);
  const showNumberValidation = field.type === "number";
  const showOptions = field.type === "dropdown" || field.type === "radio";
  const showDropdownMode = field.type === "dropdown";
  const showFileSettings = field.type === "file";
  const showDateSettings = field.type === "date";

  const toggleAllowedType = (typeValue) => {
    const current = field.allowedTypes || [...DEFAULT_FILE_TYPES];
    const next = current.includes(typeValue)
      ? current.filter((item) => item !== typeValue)
      : [...current, typeValue];
    onUpdate(field.id, { allowedTypes: next });
  };

  return (
    <div className="forms-properties-form">
      <div className="forms-prop-section">
        <h5 className="forms-prop-section-title">Field type</h5>
        <p className="forms-prop-type-value">{fieldTypeLabel(field.type)}</p>
      </div>

      <label className="forms-prop-field">
        Label
        <input
          className="forms-control"
          value={field.label || ""}
          onChange={(e) => onUpdate(field.id, { label: e.target.value })}
        />
      </label>

      {showPlaceholder && (
        <label className="forms-prop-field">
          Placeholder
          <input
            className="forms-control"
            value={field.placeholder || ""}
            onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
          />
        </label>
      )}

      {field.type !== "checkbox" && field.type !== "file" && (
        <label className="forms-prop-field">
          Default value
          <input
            className="forms-control"
            value={field.defaultValue || ""}
            onChange={(e) => onUpdate(field.id, { defaultValue: e.target.value })}
          />
        </label>
      )}

      <div className="forms-prop-toggles">
        <label className="forms-checkbox-row">
          <input
            type="checkbox"
            checked={Boolean(field.required)}
            onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
          />
          Required
        </label>
        <label className="forms-checkbox-row">
          <input
            type="checkbox"
            checked={Boolean(field.readOnly)}
            onChange={(e) => onUpdate(field.id, { readOnly: e.target.checked })}
          />
          Read only
        </label>
      </div>

      {showDropdownMode && (
        <div className="forms-prop-section">
          <h5 className="forms-prop-section-title">Dropdown settings</h5>
          <label className="forms-prop-field">
            Selection mode
            <select
              className="forms-control"
              value={field.multiple ? "multiple" : "single"}
              onChange={(e) =>
                onUpdate(field.id, { multiple: e.target.value === "multiple" })
              }
            >
              <option value="single">Single select</option>
              <option value="multiple">Multi select</option>
            </select>
          </label>
        </div>
      )}

      {showOptions && <OptionsEditor field={field} onUpdate={onUpdate} />}

      {showValidation && (
        <div className="forms-prop-section">
          <h5 className="forms-prop-section-title">Validation</h5>
          <label className="forms-prop-field">
            Min length
            <input
              className="forms-control"
              type="number"
              min="0"
              value={field.minLength || ""}
              onChange={(e) => onUpdate(field.id, { minLength: e.target.value })}
            />
          </label>
          <label className="forms-prop-field">
            Max length
            <input
              className="forms-control"
              type="number"
              min="0"
              value={field.maxLength || ""}
              onChange={(e) => onUpdate(field.id, { maxLength: e.target.value })}
            />
          </label>
          <label className="forms-prop-field">
            Regex pattern
            <input
              className="forms-control"
              value={field.pattern || ""}
              onChange={(e) => onUpdate(field.id, { pattern: e.target.value })}
              placeholder="^[A-Za-z]+$"
            />
          </label>
        </div>
      )}

      {showNumberValidation && (
        <div className="forms-prop-section">
          <h5 className="forms-prop-section-title">Validation</h5>
          <label className="forms-prop-field">
            Minimum
            <input
              className="forms-control"
              type="number"
              value={field.min || ""}
              onChange={(e) => onUpdate(field.id, { min: e.target.value })}
            />
          </label>
          <label className="forms-prop-field">
            Maximum
            <input
              className="forms-control"
              type="number"
              value={field.max || ""}
              onChange={(e) => onUpdate(field.id, { max: e.target.value })}
            />
          </label>
        </div>
      )}

      {showFileSettings && (
        <div className="forms-prop-section">
          <h5 className="forms-prop-section-title">File settings</h5>
          <div className="forms-file-types">
            {FILE_TYPE_OPTIONS.map((item) => (
              <label key={item.value} className="forms-checkbox-row">
                <input
                  type="checkbox"
                  checked={(field.allowedTypes || DEFAULT_FILE_TYPES).includes(item.value)}
                  onChange={() => toggleAllowedType(item.value)}
                />
                {item.label}
              </label>
            ))}
          </div>
          <label className="forms-prop-field">
            Maximum file size (MB)
            <input
              className="forms-control"
              type="number"
              min="1"
              value={field.maxFileSizeMb ?? 25}
              onChange={(e) =>
                onUpdate(field.id, { maxFileSizeMb: Number(e.target.value) || 25 })
              }
            />
          </label>
          <label className="forms-checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(field.multipleFiles)}
              onChange={(e) => onUpdate(field.id, { multipleFiles: e.target.checked })}
            />
            Allow multiple files
          </label>
        </div>
      )}

      {showDateSettings && (
        <div className="forms-prop-section">
          <h5 className="forms-prop-section-title">Date settings</h5>
          <label className="forms-prop-field">
            Minimum date
            <input
              className="forms-control"
              type="date"
              value={field.minDate || ""}
              onChange={(e) => onUpdate(field.id, { minDate: e.target.value })}
            />
          </label>
          <label className="forms-prop-field">
            Maximum date
            <input
              className="forms-control"
              type="date"
              value={field.maxDate || ""}
              onChange={(e) => onUpdate(field.id, { maxDate: e.target.value })}
            />
          </label>
          <label className="forms-prop-field">
            Default
            <select
              className="forms-control"
              value={field.defaultDate || ""}
              onChange={(e) => onUpdate(field.id, { defaultDate: e.target.value })}
            >
              <option value="">None</option>
              <option value="today">Today</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

export default FieldPropertiesPanel;
