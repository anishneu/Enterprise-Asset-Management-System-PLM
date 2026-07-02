import { COMPLETION_STATUSES } from "../../constants/trainingCatalog";
import DocFormBuilderPanel from "../docs/DocFormBuilderPanel";
import AuditHistoryPanel from "../common/AuditHistoryPanel";
import { ENTITY_LABELS } from "../../constants/auditEntityTypes";
import { SECTION_AUDIT_ENTITY, sectionAuditTitle } from "../../constants/sectionAudit";
import CourseInsightDetail from "./CourseInsightDetail";
import { usePageInsight } from "./PageInsightContext";

function formatInsightDateTime(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function UserInsightDetail({ userDetail }) {
  if (!userDetail) return null;

  return (
    <>
      <p className="page-insight-doc-name">{userDetail.name || userDetail.username}</p>
      <dl className="page-insight-list">
        <div>
          <dt>Username</dt>
          <dd>{userDetail.username || "—"}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{userDetail.email || "—"}</dd>
        </div>
        <div>
          <dt>Groups</dt>
          <dd>{userDetail.groups || "—"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{userDetail.status || "Active"}</dd>
        </div>
      </dl>
    </>
  );
}

function TrainingInsightDetail({ trainingDetail, onStatusChange, statusSaving }) {
  if (!trainingDetail) return null;

  return (
    <>
      <p className="page-insight-doc-name">{trainingDetail.title || "Training record"}</p>
      <dl className="page-insight-list">
        <div>
          <dt>Training ID</dt>
          <dd>{trainingDetail.id}</dd>
        </div>
        <div>
          <dt>Trainee</dt>
          <dd>{trainingDetail.trainee || "—"}</dd>
        </div>
        <div>
          <dt>Assign date</dt>
          <dd>{formatInsightDateTime(trainingDetail.assigndate)}</dd>
        </div>
        <div>
          <dt>Due date</dt>
          <dd>{formatInsightDateTime(trainingDetail.duedate)}</dd>
        </div>
      </dl>

      <div className="page-insight-block page-insight-block--nested">
        <h4>Completion status</h4>
        <label className="page-insight-field">
          <span className="page-insight-field-label">Status</span>
          <select
            className="page-insight-control"
            value={trainingDetail.completionstatus || "Pending"}
            onChange={(event) => onStatusChange?.(trainingDetail.id, event.target.value)}
            disabled={statusSaving}
          >
            {COMPLETION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}

function DocInsightDetail({ docDetail }) {
  if (!docDetail) return null;

  if (docDetail.hint) {
    return <p className="page-insight-empty">{docDetail.hint}</p>;
  }

  if (!docDetail.fielddataJson) {
    return <p className="page-insight-empty">No JSON data for this document.</p>;
  }

  return (
    <pre className="page-insight-json page-insight-json--solo">{docDetail.fielddataJson}</pre>
  );
}

function SectionAuditBlock({ section, entityType, entityId, title }) {
  return (
    <div className="page-insight-block page-insight-block--audit">
      <div className="page-insight-block-head">
        <h4>{title}</h4>
      </div>
      <AuditHistoryPanel
        entityType={entityType || undefined}
        entityId={entityId ?? undefined}
        compact
        limit={entityId != null ? 12 : 15}
        emptyMessage="No changes recorded yet."
      />
    </div>
  );
}

function SectionInsightPanel({ section, insight = {} }) {
  const { clearDetail } = usePageInsight();
  const isDocsSection = section === "docs";
  const isTrainingSection = section === "training";
  const isUsersSection = section === "users";
  const sectionEntityType = SECTION_AUDIT_ENTITY[section] || null;

  const hasCourseDetail = Boolean(insight.courseDetail);
  const hasDocFormBuilder = isDocsSection && insight.docFormBuilder;
  const hasDocDetail = isDocsSection && insight.docDetail && !hasDocFormBuilder;
  const hasTrainingDetail = isTrainingSection && insight.trainingDetail;
  const hasUserDetail = isUsersSection && insight.userDetail;
  const hasEntityAudit = insight.auditEntity?.type && insight.auditEntity.id != null;

  const showItemDetail =
    hasCourseDetail || hasDocFormBuilder || hasDocDetail || hasTrainingDetail || hasUserDetail;

  const panelTitle = (() => {
    if (hasDocFormBuilder) return "Form builder";
    if (hasCourseDetail) return "Course details";
    if (hasDocDetail && insight.docDetail?.fielddataJson) return "JSON";
    if (hasDocDetail && insight.docDetail?.editingDocName) return insight.docDetail.editingDocName;
    if (hasTrainingDetail) return "Training record";
    if (hasUserDetail) return "User account";
    if (hasEntityAudit) return "Item history";
    return sectionAuditTitle(section);
  })();

  return (
    <aside
      className={`page-insight${insight.docFormBuilder ? " page-insight--form-builder" : ""}`}
      aria-label="Section details"
    >
      <div className="page-insight-header">
        <h3>{panelTitle}</h3>
        {showItemDetail && (
          <button
            type="button"
            className="page-insight-back-btn"
            onClick={clearDetail}
          >
            Back to log
          </button>
        )}
      </div>

      <div className="page-insight-scroll">
      {hasDocFormBuilder ? (
        <div className="page-insight-block page-insight-block--form-builder">
          <DocFormBuilderPanel compact {...insight.docFormBuilder} />
        </div>
      ) : (
        <>
          {hasCourseDetail && (
            <div className="page-insight-block">
              <CourseInsightDetail
                course={insight.courseDetail}
                users={insight.courseUsers || []}
                onEdit={insight.onCourseEdit}
                onRelease={insight.onCourseRelease}
                onRevise={insight.onCourseRevise}
              />
            </div>
          )}

          {hasDocDetail && (
            <div className="page-insight-block">
              <DocInsightDetail docDetail={insight.docDetail} />
            </div>
          )}

          {hasTrainingDetail && (
            <div className="page-insight-block">
              <TrainingInsightDetail
                trainingDetail={insight.trainingDetail}
                onStatusChange={insight.onTrainingStatusChange}
                statusSaving={insight.trainingStatusSaving}
              />
            </div>
          )}

          {hasUserDetail && (
            <div className="page-insight-block">
              <UserInsightDetail userDetail={insight.userDetail} />
            </div>
          )}

          {hasEntityAudit && !hasCourseDetail && (
            <div className="page-insight-block page-insight-block--nested">
              <p className="page-insight-audit-target">
                {ENTITY_LABELS[insight.auditEntity.type] || insight.auditEntity.type}
                {insight.auditEntity.label ? ` · ${insight.auditEntity.label}` : ""}
                {insight.auditEntity.revision ? ` (rev ${insight.auditEntity.revision})` : ""}
              </p>
            </div>
          )}

          <SectionAuditBlock
            section={section}
            entityType={
              hasEntityAudit && !hasCourseDetail
                ? insight.auditEntity.type
                : showItemDetail && hasCourseDetail
                  ? "training"
                  : sectionEntityType
            }
            entityId={
              hasEntityAudit && !hasCourseDetail
                ? insight.auditEntity.id
                : showItemDetail && hasCourseDetail
                  ? insight.courseDetail.id
                  : null
            }
            title={
              showItemDetail
                ? hasCourseDetail
                  ? "Course activity"
                  : "Item activity"
                : sectionAuditTitle(section)
            }
          />
        </>
      )}
      </div>
    </aside>
  );
}

export default SectionInsightPanel;
