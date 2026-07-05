function FormFieldControl({ field, interactive }) {
  const disabled = !interactive || field.readOnly;
  const placeholder = field.placeholder || "";
  const options = field.options || [];

  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          className="forms-control"
          disabled={disabled}
          placeholder={placeholder}
          readOnly={!interactive || field.readOnly}
          defaultValue={field.defaultValue || ""}
        />
      );
    case "email":
      return (
        <input
          type="email"
          className="forms-control"
          disabled={disabled}
          placeholder={placeholder || "name@example.com"}
          readOnly={!interactive || field.readOnly}
          defaultValue={field.defaultValue || ""}
        />
      );
    case "textarea":
      return (
        <textarea
          className="forms-control"
          disabled={disabled}
          placeholder={placeholder}
          readOnly={!interactive || field.readOnly}
          rows={3}
          defaultValue={field.defaultValue || ""}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className="forms-control"
          disabled={disabled}
          placeholder={placeholder}
          readOnly={!interactive || field.readOnly}
          min={field.min || undefined}
          max={field.max || undefined}
          defaultValue={field.defaultValue || ""}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className="forms-control"
          disabled={disabled}
          readOnly={!interactive || field.readOnly}
          min={field.minDate || undefined}
          max={field.maxDate || undefined}
        />
      );
    case "dropdown":
      return (
        <select
          className="forms-control"
          disabled={disabled}
          multiple={Boolean(field.multiple)}
          defaultValue={field.defaultValue || ""}
        >
          {!field.multiple && <option value="">{placeholder || "Select an option"}</option>}
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
          <input
            type="checkbox"
            disabled={disabled}
            defaultChecked={Boolean(field.defaultValue)}
          />
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
                readOnly={!interactive || field.readOnly}
                defaultChecked={field.defaultValue === option}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );
    case "file":
      return (
        <div className="forms-file-preview-control">
          <input
            type="file"
            className="forms-control forms-control-file"
            disabled={disabled}
            multiple={Boolean(field.multipleFiles)}
          />
          {field.allowedTypes?.length > 0 && (
            <span className="forms-muted forms-file-hint">
              Allowed: {field.allowedTypes.join(", ").toUpperCase()} · Max{" "}
              {field.maxFileSizeMb || 25} MB
            </span>
          )}
        </div>
      );
    case "hyperlink":
      return (
        <input
          type="url"
          className="forms-control"
          disabled={disabled}
          placeholder={placeholder || "https://example.com"}
          readOnly={!interactive || field.readOnly}
          defaultValue={field.defaultValue || ""}
        />
      );
    default:
      return (
        <input
          type="text"
          className="forms-control"
          disabled={disabled}
          readOnly={!interactive || field.readOnly}
        />
      );
  }
}

export default FormFieldControl;
