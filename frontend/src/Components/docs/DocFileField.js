import {
  isFileFieldValue,
  normalizeLegacyFileValue,
  readFileAsDataUrl,
} from "./docFileUtils";
import DocFilePreview from "./DocFilePreview";

function DocFileField({ field, value, readOnly = false, onChange }) {
  const fileValue = isFileFieldValue(value)
    ? value
    : normalizeLegacyFileValue(value);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const payload = await readFileAsDataUrl(file);
      onChange(payload);
    } catch (err) {
      window.alert(err.message || "Could not upload file.");
    }
  };

  return (
    <label className="doc-form-field">
      <span className="doc-form-label">
        {field.label}
        {field.required && <span className="doc-form-required">*</span>}
      </span>

      {!readOnly && (
        <div className="doc-file-input-row">
          <input
            type="file"
            className="doc-form-control doc-form-control-file"
            onChange={handleFileChange}
          />
          {fileValue && (
            <button
              type="button"
              className="parts-btn"
              onClick={() => onChange(null)}
            >
              Remove
            </button>
          )}
        </div>
      )}

      {fileValue ? (
        <DocFilePreview file={fileValue} compact={readOnly} />
      ) : (
        <p className="forms-muted doc-file-empty">No file attached.</p>
      )}

      {!readOnly && (
        <p className="forms-muted doc-file-hint">Maximum file size: 3 MB.</p>
      )}
    </label>
  );
}

export default DocFileField;
