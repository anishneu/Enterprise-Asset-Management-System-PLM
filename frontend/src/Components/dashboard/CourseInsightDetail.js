import { formatTrainingDate } from "../../constants/trainingPlm";

function resolveTrainerLabel(course, users = []) {
  if (course?.trainer_name) return course.trainer_name;
  if (course?.trainer_user_id) {
    const user = users.find((item) => item.id === course.trainer_user_id);
    return user?.username || user?.name || course.trainer_user_id;
  }
  return "—";
}

function CourseInsightDetail({ course, users = [], onEdit }) {
  if (!course) return null;

  return (
    <>
      <p className="page-insight-doc-name">{course.course_name}</p>
      <p className="page-insight-audit-target">{course.course_code} · Rev {course.revision}</p>

      <dl className="page-insight-list">
        <div>
          <dt>Category</dt>
          <dd>{course.category || "—"}</dd>
        </div>
        <div>
          <dt>Training form</dt>
          <dd>{course.form_name || "—"}</dd>
        </div>
        <div>
          <dt>Trainer</dt>
          <dd>{resolveTrainerLabel(course, users)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{formatTrainingDate(course.updated_at)}</dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd>{course.description || "—"}</dd>
        </div>
      </dl>

      <div className="page-insight-block page-insight-block--nested">
        <h4>Linked documents</h4>
        {(course.documents || []).length === 0 ? (
          <p className="page-insight-empty">No documents attached.</p>
        ) : (
          <ul className="training-course-doc-links">
            {(course.documents || []).map((doc) => (
              <li key={doc.doc_id}>
                <span>
                  {doc.doc_name || `Document ${doc.doc_id}`}
                  {doc.doc_revision ? ` · Rev ${doc.doc_revision}` : ""}
                </span>
                {doc.doc_link ? (
                  <a href={doc.doc_link} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : (
                  <span className="training-course-doc-ref">#{doc.doc_id}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="page-insight-actions">
        {onEdit && (
          <button type="button" className="parts-btn" onClick={() => onEdit(course)}>
            Edit
          </button>
        )}
      </div>
    </>
  );
}

export default CourseInsightDetail;
