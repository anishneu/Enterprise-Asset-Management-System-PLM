import {
  ACTION_COLORS,
  ENTITY_LABELS,
  formatAuditChanges,
  formatAuditDate,
} from "../../constants/auditEntityTypes";

import "../History.css";

function AuditChanges({ changes, compact }) {
  const rows = formatAuditChanges(changes);
  if (!rows || rows.length === 0) return null;

  if (compact) {
    const summary = rows
      .map((row) =>
        row.from != null ? `${row.field}: ${row.from} → ${row.to}` : `${row.field}: ${row.to}`
      )
      .join("; ");
    return <p className="audit-row-changes audit-row-changes--compact">{summary}</p>;
  }

  return (
    <ul className="audit-row-changes">
      {rows.map((row) => (
        <li key={row.field}>
          <span className="audit-row-change-field">{row.field}</span>
          {row.from != null ? (
            <>
              <span className="audit-row-change-from">{String(row.from)}</span>
              <span className="audit-row-change-arrow">→</span>
              <span className="audit-row-change-to">{String(row.to)}</span>
            </>
          ) : (
            <span className="audit-row-change-to">{String(row.to)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AuditEntryRow({ entry, compact = false }) {
  const actionClass = ACTION_COLORS[entry.action] || "audit-action--default";
  const typeLabel = ENTITY_LABELS[entry.entityType] || entry.entityType || "Record";
  const title = entry.entityLabel || entry.summary || typeLabel;
  const detail =
    entry.summary && entry.entityLabel && entry.summary !== entry.entityLabel
      ? entry.summary
      : null;

  return (
    <li className={`audit-row${compact ? " audit-row--compact" : ""}`}>
      <div className="audit-row-top">
        <span className={`audit-action ${actionClass}`}>{entry.action}</span>
        <span className="audit-row-type">{typeLabel}</span>
        {entry.revision && <span className="audit-row-rev">Rev {entry.revision}</span>}
        <time className="audit-row-date" dateTime={entry.actionDate}>
          {formatAuditDate(entry.actionDate)}
        </time>
      </div>

      <p className="audit-row-title">{title}</p>
      {detail && <p className="audit-row-detail">{detail}</p>}

      <AuditChanges changes={entry.changes} compact={compact} />

      <p className="audit-row-actor">
        {entry.performedBy || "System"}
        {entry.source === "workflow" ? " · workflow" : ""}
      </p>
    </li>
  );
}

export default function AuditTimeline({
  items = [],
  loading = false,
  compact = false,
  emptyMessage = "No history recorded yet.",
}) {
  if (loading) {
    return <p className="audit-status">Loading history…</p>;
  }

  if (items.length === 0) {
    return <p className="audit-status">{emptyMessage}</p>;
  }

  return (
    <ol className={`audit-list${compact ? " audit-list--compact" : ""}`}>
      {items.map((entry) => (
        <AuditEntryRow
          key={`${entry.source}-${entry.id}`}
          entry={entry}
          compact={compact}
        />
      ))}
    </ol>
  );
}
