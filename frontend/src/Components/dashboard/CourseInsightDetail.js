import { courseStatusClass, formatTrainingDate } from "../../constants/trainingPlm";

function resolveTrainerLabel(course, users = []) {
  if (course?.trainer_name) return course.trainer_name;
  if (course?.trainer_user_id) {
    const user = users.find((item) => item.id === course.trainer_user_id);
    return user?.username || user?.name || course.trainer_user_id;
  }
  return "—";
}

function CourseInsightDetail({ course, users = [], onEdit, onRelease, onRevise }) {
  if (!course) return null;

  return (
    <>
      <p className="page-insight-doc-name">{course.course_name}</p>
      <p className="page-insight-audit-target">
        {course.course_code} · Rev {course.revision} ·{" "}
        <span className={`training-status-pill ${courseStatusClass(course.status)}`}>
          {course.status}
        </span>
      </p>

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
          <dt>Due date</dt>
          <dd>{formatTrainingDate(course.release_due_date)}</dd>
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

      <div className="page-insight-block page-insight-block--nested">
        <h4>Trainees</h4>
        {(course.assignees || []).length === 0 && (course.assignee_groups || []).length === 0 ? (
          <p className="page-insight-empty">No trainees assigned.</p>
        ) : (
          <ul className="training-course-audience-list">
            {(course.assignees || []).map((item) => (
              <li key={item.user_id}>{item.user_display || item.user_id}</li>
            ))}
            {(course.assignee_groups || []).map((item) => (
              <li key={item.group_id}>Group: {item.group_name || item.group_id}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="page-insight-actions">
        {course.status === "Draft" && onEdit && (
          <button type="button" className="parts-btn" onClick={() => onEdit(course)}>
            Edit
          </button>
        )}
        {course.status === "Draft" && onRelease && (
          <button type="button" className="parts-btn primary" onClick={() => onRelease(course)}>
            Release
          </button>
        )}
        {course.status === "Released" && onRevise && (
          <button type="button" className="parts-btn" onClick={() => onRevise(course)}>
            Revise
          </button>
        )}
      </div>
    </>
  );
}

export default CourseInsightDetail;
