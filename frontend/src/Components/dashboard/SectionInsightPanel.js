import { COMPLETION_STATUSES } from "../../constants/trainingCatalog";

const SECTION_META = {
  dashboard: {
    title: "Dashboard",
    status: "Live workspace metrics",
    references: ["Workflow overview", "Training & approvals"],
    properties: [
      { label: "Workspace", value: "TalonVault" },
      { label: "Charts", value: "Workflow, training, inventory" },
    ],
  },
  parts: {
    title: "Parts overview",
    status: "Inventory synced",
    references: ["ISO 9001 — Document control", "Internal part numbering SOP"],
    properties: [
      { label: "Data source", value: "MySQL / parts" },
      { label: "Revision tracking", value: "Enabled" },
    ],
  },
  docs: {
    title: "Documentation",
    status: "Controlled docs",
    references: ["Quality manual §4.2", "Form linkage registry"],
    properties: [
      { label: "Auth", value: "Keycloak required" },
      { label: "Linked forms", value: "By document type" },
    ],
  },
  users: {
    title: "User directory",
    status: "Keycloak managed",
    references: ["Realm: amsrealm", "Admin API integration"],
    properties: [
      { label: "Identity provider", value: "Keycloak" },
      { label: "Session", value: "Secure / SSO" },
    ],
  },
  groups: {
    title: "Group management",
    status: "Keycloak synced",
    references: ["Role-based access", "Permission matrix"],
    properties: [
      { label: "Source", value: "Keycloak groups API" },
      { label: "Permissions", value: "Hardcoded role map" },
    ],
  },
  training: {
    title: "Training records",
    status: "Assignments active",
    references: ["Training matrix (draft)", "Competency checklist"],
    properties: [
      { label: "Source", value: "traintab / Keycloak users" },
      { label: "Assignments", value: "Document-linked" },
    ],
  },
  approvals: {
    title: "Approvals",
    status: "Workflow queue active",
    references: ["Pending review queue", "Submission history"],
    properties: [
      { label: "Views", value: "Pending, mine, approved, rejected" },
      { label: "Engine", value: "Forms & documents" },
    ],
  },
  forms: {
    title: "Form builder",
    status: "Draft templates",
    references: ["Drag-and-drop field library", "JSON schema export"],
    properties: [
      { label: "Storage", value: "MySQL / forms" },
      { label: "Preview", value: "Available" },
    ],
  },
  asset: {
    title: "Assets",
    status: "Reference data",
    references: ["Asset register", "Linked documentation"],
    properties: [
      { label: "Source", value: "Asset API" },
      { label: "Updates", value: "Manual entry" },
    ],
  },
};

function formatInsightDateTime(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function UserInsightDetail({ userDetail }) {
  if (!userDetail) {
    return (
      <p className="page-insight-empty">
        Click a user to view account details.
      </p>
    );
  }

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
  if (!trainingDetail) {
    return (
      <p className="page-insight-empty">
        Click a training form to view details and update completion status.
      </p>
    );
  }

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
            onChange={(event) =>
              onStatusChange?.(trainingDetail.id, event.target.value)
            }
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
  if (!docDetail) {
    return (
      <p className="page-insight-empty">
        Click a document name to expand details and view JSON here.
      </p>
    );
  }

  if (!docDetail.fielddataJson) {
    return <p className="page-insight-empty">No JSON data for this document.</p>;
  }

  return (
    <pre className="page-insight-json page-insight-json--solo">{docDetail.fielddataJson}</pre>
  );
}

function SectionInsightPanel({ section, insight = {} }) {
  const meta = SECTION_META[section] || {
    title: "Section",
    status: "Active",
    references: [],
    properties: [],
  };

  const recordCount =
    insight.recordCount !== undefined ? insight.recordCount : "—";
  const selectedCount =
    insight.selectedCount !== undefined ? insight.selectedCount : 0;
  const isDocsSection = section === "docs";
  const isTrainingSection = section === "training";
  const isUsersSection = section === "users";

  return (
    <aside className="page-insight" aria-label="Section details">
      <div className="page-insight-header">
        <h3>
          {isDocsSection && insight.docDetail
            ? "JSON"
            : isTrainingSection && insight.trainingDetail
              ? "Training record"
              : isUsersSection && insight.userDetail
                ? "User account"
                : meta.title}
        </h3>
        <span className="page-insight-status">{insight.status || meta.status}</span>
      </div>

      {isDocsSection ? (
        <div className="page-insight-block">
          <DocInsightDetail docDetail={insight.docDetail} />
        </div>
      ) : isTrainingSection ? (
        <div className="page-insight-block">
          <TrainingInsightDetail
            trainingDetail={insight.trainingDetail}
            onStatusChange={insight.onTrainingStatusChange}
            statusSaving={insight.trainingStatusSaving}
          />
        </div>
      ) : isUsersSection ? (
        <div className="page-insight-block">
          <UserInsightDetail userDetail={insight.userDetail} />
        </div>
      ) : (
        <>
          <div className="page-insight-block">
            <h4>Live status</h4>
            <dl className="page-insight-list">
              <div>
                <dt>Records shown</dt>
                <dd>{recordCount}</dd>
              </div>
              <div>
                <dt>Selected rows</dt>
                <dd>{selectedCount}</dd>
              </div>
              {insight.extra &&
                Object.entries(insight.extra).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </div>

          <div className="page-insight-block">
            <h4>Properties</h4>
            <dl className="page-insight-list">
              {meta.properties.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="page-insight-block">
            <h4>References</h4>
            <ul className="page-insight-references">
              {meta.references.map((ref) => (
                <li key={ref}>{ref}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </aside>
  );
}

export default SectionInsightPanel;
