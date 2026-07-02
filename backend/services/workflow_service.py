from datetime import datetime
import json

from constants.workflow import (
    ENTITY_DOC,
    ENTITY_FORM,
    REQUEST_APPROVED,
    REQUEST_PENDING,
    REQUEST_REJECTED,
    STATUS_DRAFT,
    STATUS_PENDING,
    STATUS_RELEASED,
    can_approve_entity,
    can_revise,
    can_submit,
    normalize_status,
)
from database.db import get_connection
from services.audit_service import AuditService
from services.keycloak_service import list_users
from utils.display import actor_display
from utils.revision import next_revision


def user_display(user: dict) -> str:
    name = (user.get("name") or user.get("username") or "").strip()
    email = (user.get("email") or "").strip()
    if name and email:
        return f"{name} ({email})"
    return name or email or (user.get("username") or "unknown")


def resolve_user_by_username(username: str) -> dict | None:
    target = (username or "").strip().lower()
    if not target:
        return None

    for user in list_users():
        if (user.get("username") or "").strip().lower() == target:
            return user
    return None


class WorkflowService:
    @staticmethod
    def log_history(
        cursor,
        *,
        entity_type: str,
        entity_id: int,
        revision: str | None,
        action: str,
        actor: dict | None,
        comments: str | None = None,
    ) -> None:
        actor_sub = (actor or {}).get("sub")
        actor_display_value = actor_display(actor) if actor else None

        cursor.execute(
            """
            INSERT INTO workflow_history (
                entity_type, entity_id, revision, action,
                performed_by_sub, performed_by_display, comments
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                entity_type,
                entity_id,
                revision,
                action,
                actor_sub,
                actor_display_value,
                comments,
            ),
        )
        AuditService.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor=actor,
            revision=revision,
            summary=comments,
            cursor=cursor,
        )

    @staticmethod
    def _get_form(cursor, form_id: int):
        cursor.execute("SELECT * FROM formstab WHERE fmid=%s;", (form_id,))
        row = cursor.fetchone()
        if not row:
            return None
        row["id"] = row.get("fmid")
        return row

    @staticmethod
    def _get_doc(cursor, doc_id: int):
        cursor.execute("SELECT * FROM doctab WHERE id=%s;", (doc_id,))
        return cursor.fetchone()

    @staticmethod
    def _entity_row(cursor, entity_type: str, entity_id: int):
        if entity_type == ENTITY_FORM:
            return WorkflowService._get_form(cursor, entity_id)
        if entity_type == ENTITY_DOC:
            return WorkflowService._get_doc(cursor, entity_id)
        return None

    @staticmethod
    def _entity_status(entity_type: str, row: dict) -> str:
        if entity_type == ENTITY_FORM:
            return normalize_status(row.get("fmstatus"))
        return normalize_status(row.get("dstatus"))

    @staticmethod
    def _entity_revision(entity_type: str, row: dict) -> str:
        if entity_type == ENTITY_FORM:
            return (row.get("fmrev") or "1").strip() or "1"
        return (row.get("drev") or "1").strip() or "1"

    @staticmethod
    def _entity_title(entity_type: str, row: dict) -> str:
        if entity_type == ENTITY_FORM:
            return (row.get("fmname") or "").strip()
        return (row.get("dname") or "").strip()

    @staticmethod
    def _set_entity_status(
        cursor,
        entity_type: str,
        entity_id: int,
        status: str,
        *,
        approver_display: str | None = None,
        effective_date=None,
    ) -> None:
        if entity_type == ENTITY_FORM:
            cursor.execute(
                """
                UPDATE formstab
                SET fmstatus=%s, fmapprover=%s, fmeffective=%s
                WHERE fmid=%s
                """,
                (status, approver_display, effective_date, entity_id),
            )
            return

        cursor.execute(
            """
            UPDATE doctab
            SET dstatus=%s, dapprover=%s, deffective=%s
            WHERE id=%s
            """,
            (status, approver_display, effective_date, entity_id),
        )

    @staticmethod
    def _pending_request(cursor, entity_type: str, entity_id: int):
        cursor.execute(
            """
            SELECT * FROM approval_requests
            WHERE entity_type=%s AND entity_id=%s AND status=%s
            ORDER BY request_id DESC
            LIMIT 1
            """,
            (entity_type, entity_id, REQUEST_PENDING),
        )
        return cursor.fetchone()

    @staticmethod
    def submit_form_for_review(
        form_id: int,
        *,
        approver_username: str,
        effective_date=None,
        requester: dict,
    ):
        return WorkflowService._submit_for_review(
            ENTITY_FORM,
            form_id,
            approver_username=approver_username,
            effective_date=effective_date,
            requester=requester,
        )

    @staticmethod
    def submit_doc_for_review(
        doc_id: int,
        *,
        approver_username: str,
        effective_date=None,
        requester: dict,
    ):
        return WorkflowService._submit_for_review(
            ENTITY_DOC,
            doc_id,
            approver_username=approver_username,
            effective_date=effective_date,
            requester=requester,
        )

    @staticmethod
    def _submit_for_review(
        entity_type: str,
        entity_id: int,
        *,
        approver_username: str,
        effective_date=None,
        requester: dict,
    ):
        approver_user = resolve_user_by_username(approver_username)
        if not approver_user or not approver_user.get("id"):
            raise ValueError("Approver not found")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            row = WorkflowService._entity_row(cursor, entity_type, entity_id)
            if not row:
                return None

            current_status = WorkflowService._entity_status(entity_type, row)
            if not can_submit(current_status):
                raise ValueError("Only draft items can be submitted for approval")

            if WorkflowService._pending_request(cursor, entity_type, entity_id):
                raise ValueError("An approval request is already pending for this item")

            revision = WorkflowService._entity_revision(entity_type, row)
            title = WorkflowService._entity_title(entity_type, row)
            approver_display = user_display(approver_user)

            cursor.execute(
                """
                INSERT INTO approval_requests (
                    entity_type, entity_id, revision, entity_title,
                    requester_sub, requester_display,
                    approver_sub, approver_display,
                    status, effective_date
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    entity_type,
                    entity_id,
                    revision,
                    title,
                    requester.get("sub"),
                    actor_display(requester),
                    approver_user["id"],
                    approver_display,
                    REQUEST_PENDING,
                    effective_date or None,
                ),
            )

            WorkflowService._set_entity_status(
                cursor,
                entity_type,
                entity_id,
                STATUS_PENDING,
                approver_display=approver_display,
                effective_date=effective_date,
            )

            WorkflowService.log_history(
                cursor,
                entity_type=entity_type,
                entity_id=entity_id,
                revision=revision,
                action="Submitted",
                actor=requester,
            )

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return WorkflowService._fetch_entity(entity_type, entity_id)

    @staticmethod
    def _fetch_entity(entity_type: str, entity_id: int):
        if entity_type == ENTITY_FORM:
            from services.form_service import FormService

            return FormService.get_form(entity_id)
        from services.doc_service import DocService

        return DocService.get_doc(entity_id)

    @staticmethod
    def approve_request(request_id: int, actor: dict, comments: str | None = None):
        return WorkflowService._complete_request(
            request_id,
            actor=actor,
            decision=REQUEST_APPROVED,
            next_status=STATUS_RELEASED,
            history_action="Approved",
            comments=(comments or "").strip() or None,
        )

    @staticmethod
    def reject_request(request_id: int, actor: dict, comments: str | None = None):
        if not (comments or "").strip():
            raise ValueError("Rejection comments are required")
        return WorkflowService._complete_request(
            request_id,
            actor=actor,
            decision=REQUEST_REJECTED,
            next_status=STATUS_DRAFT,
            history_action="Rejected",
            comments=comments.strip(),
        )

    @staticmethod
    def _complete_request(
        request_id: int,
        *,
        actor: dict,
        decision: str,
        next_status: str,
        history_action: str,
        comments: str | None = None,
    ):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            cursor.execute(
                "SELECT * FROM approval_requests WHERE request_id=%s;",
                (request_id,),
            )
            request = cursor.fetchone()
            if not request:
                return None

            if request.get("status") != REQUEST_PENDING:
                raise ValueError("This approval request is no longer pending")

            actor_sub = actor.get("sub")
            if request.get("approver_sub") != actor_sub:
                raise ValueError("You are not the assigned approver for this request")

            entity_type = request["entity_type"]
            entity_id = request["entity_id"]
            row = WorkflowService._entity_row(cursor, entity_type, entity_id)
            if not row:
                raise ValueError("The linked record no longer exists")

            if not can_approve_entity(WorkflowService._entity_status(entity_type, row)):
                raise ValueError("This item is not pending approval")

            cursor.execute(
                """
                UPDATE approval_requests
                SET status=%s, comments=%s, completed_at=%s
                WHERE request_id=%s
                """,
                (decision, comments, datetime.utcnow(), request_id),
            )

            approver_display = request.get("approver_display")
            effective_date = request.get("effective_date")
            WorkflowService._set_entity_status(
                cursor,
                entity_type,
                entity_id,
                next_status,
                approver_display=approver_display if next_status == STATUS_RELEASED else None,
                effective_date=effective_date if next_status == STATUS_RELEASED else None,
            )

            WorkflowService.log_history(
                cursor,
                entity_type=entity_type,
                entity_id=entity_id,
                revision=request.get("revision"),
                action=history_action,
                actor=actor,
                comments=comments,
            )

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM approval_requests WHERE request_id=%s;",
            (request_id,),
        )
        updated_request = cursor.fetchone()
        conn.close()

        entity = WorkflowService._fetch_entity(
            updated_request["entity_type"],
            updated_request["entity_id"],
        )
        return {"request": updated_request, "entity": entity}

    @staticmethod
    def list_requests(view: str, actor: dict):
        actor_sub = actor.get("sub")
        if not actor_sub:
            return []

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if view == "pending":
            cursor.execute(
                """
                SELECT * FROM approval_requests
                WHERE approver_sub=%s AND status=%s
                ORDER BY requested_at DESC
                """,
                (actor_sub, REQUEST_PENDING),
            )
        elif view == "my":
            cursor.execute(
                """
                SELECT * FROM approval_requests
                WHERE requester_sub=%s
                ORDER BY requested_at DESC
                """,
                (actor_sub,),
            )
        elif view == "approved":
            cursor.execute(
                """
                SELECT * FROM approval_requests
                WHERE status=%s
                  AND (requester_sub=%s OR approver_sub=%s)
                ORDER BY completed_at DESC, requested_at DESC
                """,
                (REQUEST_APPROVED, actor_sub, actor_sub),
            )
        elif view == "rejected":
            cursor.execute(
                """
                SELECT * FROM approval_requests
                WHERE status=%s
                  AND (requester_sub=%s OR approver_sub=%s)
                ORDER BY completed_at DESC, requested_at DESC
                """,
                (REQUEST_REJECTED, actor_sub, actor_sub),
            )
        else:
            conn.close()
            return []

        rows = cursor.fetchall()
        conn.close()
        return rows

    @staticmethod
    def get_request(request_id: int):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM approval_requests WHERE request_id=%s;",
            (request_id,),
        )
        row = cursor.fetchone()
        conn.close()
        return row

    @staticmethod
    def revise_form(form_id: int, actor: dict):
        return WorkflowService._revise_entity(ENTITY_FORM, form_id, actor)

    @staticmethod
    def revise_doc(doc_id: int, actor: dict):
        return WorkflowService._revise_entity(ENTITY_DOC, doc_id, actor)

    @staticmethod
    def _revise_entity(entity_type: str, entity_id: int, actor: dict):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            row = WorkflowService._entity_row(cursor, entity_type, entity_id)
            if not row:
                return None

            current_status = WorkflowService._entity_status(entity_type, row)
            if not can_revise(current_status):
                raise ValueError("Only released items can be revised")

            current_revision = WorkflowService._entity_revision(entity_type, row)
            new_revision = next_revision(current_revision)

            if entity_type == ENTITY_FORM:
                fmjson = row.get("fmjson")
                if fmjson is not None and not isinstance(fmjson, str):
                    fmjson = json.dumps(fmjson)

                cursor.execute(
                    """
                    INSERT INTO form_revisions (
                        form_id, revision, fmname, fmjson, ftype, fmstatus, archived_by_display
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        entity_id,
                        current_revision,
                        row.get("fmname"),
                        fmjson,
                        row.get("ftype"),
                        current_status,
                        actor_display(actor),
                    ),
                )
                cursor.execute(
                    """
                    UPDATE formstab
                    SET fmrev=%s, fmstatus=%s, fmapprover=NULL, fmeffective=NULL
                    WHERE fmid=%s
                    """,
                    (new_revision, STATUS_DRAFT, entity_id),
                )
            else:
                fielddata = row.get("fielddata")
                if fielddata is not None and not isinstance(fielddata, str):
                    fielddata = json.dumps(fielddata)

                cursor.execute(
                    """
                    INSERT INTO doc_revisions (
                        doc_id, revision, dname, ddesc, dtype, ftype, fid, fmat,
                        dstatus, fielddata, archived_by_display
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        entity_id,
                        current_revision,
                        row.get("dname"),
                        row.get("ddesc"),
                        row.get("dtype"),
                        row.get("ftype"),
                        row.get("fid"),
                        row.get("fmat"),
                        current_status,
                        row.get("fielddata"),
                        actor_display(actor),
                    ),
                )
                cursor.execute(
                    """
                    UPDATE doctab
                    SET drev=%s, dstatus=%s, dapprover=NULL, deffective=NULL
                    WHERE id=%s
                    """,
                    (new_revision, STATUS_DRAFT, entity_id),
                )

            WorkflowService.log_history(
                cursor,
                entity_type=entity_type,
                entity_id=entity_id,
                revision=new_revision,
                action=f"Revised to {new_revision}",
                actor=actor,
                comments=f"Archived revision {current_revision}",
            )

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return WorkflowService._fetch_entity(entity_type, entity_id)
