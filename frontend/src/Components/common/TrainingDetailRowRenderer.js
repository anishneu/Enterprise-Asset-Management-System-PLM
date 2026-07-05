import { formatFieldValue, getDocFieldEntries } from "../docs/docFormUtils";

function formatDateTime(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function TrainingDetailRowRenderer(props) {
  const row = props.data ?? props.node?.data;
  const record = row?.record;

  if (!record) return null;

  const trainingFields = getDocFieldEntries({ fielddata: record.fielddata });

  return (
    <div className="doc-row-detail">
      <section className="doc-row-detail-section">
        <h4 className="doc-row-detail-heading">Training Details</h4>
        <dl className="doc-row-detail-list">
          <div>
            <dt>Training ID</dt>
            <dd>{record.id ?? "—"}</dd>
          </div>
          <div>
            <dt>Form</dt>
            <dd>{record.title || "—"}</dd>
          </div>
          <div>
            <dt>Completion status</dt>
            <dd>{record.completionstatus || "Pending"}</dd>
          </div>
          <div>
            <dt>Assign date</dt>
            <dd>{formatDateTime(record.assigndate)}</dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{formatDateTime(record.duedate)}</dd>
          </div>
          <div>
            <dt>Trainee</dt>
            <dd>{record.trainee || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="doc-row-detail-section">
        <h4 className="doc-row-detail-heading">Form Data</h4>
        {trainingFields.length > 0 ? (
          <dl className="doc-row-detail-list doc-row-detail-list--fields">
            {trainingFields.map((field) => (
              <div key={field.id}>
                <dt>{field.label}</dt>
                <dd>{formatFieldValue(field.value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="doc-row-detail-empty">No form data recorded.</p>
        )}
      </section>
    </div>
  );
}

export default TrainingDetailRowRenderer;
