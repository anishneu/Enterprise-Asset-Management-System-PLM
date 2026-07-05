import json
from typing import Any

from database.db import get_connection
from utils.display import actor_display


def _normalize_row(row: dict) -> dict:
    changes = row.get("changes_json")
    if isinstance(changes, str):
        try:
            changes = json.loads(changes)
        except json.JSONDecodeError:
            changes = None
    action_date = row.get("action_date")
    return {
        "id": row.get("audit_id") or row.get("history_id"),
        "source": row.get("source") or "audit",
        "entityType": row.get("entity_type"),
        "entityId": str(row.get("entity_id")),
        "entityLabel": row.get("entity_label"),
        "revision": row.get("revision"),
        "action": row.get("action"),
        "summary": row.get("summary") or row.get("comments"),
        "changes": changes,
        "performedBy": row.get("performed_by_display"),
        "performedBySub": row.get("performed_by_sub"),
        "actionDate": action_date.isoformat() if hasattr(action_date, "isoformat") else action_date,
    }


class AuditService:
    @staticmethod
    def log(
        *,
        entity_type: str,
        entity_id: str | int,
        action: str,
        actor: dict | None = None,
        entity_label: str | None = None,
        revision: str | None = None,
        summary: str | None = None,
        changes: dict | list | None = None,
        cursor=None,
    ) -> None:
        actor_sub = (actor or {}).get("sub")
        actor_display_value = actor_display(actor) if actor else None
        changes_json = json.dumps(changes) if changes is not None else None
        params = (
            entity_type,
            str(entity_id),
            entity_label,
            revision,
            action,
            summary,
            changes_json,
            actor_sub,
            actor_display_value,
        )
        sql = """
            INSERT INTO audit_log (
                entity_type, entity_id, entity_label, revision, action,
                summary, changes_json, performed_by_sub, performed_by_display
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        if cursor is not None:
            cursor.execute(sql, params)
            return

        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(sql, params)
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def _history_filters(
        *,
        entity_type: str | None = None,
        entity_id: str | int | None = None,
    ) -> tuple[str, str, list[Any], list[Any]]:
        audit_filters = []
        audit_params: list[Any] = []
        if entity_type:
            audit_filters.append("entity_type = %s")
            audit_params.append(entity_type)
        if entity_id is not None:
            audit_filters.append("entity_id = %s")
            audit_params.append(str(entity_id))

        audit_where = f"WHERE {' AND '.join(audit_filters)}" if audit_filters else ""

        workflow_filters = []
        workflow_params: list[Any] = []
        if entity_type:
            workflow_filters.append("entity_type = %s")
            workflow_params.append(entity_type)
        if entity_id is not None:
            workflow_filters.append("entity_id = %s")
            workflow_params.append(int(entity_id) if str(entity_id).isdigit() else entity_id)

        workflow_where = f"WHERE {' AND '.join(workflow_filters)}" if workflow_filters else ""
        return audit_where, workflow_where, audit_params, workflow_params

    @staticmethod
    def count_history(
        *,
        entity_type: str | None = None,
        entity_id: str | int | None = None,
    ) -> int:
        audit_where, workflow_where, audit_params, workflow_params = AuditService._history_filters(
            entity_type=entity_type,
            entity_id=entity_id,
        )

        sql = f"""
            SELECT COUNT(*) AS total FROM (
                SELECT audit_id
                FROM audit_log
                {audit_where}
                UNION ALL
                SELECT history_id AS audit_id
                FROM workflow_history
                {workflow_where}
            ) combined
        """

        params = audit_params + workflow_params
        conn = get_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(sql, params)
            row = cursor.fetchone() or {}
            return int(row.get("total") or 0)
        finally:
            conn.close()

    @staticmethod
    def list_history(
        *,
        entity_type: str | None = None,
        entity_id: str | int | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        limit = max(1, min(limit, 500))
        offset = max(0, offset)

        audit_where, workflow_where, audit_params, workflow_params = AuditService._history_filters(
            entity_type=entity_type,
            entity_id=entity_id,
        )

        sql = f"""
            SELECT * FROM (
                SELECT
                    audit_id,
                    'audit' AS source,
                    entity_type,
                    entity_id,
                    entity_label,
                    revision,
                    action,
                    summary,
                    NULL AS comments,
                    changes_json,
                    performed_by_sub,
                    performed_by_display,
                    action_date
                FROM audit_log
                {audit_where}
                UNION ALL
                SELECT
                    history_id AS audit_id,
                    'workflow' AS source,
                    entity_type,
                    CAST(entity_id AS CHAR) AS entity_id,
                    NULL AS entity_label,
                    revision,
                    action,
                    NULL AS summary,
                    comments,
                    NULL AS changes_json,
                    performed_by_sub,
                    performed_by_display,
                    action_date
                FROM workflow_history
                {workflow_where}
            ) combined
            ORDER BY action_date DESC
            LIMIT %s OFFSET %s
        """

        params = audit_params + workflow_params + [limit, offset]
        conn = get_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(sql, params)
            rows = cursor.fetchall() or []
            return [_normalize_row(row) for row in rows]
        finally:
            conn.close()

    @staticmethod
    def summarize_changes(before: dict | None, after: dict | None, fields: list[str]) -> dict:
        changes = {}
        for field in fields:
            old_value = (before or {}).get(field)
            new_value = (after or {}).get(field)
            if old_value != new_value:
                changes[field] = {"from": old_value, "to": new_value}
        return changes
