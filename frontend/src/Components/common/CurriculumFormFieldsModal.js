import { useEffect, useMemo, useState } from "react";

import apiClient from "../../api/client";
import DocFormBuilderPanel from "../docs/DocFormBuilderPanel";
import {
  DocFormRenderer,
  buildFieldValues,
  getDocFieldEntries,
  parseFormTemplate,
} from "../docs/docFormUtils";
import { normalizeFormField } from "../forms/formBuilderConstants";

function buildInitialFormValues(fields, fielddata, customFields = []) {
  const saved = getDocFieldEntries({ fielddata });
  const values = {};
  [...fields, ...customFields].forEach((field) => {
    const entry = saved.find((item) => item.id === field.id);
    if (entry) {
      values[field.id] = entry.value;
    } else if (field.type === "checkbox") {
      values[field.id] = false;
    } else if (field.type === "file") {
      values[field.id] = null;
    } else {
      values[field.id] = "";
    }
  });
  return values;
}

function CurriculumFormFieldsModal({
  open,
  formId,
  fielddata,
  onClose,
  onSave,
  saving = false,
}) {
  const [templateFields, setTemplateFields] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !formId) {
      setTemplateFields([]);
      setCustomFields([]);
      setFieldValues({});
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    apiClient
      .get(`/forms/${formId}`)
      .then((res) => {
        if (cancelled) return;
        const template = parseFormTemplate(res.data?.fmjson);
        const fields = template.fields.map((field) => normalizeFormField(field));
        const savedCustom = (fielddata?.customFields || []).map((field) =>
          normalizeFormField(field)
        );
        setTemplateFields(fields);
        setCustomFields(savedCustom);
        setFieldValues(buildInitialFormValues(fields, fielddata, savedCustom));
      })
      .catch(() => {
        if (!cancelled) {
          setTemplateFields([]);
          setCustomFields([]);
          setFieldValues({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, formId, fielddata]);

  const allFields = useMemo(
    () => [...templateFields, ...customFields],
    [templateFields, customFields]
  );

  const handleAddCustomField = (field, initialValue) => {
    setCustomFields((prev) => [...prev, field]);
    setFieldValues((prev) => ({ ...prev, [field.id]: initialValue }));
  };

  const handleRemoveCustomField = (fieldId) => {
    setCustomFields((prev) => prev.filter((field) => field.id !== fieldId));
    setFieldValues((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const handleSave = () => {
    onSave?.({
      fielddata: {
        formId: Number(formId),
        values: buildFieldValues(allFields, fieldValues),
        customFields,
      },
      previewFields: allFields,
      previewValues: fieldValues,
    });
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose?.()}>
      <div
        className="modal training-plm-modal training-plm-modal--wide training-plm-modal--scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="training-modal-header">
          <h3>Form fields</h3>
          <button
            type="button"
            className="training-modal-close"
            onClick={() => !saving && onClose?.()}
            disabled={saving}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="training-modal-body training-form-fields-modal-body">
          {loading ? (
            <p className="training-plm-empty">Loading form template…</p>
          ) : !formId ? (
            <p className="training-plm-empty">Select a training form first.</p>
          ) : (
            <div className="training-form-fields-layout">
              <section className="training-form-fields-main">
                <h4>Template responses</h4>
                <p className="training-curriculum-panel-hint">
                  Set default values or instructions trainees will see on their training record.
                </p>
                {allFields.length === 0 ? (
                  <p className="training-plm-empty">No fields yet. Add fields with the mini builder.</p>
                ) : (
                  <div className="doc-form-fields">
                    <DocFormRenderer
                      fields={allFields}
                      values={fieldValues}
                      onChange={(fieldId, value) =>
                        setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
                      }
                    />
                  </div>
                )}
              </section>
              <aside className="training-form-fields-aside">
                <DocFormBuilderPanel
                  compact
                  customFields={customFields}
                  onAddField={handleAddCustomField}
                  onRemoveField={handleRemoveCustomField}
                />
              </aside>
            </div>
          )}
        </div>

        <div className="training-modal-footer modal-actions">
          <button type="button" className="parts-btn" onClick={() => onClose?.()} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="parts-btn primary" onClick={handleSave} disabled={saving || !formId}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default CurriculumFormFieldsModal;
