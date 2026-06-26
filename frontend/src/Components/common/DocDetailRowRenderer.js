import WorkflowStatusBadge from "./WorkflowStatusBadge";
import {
  formatFieldValue,
  formatWorkflowDate,
  getDocFieldEntries,
  resolveDocDescription,
} from "../docs/docFormUtils";

function renderFieldValue(field) {
  const value = field?.value;
  if (value === null || value === undefined || value === "") return "—";

  const text = String(value);
  const isLink =
    field?.type === "hyperlink" || /^https?:\/\//i.test(text.trim());

  if (isLink) {
    const href = text.trim();
    return (
      <a className="workflow-link" href={href} target="_blank" rel="noreferrer">
        {href}
      </a>
    );
  }

  return formatFieldValue(value);
}

function DocDetailRowRenderer(props) {
  const row = props.data ?? props.node?.data;
  const doc = row?.doc;
  if (!doc) return null;

  const fields = getDocFieldEntries(doc);

  return (
    <div className="doc-row-detail">
      <section className="doc-row-detail-section">
        <h4 className="doc-row-detail-heading">Document details</h4>
        <dl className="doc-row-detail-list">
          <div>
            <dt>Name</dt>
            <dd>{doc.dname || "—"}</dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{resolveDocDescription(doc)}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{doc.dtype || "—"}</dd>
          </div>
          <div>
            <dt>Form</dt>
            <dd>{doc.fmat || "—"}</dd>
          </div>
          <div>
            <dt>Revision</dt>
            <dd>{doc.drev || "1"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <WorkflowStatusBadge status={doc.dstatus} />
            </dd>
          </div>
          {doc.downer && (
            <div>
              <dt>Owner</dt>
              <dd>{doc.downer}</dd>
            </div>
          )}
          {doc.dapprover && (
            <div>
              <dt>Approver</dt>
              <dd>{doc.dapprover}</dd>
            </div>
          )}
          {doc.deffective && (
            <div>
              <dt>Effective date</dt>
              <dd>{formatWorkflowDate(doc.deffective)}</dd>
            </div>
          )}
          <div>
            <dt>Created</dt>
            <dd>{doc.created || doc.updated || "—"}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{doc.updated || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="doc-row-detail-section">
        <h4 className="doc-row-detail-heading">Form responses</h4>
        {fields.length > 0 ? (
          <dl className="doc-row-detail-list doc-row-detail-list--fields">
            {fields.map((field) => (
              <div key={field.id ?? field.label}>
                <dt>{field.label || "Field"}</dt>
                <dd>{renderFieldValue(field)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="doc-row-detail-empty">No form responses recorded.</p>
        )}
      </section>
    </div>
  );
}

export default DocDetailRowRenderer;
