export const FIELD_PALETTE = [
  { id: "text", label: "Text", type: "text", icon: "T" },
  { id: "textarea", label: "Text Area", type: "textarea", icon: "¶" },
  { id: "number", label: "Number", type: "number", icon: "#" },
  { id: "dropdown", label: "Dropdown", type: "dropdown", icon: "▼" },
  { id: "date", label: "Date", type: "date", icon: "D" },
  { id: "email", label: "Email", type: "email", icon: "@" },
  { id: "checkbox", label: "Checkbox", type: "checkbox", icon: "☑" },
  { id: "radio", label: "Radio", type: "radio", icon: "○" },
  { id: "file", label: "File Upload", type: "file", icon: "📎" },
  { id: "hyperlink", label: "Hyperlink", type: "hyperlink", icon: "🔗" },
];

export const PLACEHOLDER_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "email",
  "hyperlink",
]);

export const FILE_TYPE_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "xlsx", label: "XLSX" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
];

export const DEFAULT_FILE_TYPES = FILE_TYPE_OPTIONS.map((item) => item.value);

export function createFieldFromPalette(paletteField, id = Date.now()) {
  const base = {
    id,
    label: paletteField.label,
    type: paletteField.type,
    placeholder: "",
    required: false,
    readOnly: false,
    hidden: false,
    defaultValue: "",
    minLength: "",
    maxLength: "",
    min: "",
    max: "",
    pattern: "",
    multiple: false,
    options:
      paletteField.type === "dropdown" || paletteField.type === "radio"
        ? ["Option 1", "Option 2"]
        : [],
    allowedTypes: [...DEFAULT_FILE_TYPES],
    maxFileSizeMb: 25,
    multipleFiles: false,
    minDate: "",
    maxDate: "",
    defaultDate: "",
  };

  return base;
}

export function normalizeFormField(field) {
  if (!field) return field;

  return {
    placeholder: "",
    required: false,
    readOnly: false,
    hidden: false,
    defaultValue: "",
    minLength: "",
    maxLength: "",
    min: "",
    max: "",
    pattern: "",
    multiple: Boolean(field.multiple),
    options: Array.isArray(field.options)
      ? field.options
      : field.type === "dropdown" || field.type === "radio"
        ? ["Option 1", "Option 2"]
        : [],
    allowedTypes: Array.isArray(field.allowedTypes)
      ? field.allowedTypes
      : [...DEFAULT_FILE_TYPES],
    maxFileSizeMb: field.maxFileSizeMb ?? 25,
    multipleFiles: Boolean(field.multipleFiles),
    minDate: field.minDate || "",
    maxDate: field.maxDate || "",
    defaultDate: field.defaultDate || "",
    ...field,
  };
}

export function fieldTypeLabel(type) {
  const match = FIELD_PALETTE.find((item) => item.type === type);
  return match?.label || type;
}
