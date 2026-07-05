import { parseFormTemplate } from "../docs/docFormUtils";

function FormDetailRowRenderer({ data }) {
  if (!data?.detailRow) return null;

  const form = data.form;
  const template = parseFormTemplate(form.fmjson);
  const templateFields = template.fields || [];

  return (
    <div className="forms-saved-detail">
      <h4 className="forms-saved-detail-heading">Form content</h4>
      {templateFields.length > 0 ? (
        <dl className="forms-saved-detail-list forms-saved-detail-list--fields">
          {templateFields.map((field) => (
            <div key={field.id}>
              <dt>
                {field.label}
                {field.required && <span className="forms-required">*</span>}
              </dt>
              <dd>
                {field.type}
                {field.options?.length ? ` · ${field.options.join(", ")}` : ""}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="forms-muted">No fields in this form template.</p>
      )}
    </div>
  );
}

export default FormDetailRowRenderer;
