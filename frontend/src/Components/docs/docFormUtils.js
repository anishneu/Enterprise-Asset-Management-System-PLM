import DocFileField from "./DocFileField";
import { isFileFieldValue, normalizeLegacyFileValue } from "./docFileUtils";

export function parseFormTemplate(fmjson) {
  if (!fmjson) return { name: "", fields: [] };

  try {
    const parsed = typeof fmjson === "string" ? JSON.parse(fmjson) : fmjson;
    return {
      name: parsed.name || "",
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
    };
  } catch {
    return { name: "", fields: [] };
  }
}

function defaultFieldValue(field) {
  if (field.type === "checkbox") return false;
  if (field.type === "file") return null;
  return "";
}

export function buildFieldValues(fields, valuesById) {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    custom: Boolean(field.custom),
    value: valuesById[field.id] ?? defaultFieldValue(field),
  }));
}

export function getDocAttachments(doc) {
  const attachments = doc?.fielddata?.attachments;
  return Array.isArray(attachments) ? attachments : [];
}

export function getDocCustomFields(doc) {
  const entries = getDocFieldEntries(doc);
  const customFields = doc?.fielddata?.customFields;

  if (Array.isArray(customFields) && customFields.length > 0) {
    return customFields.map((field) => {
      const saved = entries.find((entry) => entry.id === field.id);
      return {
        ...field,
        value: saved?.value ?? defaultFieldValue(field),
      };
    });
  }

  return entries.filter((entry) => entry.custom);
}

export function isFieldValueFilled(field, value) {
  if (field.type === "checkbox") return Boolean(value);
  if (field.type === "file") {
    if (isFileFieldValue(value)) return Boolean(value.dataUrl || value.legacy);
    return Boolean(normalizeLegacyFileValue(value));
  }
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function DocFormRenderer({ fields, values, onChange, readOnly = false }) {
  const handleChange = (fieldId, value) => {
    if (readOnly) return;
    onChange(fieldId, value);
  };

  return (
    <div className="doc-form-fields">
      {fields.length === 0 ? (
        <p className="doc-form-empty">This form has no fields yet. You can still save the document and add attachments.</p>
      ) : null}
      {fields.map((field) => {
        const value =
          values[field.id] ??
          (field.type === "checkbox" ? false : field.type === "file" ? null : "");
        const common = {
          className: "doc-form-control",
          disabled: readOnly,
          onChange: (e) =>
            handleChange(
              field.id,
              e.target.type === "checkbox" ? e.target.checked : e.target.value
            ),
        };

        switch (field.type) {
          case "textarea":
            return (
              <label key={field.id} className="doc-form-field">
                <span className="doc-form-label">
                  {field.label}
                  {field.required && <span className="doc-form-required">*</span>}
                </span>
                <textarea {...common} rows={3} value={value} />
              </label>
            );
          case "dropdown":
            return (
              <label key={field.id} className="doc-form-field">
                <span className="doc-form-label">
                  {field.label}
                  {field.required && <span className="doc-form-required">*</span>}
                </span>
                <select {...common} value={value}>
                  <option value="">Select an option</option>
                  {(field.options || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            );
          case "checkbox":
            return (
              <label key={field.id} className="doc-form-field doc-form-field-inline">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={Boolean(value)}
                  onChange={(e) => handleChange(field.id, e.target.checked)}
                />
                <span className="doc-form-label">
                  {field.label}
                  {field.required && <span className="doc-form-required">*</span>}
                </span>
              </label>
            );
          case "radio":
            return (
              <fieldset key={field.id} className="doc-form-field">
                <legend className="doc-form-label">
                  {field.label}
                  {field.required && <span className="doc-form-required">*</span>}
                </legend>
                <div className="doc-form-radio-group">
                  {(field.options || []).map((option) => (
                    <label key={option} className="doc-form-field-inline">
                      <input
                        type="radio"
                        name={`doc-field-${field.id}`}
                        disabled={readOnly}
                        checked={value === option}
                        onChange={() => handleChange(field.id, option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          case "file":
            return (
              <DocFileField
                key={field.id}
                field={field}
                value={value}
                readOnly={readOnly}
                onChange={(nextValue) => handleChange(field.id, nextValue)}
              />
            );
          case "hyperlink":
            return (
              <label key={field.id} className="doc-form-field">
                <span className="doc-form-label">
                  {field.label}
                  {field.required && <span className="doc-form-required">*</span>}
                </span>
                <input
                  {...common}
                  type="url"
                  value={value}
                  placeholder={field.placeholder || "https://example.com"}
                />
              </label>
            );
          default:
            return (
              <label key={field.id} className="doc-form-field">
                <span className="doc-form-label">
                  {field.label}
                  {field.required && <span className="doc-form-required">*</span>}
                </span>
                <input
                  {...common}
                  type={field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={value}
                  placeholder={field.placeholder || ""}
                />
              </label>
            );
        }
      })}
    </div>
  );
}

export function formatDocDisplayName(doc) {
  if (!doc) return "";
  return doc.dname || "";
}

export function buildDocDescription({ ftype, dtype, fmat, drev } = {}) {
  const typeLabel = dtype || ftype;
  const parts = [typeLabel, fmat].filter(Boolean);
  if (parts.length === 0) return "";

  const base = parts.join(" — ");
  const revision = (drev || "").trim();
  return revision ? `${base} (Rev ${revision})` : base;
}

export function resolveDocDescription(doc) {
  if (!doc) return "—";
  const stored = (doc.ddesc || "").trim();
  if (stored) return stored;
  return buildDocDescription(doc) || "—";
}

export function formatFieldValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isFileFieldValue(value)) return value.fileName || "—";
  if (value && typeof value === "object" && value.fileName) {
    return value.fileName;
  }
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function formatWorkflowDate(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

export function getDocFieldEntries(doc) {
  const entries = doc?.fielddata?.values;
  if (Array.isArray(entries)) return entries;
  return [];
}
