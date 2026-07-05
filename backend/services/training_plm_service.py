import json
from datetime import datetime

from database.db import get_connection
from schemas.training_plm import RECORD_STATUSES
from services.keycloak_service import get_group
from utils.revision import next_revision, normalize_revision


def _serialize_row(row: dict | None) -> dict | None:
    if not row:
        return row
    record = dict(row)
    for field in (
        "created_at",
        "updated_at",
        "assigned_date",
        "due_date",
        "release_due_date",
        "training_date",
        "completion_date",
        "effective_date",
    ):
        value = record.get(field)
        if value is not None and hasattr(value, "isoformat"):
            record[field] = value.isoformat()
    if record.get("requires_assessment") is not None:
        record["requires_assessment"] = bool(record["requires_assessment"])
    if record.get("mandatory") is not None:
        record["mandatory"] = bool(record["mandatory"])
    if record.get("score") is not None:
        record["score"] = float(record["score"])
    if record.get("duration_hours") is not None:
        record["duration_hours"] = float(record["duration_hours"])
    fielddata = record.get("fielddata")
    if isinstance(fielddata, str):
        try:
            record["fielddata"] = json.loads(fielddata)
        except json.JSONDecodeError:
            pass
    return record


def _normalize_record_status(status: str | None) -> str:
    value = (status or "Assigned").strip()
    if value == "Completed":
        return "Completed"
    if value in ("In Progress", "Pending Evaluation", "Pending", "Retake", "Reassigned"):
        return "In Progress"
    return "Assigned"


def _enrich_training_record(row: dict | None) -> dict | None:
    record = _serialize_row(row)
    if not record:
        return record
    if record.get("status"):
        record["status"] = _normalize_record_status(record["status"])
    if not record.get("form_id"):
        record["form_id"] = record.get("course_form_id") or record.get("curriculum_form_id")
    curriculum_fielddata = record.pop("curriculum_fielddata", None)
    if isinstance(curriculum_fielddata, str):
        try:
            curriculum_fielddata = json.loads(curriculum_fielddata)
        except json.JSONDecodeError:
            curriculum_fielddata = None
    record["curriculum_fielddata"] = curriculum_fielddata
    record.pop("course_form_id", None)
    record.pop("curriculum_form_id", None)
    return record




class TrainingPlmService:
    # ── Courses ──────────────────────────────────────────────────────

    @staticmethod
    def list_courses(*, status: str | None = None, released_only: bool = False):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        clauses = []
        params: list = []
        if status:
            clauses.append("status = %s")
            params.append(status)
        if released_only:
            clauses.append("status = 'Released'")
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        cursor.execute(
            f"""
            SELECT
                tc.*,
                fs.fmname AS form_name,
                (SELECT COUNT(*) FROM course_documents cd WHERE cd.course_id = tc.id) AS document_count,
                (SELECT COUNT(*) FROM course_assignees ca WHERE ca.course_id = tc.id) AS assignee_count,
                (SELECT COUNT(*) FROM course_assignee_groups cg WHERE cg.course_id = tc.id) AS group_count
            FROM training_courses tc
            LEFT JOIN formstab fs ON fs.fmid = tc.form_id
            {where}
            ORDER BY tc.course_code ASC, tc.revision DESC
            """,
            tuple(params),
        )
        rows = [_serialize_row(row) for row in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def _load_course_relations(course: dict | None) -> dict | None:
        if not course:
            return course
        course_id = course["id"]
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT cd.doc_id, cd.sequence_order, d.dname AS doc_name, d.drev AS doc_revision, d.dlink AS doc_link
            FROM course_documents cd
            LEFT JOIN doctab d ON d.id = cd.doc_id
            WHERE cd.course_id = %s
            ORDER BY cd.sequence_order ASC, cd.id ASC
            """,
            (course_id,),
        )
        course["documents"] = [_serialize_row(row) for row in cursor.fetchall()]

        cursor.execute(
            "SELECT user_id, user_display FROM course_assignees WHERE course_id = %s ORDER BY user_display",
            (course_id,),
        )
        course["assignees"] = [_serialize_row(row) for row in cursor.fetchall()]

        cursor.execute(
            "SELECT group_id, group_name FROM course_assignee_groups WHERE course_id = %s ORDER BY group_name",
            (course_id,),
        )
        course["assignee_groups"] = [_serialize_row(row) for row in cursor.fetchall()]

        conn.close()
        return course

    @staticmethod
    def get_course(course_id: int, *, detailed: bool = False):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT tc.*, fs.fmname AS form_name
            FROM training_courses tc
            LEFT JOIN formstab fs ON fs.fmid = tc.form_id
            WHERE tc.id = %s
            """,
            (course_id,),
        )
        row = _serialize_row(cursor.fetchone())
        conn.close()
        if detailed and row:
            return TrainingPlmService._load_course_relations(row)
        return row

    @staticmethod
    def create_course(payload: dict, owner_id: str | None):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            INSERT INTO training_courses (
                course_code, course_name, description, category, revision,
                duration_hours, pass_percentage, requires_assessment,
                validity_months, doc_id, form_id, owner_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                payload["course_code"].strip().upper(),
                payload["course_name"].strip(),
                payload.get("description"),
                payload.get("category"),
                (payload.get("revision") or "A").strip().upper(),
                payload.get("duration_hours"),
                payload.get("pass_percentage"),
                1 if payload.get("requires_assessment") else 0,
                payload.get("validity_months"),
                payload.get("doc_id"),
                payload.get("form_id"),
                owner_id,
            ),
        )
        course_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM training_courses WHERE id=%s", (course_id,))
        row = _serialize_row(cursor.fetchone())
        conn.close()
        return row

    @staticmethod
    def update_course(course_id: int, payload: dict):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        existing = TrainingPlmService.get_course(course_id)
        if not existing:
            conn.close()
            return None

        fields = []
        values = []
        for key in (
            "course_name",
            "description",
            "category",
            "duration_hours",
            "pass_percentage",
            "validity_months",
            "doc_id",
            "form_id",
            "release_due_date",
        ):
            if key in payload and payload[key] is not None:
                fields.append(f"{key}=%s")
                values.append(payload[key])
        if "requires_assessment" in payload and payload["requires_assessment"] is not None:
            fields.append("requires_assessment=%s")
            values.append(1 if payload["requires_assessment"] else 0)

        if not fields:
            conn.close()
            return existing

        values.append(course_id)
        cursor.execute(
            f"UPDATE training_courses SET {', '.join(fields)} WHERE id=%s",
            tuple(values),
        )
        conn.commit()
        cursor.execute("SELECT * FROM training_courses WHERE id=%s", (course_id,))
        row = _serialize_row(cursor.fetchone())
        conn.close()
        return row

    @staticmethod
    def _course_trainer_display(course: dict, user_display_map: dict[str, str] | None = None):
        manual = (course.get("trainer_name") or "").strip()
        if manual:
            return manual
        trainer_user_id = course.get("trainer_user_id")
        if trainer_user_id and user_display_map:
            return user_display_map.get(trainer_user_id) or trainer_user_id
        return None

    @staticmethod
    def _resolve_audience(user_ids: list[str], group_ids: list[str], user_display_map: dict[str, str]):
        resolved: dict[str, str] = {}
        for user_id in user_ids:
            if user_id:
                resolved[user_id] = user_display_map.get(user_id) or user_id
        for group_id in group_ids:
            group = get_group(group_id)
            if not group:
                continue
            for member in group.get("membersList", []):
                member_id = member.get("id")
                if member_id:
                    resolved[member_id] = (
                        member.get("label") or member.get("username") or member_id
                    )
        return resolved

    @staticmethod
    def set_course_setup(course_id: int, payload: dict, user_display_map: dict[str, str]):
        existing = TrainingPlmService.get_course(course_id)
        if not existing:
            return None

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if "form_id" in payload:
            cursor.execute(
                "UPDATE training_courses SET form_id=%s WHERE id=%s",
                (payload.get("form_id"), course_id),
            )
        if "release_due_date" in payload:
            cursor.execute(
                "UPDATE training_courses SET release_due_date=%s WHERE id=%s",
                (payload.get("release_due_date"), course_id),
            )
        if "trainer_user_id" in payload:
            cursor.execute(
                "UPDATE training_courses SET trainer_user_id=%s WHERE id=%s",
                (payload.get("trainer_user_id"), course_id),
            )
        if "trainer_name" in payload:
            cursor.execute(
                "UPDATE training_courses SET trainer_name=%s WHERE id=%s",
                (payload.get("trainer_name"), course_id),
            )

        if "documents" in payload:
            cursor.execute("DELETE FROM course_documents WHERE course_id=%s", (course_id,))
            for index, item in enumerate(payload.get("documents") or []):
                cursor.execute(
                    """
                    INSERT INTO course_documents (course_id, doc_id, sequence_order)
                    VALUES (%s, %s, %s)
                    """,
                    (course_id, item["doc_id"], item.get("sequence_order", index)),
                )

        if "user_ids" in payload:
            cursor.execute("DELETE FROM course_assignees WHERE course_id=%s", (course_id,))
            for user_id in payload.get("user_ids") or []:
                display = user_display_map.get(user_id) or user_id
                cursor.execute(
                    """
                    INSERT INTO course_assignees (course_id, user_id, user_display)
                    VALUES (%s, %s, %s)
                    """,
                    (course_id, user_id, display),
                )

        if "group_ids" in payload:
            cursor.execute("DELETE FROM course_assignee_groups WHERE course_id=%s", (course_id,))
            group_names = payload.get("group_names") or {}
            for group_id in payload.get("group_ids") or []:
                cursor.execute(
                    """
                    INSERT INTO course_assignee_groups (course_id, group_id, group_name)
                    VALUES (%s, %s, %s)
                    """,
                    (course_id, group_id, group_names.get(group_id)),
                )

        conn.commit()
        conn.close()
        return TrainingPlmService.get_course(course_id, detailed=True)

    @staticmethod
    def _copy_course_setup(source_id: int, target_id: int):
        source = TrainingPlmService.get_course(source_id, detailed=True)
        if not source:
            return
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "UPDATE training_courses SET form_id=%s, release_due_date=%s, trainer_user_id=%s, trainer_name=%s WHERE id=%s",
            (
                source.get("form_id"),
                source.get("release_due_date"),
                source.get("trainer_user_id"),
                source.get("trainer_name"),
                target_id,
            ),
        )

        for item in source.get("documents") or []:
            cursor.execute(
                """
                INSERT INTO course_documents (course_id, doc_id, sequence_order)
                VALUES (%s, %s, %s)
                """,
                (target_id, item["doc_id"], item.get("sequence_order", 0)),
            )
        for item in source.get("assignees") or []:
            cursor.execute(
                """
                INSERT INTO course_assignees (course_id, user_id, user_display)
                VALUES (%s, %s, %s)
                """,
                (target_id, item["user_id"], item.get("user_display")),
            )
        for item in source.get("assignee_groups") or []:
            cursor.execute(
                """
                INSERT INTO course_assignee_groups (course_id, group_id, group_name)
                VALUES (%s, %s, %s)
                """,
                (target_id, item["group_id"], item.get("group_name")),
            )

        conn.commit()
        conn.close()

    @staticmethod
    def release_course(course_id: int, user_display_map: dict[str, str]):
        course = TrainingPlmService.get_course(course_id, detailed=True)
        if not course:
            return None
        if course["status"] != "Draft":
            raise ValueError("Only draft courses can be released.")

        user_ids = [item["user_id"] for item in course.get("assignees") or []]
        group_ids = [item["group_id"] for item in course.get("assignee_groups") or []]
        audience = TrainingPlmService._resolve_audience(user_ids, group_ids, user_display_map)
        if not audience:
            raise ValueError("Assign at least one user or group before releasing the course.")

        due_date = course.get("release_due_date")
        form_id = course.get("form_id")
        trainer = TrainingPlmService._course_trainer_display(course, user_display_map)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        for user_id, display in audience.items():
            cursor.execute(
                """
                INSERT INTO plm_training_records (
                    user_id, user_display, course_id, form_id, status, due_date, trainer
                )
                VALUES (%s, %s, %s, %s, 'Assigned', %s, %s)
                """,
                (user_id, display, course_id, form_id, due_date, trainer),
            )

        cursor.execute(
            "UPDATE training_courses SET status=%s WHERE id=%s",
            ("Released", course_id),
        )
        conn.commit()
        cursor.execute(
            """
            SELECT tc.*, fs.fmname AS form_name
            FROM training_courses tc
            LEFT JOIN formstab fs ON fs.fmid = tc.form_id
            WHERE tc.id = %s
            """,
            (course_id,),
        )
        row = _serialize_row(cursor.fetchone())
        conn.close()
        return row

    @staticmethod
    def revise_course(course_id: int, owner_id: str | None):
        existing = TrainingPlmService.get_course(course_id)
        if not existing:
            return None
        if existing["status"] != "Released":
            raise ValueError("Only released courses can be revised.")

        new_revision = next_revision(existing["revision"])
        payload = {
            "course_code": existing["course_code"],
            "course_name": existing["course_name"],
            "description": existing.get("description"),
            "category": existing.get("category"),
            "revision": new_revision,
            "duration_hours": existing.get("duration_hours"),
            "pass_percentage": existing.get("pass_percentage"),
            "requires_assessment": existing.get("requires_assessment"),
            "validity_months": existing.get("validity_months"),
            "doc_id": existing.get("doc_id"),
            "form_id": existing.get("form_id"),
        }
        created = TrainingPlmService.create_course(payload, owner_id)
        if created:
            TrainingPlmService._copy_course_setup(course_id, created["id"])
        return created

    @staticmethod
    def _set_course_status(course_id: int, status: str):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "UPDATE training_courses SET status=%s WHERE id=%s",
            (status, course_id),
        )
        conn.commit()
        cursor.execute("SELECT * FROM training_courses WHERE id=%s", (course_id,))
        row = _serialize_row(cursor.fetchone())
        conn.close()
        return row

    # ── Curriculum ───────────────────────────────────────────────────

    @staticmethod
    def list_curricula(*, released_only: bool = False):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        where = "WHERE status = 'Released'" if released_only else ""
        cursor.execute(
            f"""
            SELECT tc.*, fs.fmname AS form_name
            FROM training_curriculum tc
            LEFT JOIN formstab fs ON fs.fmid = tc.form_id
            {where}
            ORDER BY tc.updated_at DESC, tc.id DESC
            """
        )
        rows = [_serialize_row(row) for row in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def get_curriculum(curriculum_id: int, *, include_courses: bool = True):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT tc.*, fs.fmname AS form_name
            FROM training_curriculum tc
            LEFT JOIN formstab fs ON fs.fmid = tc.form_id
            WHERE tc.id = %s
            """,
            (curriculum_id,),
        )
        row = _serialize_row(cursor.fetchone())
        if not row:
            conn.close()
            return None
        if include_courses:
            row["courses"] = TrainingPlmService._list_curriculum_courses(cursor, curriculum_id)
            row["documents"] = TrainingPlmService._list_curriculum_documents(cursor, curriculum_id)
            cursor.execute(
                """
                SELECT user_id, user_display
                FROM curriculum_assignees
                WHERE curriculum_id = %s
                ORDER BY user_display, user_id
                """,
                (curriculum_id,),
            )
            row["assignees"] = [_serialize_row(item) for item in cursor.fetchall()]
            cursor.execute(
                """
                SELECT group_id, group_name
                FROM curriculum_assignee_groups
                WHERE curriculum_id = %s
                ORDER BY group_name, group_id
                """,
                (curriculum_id,),
            )
            row["assignee_groups"] = [_serialize_row(item) for item in cursor.fetchall()]
        conn.close()
        return row

    @staticmethod
    def _list_curriculum_courses(cursor, curriculum_id: int):
        cursor.execute(
            """
            SELECT
                cc.id,
                cc.course_id,
                cc.sequence_order,
                cc.mandatory,
                c.course_code,
                c.course_name,
                c.revision AS course_revision,
                c.status AS course_status
            FROM curriculum_courses cc
            JOIN training_courses c ON c.id = cc.course_id
            WHERE cc.curriculum_id = %s
            ORDER BY cc.sequence_order ASC, cc.id ASC
            """,
            (curriculum_id,),
        )
        return [_serialize_row(row) for row in cursor.fetchall()]

        return [_serialize_row(row) for row in cursor.fetchall()]

    @staticmethod
    def _list_curriculum_documents(cursor, curriculum_id: int):
        cursor.execute(
            """
            SELECT
                cd.doc_id,
                cd.sequence_order,
                d.dname AS doc_name,
                d.drev AS doc_revision,
                d.dtype AS doc_type,
                d.dstatus AS doc_status,
                d.ddesc AS doc_description,
                d.dlink AS doc_link
            FROM curriculum_documents cd
            LEFT JOIN doctab d ON d.id = cd.doc_id
            WHERE cd.curriculum_id = %s
            ORDER BY cd.sequence_order ASC, cd.id ASC
            """,
            (curriculum_id,),
        )
        return [_serialize_row(row) for row in cursor.fetchall()]

    @staticmethod
    def _set_curriculum_documents(curriculum_id: int, document_ids: list[int] | None):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM curriculum_documents WHERE curriculum_id=%s",
            (curriculum_id,),
        )
        for index, doc_id in enumerate(document_ids or []):
            if doc_id:
                cursor.execute(
                    """
                    INSERT INTO curriculum_documents (curriculum_id, doc_id, sequence_order)
                    VALUES (%s, %s, %s)
                    """,
                    (curriculum_id, doc_id, index),
                )
        conn.commit()
        conn.close()

    @staticmethod
    def _sync_curriculum_course_documents(course_id: int, documents: list[dict]):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM course_documents WHERE course_id=%s", (course_id,))
        for index, item in enumerate(documents or []):
            doc_id = item.get("doc_id")
            if doc_id:
                cursor.execute(
                    """
                    INSERT INTO course_documents (course_id, doc_id, sequence_order)
                    VALUES (%s, %s, %s)
                    """,
                    (course_id, doc_id, item.get("sequence_order", index)),
                )
        conn.commit()
        conn.close()

    @staticmethod
    def create_curriculum(payload: dict, created_by: str | None, user_display_map: dict[str, str] | None = None):
        approver_id = (payload.get("approver_user_id") or "").strip() or None
        approver_display = None
        if approver_id and user_display_map:
            approver_display = user_display_map.get(approver_id) or approver_id
        fielddata = payload.get("fielddata")
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            INSERT INTO training_curriculum (
                curriculum_code, curriculum_name, description, revision, created_by,
                form_id, approver_user_id, approver_display,
                effective_date, fielddata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                payload["curriculum_code"].strip().upper(),
                payload["curriculum_name"].strip(),
                payload.get("description"),
                normalize_revision(payload.get("revision")),
                created_by,
                payload.get("form_id"),
                approver_id,
                approver_display,
                payload.get("effective_date"),
                json.dumps(fielddata) if fielddata is not None else None,
            ),
        )
        curriculum_id = cursor.lastrowid
        conn.commit()
        conn.close()
        TrainingPlmService._set_curriculum_documents(curriculum_id, payload.get("document_ids"))
        TrainingPlmService._sync_curriculum_linked_course(curriculum_id)
        return TrainingPlmService.get_curriculum(curriculum_id)

    @staticmethod
    def update_curriculum(
        curriculum_id: int,
        payload: dict,
        user_display_map: dict[str, str] | None = None,
    ):
        existing = TrainingPlmService.get_curriculum(curriculum_id, include_courses=False)
        if not existing:
            return None
        if existing["status"] not in ("Draft", "Pending Approval"):
            raise ValueError("Only draft or pending curricula can be edited.")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        fields = []
        values = []
        for key in ("curriculum_name", "description", "form_id", "effective_date", "fielddata"):
            if key in payload and payload[key] is not None:
                fields.append(f"{key}=%s")
                if key == "fielddata":
                    values.append(json.dumps(payload[key]))
                else:
                    values.append(payload[key])
        if "revision" in payload and payload["revision"] is not None:
            fields.append("revision=%s")
            values.append(normalize_revision(payload["revision"]))
        if "approver_user_id" in payload:
            approver_id = (payload.get("approver_user_id") or "").strip() or None
            approver_display = None
            if approver_id and user_display_map:
                approver_display = user_display_map.get(approver_id) or approver_id
            fields.extend(["approver_user_id=%s", "approver_display=%s"])
            values.extend([approver_id, approver_display])
        if fields:
            values.append(curriculum_id)
            cursor.execute(
                f"UPDATE training_curriculum SET {', '.join(fields)} WHERE id=%s",
                tuple(values),
            )
            conn.commit()
        conn.close()
        if "document_ids" in payload:
            TrainingPlmService._set_curriculum_documents(curriculum_id, payload.get("document_ids"))
        updated = TrainingPlmService.get_curriculum(curriculum_id)
        if updated and updated.get("status") == "Draft":
            TrainingPlmService._sync_curriculum_linked_course(curriculum_id)
        return updated

    @staticmethod
    def delete_curriculum(curriculum_id: int):
        existing = TrainingPlmService.get_curriculum(curriculum_id, include_courses=False)
        if not existing:
            return None
        if existing["status"] != "Draft":
            raise ValueError("Only draft curricula can be deleted.")

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM training_curriculum WHERE id=%s", (curriculum_id,))
        conn.commit()
        conn.close()
        return {"id": curriculum_id, "deleted": True}

    @staticmethod
    def _sync_curriculum_linked_course(curriculum_id: int) -> int | None:
        curriculum = TrainingPlmService.get_curriculum(curriculum_id)
        if not curriculum:
            return None

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        courses = TrainingPlmService._list_curriculum_courses(cursor, curriculum_id)
        form_id = curriculum.get("form_id")
        course_id = None

        if courses:
            course_id = courses[0]["course_id"]
            cursor.execute(
                """
                UPDATE training_courses
                SET course_name=%s, description=%s, form_id=%s, revision=%s
                WHERE id=%s
                """,
                (
                    curriculum["curriculum_name"],
                    curriculum.get("description"),
                    form_id,
                    curriculum["revision"],
                    course_id,
                ),
            )
        else:
            cursor.execute(
                """
                INSERT INTO training_courses (
                    course_code, course_name, description, revision, form_id, status
                )
                VALUES (%s, %s, %s, %s, %s, 'Draft')
                """,
                (
                    curriculum["curriculum_code"],
                    curriculum["curriculum_name"],
                    curriculum.get("description"),
                    curriculum["revision"],
                    form_id,
                ),
            )
            course_id = cursor.lastrowid
            cursor.execute(
                """
                INSERT INTO curriculum_courses (curriculum_id, course_id, sequence_order, mandatory)
                VALUES (%s, %s, 0, 1)
                """,
                (curriculum_id, course_id),
            )

        conn.commit()
        conn.close()
        TrainingPlmService._sync_curriculum_course_documents(
            course_id,
            curriculum.get("documents") or [],
        )
        return course_id

    @staticmethod
    def finalize_curriculum_release(cursor, curriculum_id: int) -> None:
        cursor.execute(
            "SELECT * FROM training_curriculum WHERE id=%s",
            (curriculum_id,),
        )
        curriculum = cursor.fetchone()
        if not curriculum:
            return

        release_revision = normalize_revision(curriculum.get("revision"))

        cursor.execute(
            "UPDATE training_curriculum SET revision=%s WHERE id=%s",
            (release_revision, curriculum_id),
        )
        curriculum["revision"] = release_revision

        cursor.execute(
            """
            SELECT course_id
            FROM curriculum_courses
            WHERE curriculum_id=%s
            ORDER BY sequence_order ASC, id ASC
            LIMIT 1
            """,
            (curriculum_id,),
        )
        link = cursor.fetchone()
        course_id = link.get("course_id") if link else None
        if not course_id:
            cursor.execute(
                """
                INSERT INTO training_courses (
                    course_code, course_name, description, revision, form_id, status
                )
                VALUES (%s, %s, %s, %s, %s, 'Released')
                """,
                (
                    curriculum["curriculum_code"],
                    curriculum["curriculum_name"],
                    curriculum.get("description"),
                    release_revision,
                    curriculum.get("form_id"),
                ),
            )
            course_id = cursor.lastrowid
            cursor.execute(
                """
                INSERT INTO curriculum_courses (curriculum_id, course_id, sequence_order, mandatory)
                VALUES (%s, %s, 0, 1)
                """,
                (curriculum_id, course_id),
            )
        else:
            cursor.execute(
                """
                UPDATE training_courses
                SET course_name=%s,
                    description=%s,
                    form_id=%s,
                    revision=%s,
                    status='Released'
                WHERE id=%s
                """,
                (
                    curriculum["curriculum_name"],
                    curriculum.get("description"),
                    curriculum.get("form_id"),
                    release_revision,
                    course_id,
                ),
            )

    @staticmethod
    def _curriculum_linked_course_id(curriculum_id: int) -> int | None:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        courses = TrainingPlmService._list_curriculum_courses(cursor, curriculum_id)
        conn.close()
        if not courses:
            return None
        return courses[0]["course_id"]

    @staticmethod
    def set_curriculum_courses(curriculum_id: int, courses: list[dict]):
        existing = TrainingPlmService.get_curriculum(curriculum_id, include_courses=False)
        if not existing:
            return None
        if existing["status"] != "Draft":
            raise ValueError("Courses can only be changed on draft curricula.")

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM curriculum_courses WHERE curriculum_id=%s",
            (curriculum_id,),
        )
        for item in courses:
            cursor.execute(
                """
                INSERT INTO curriculum_courses (
                    curriculum_id, course_id, sequence_order, mandatory
                )
                VALUES (%s, %s, %s, %s)
                """,
                (
                    curriculum_id,
                    item["course_id"],
                    item.get("sequence_order", 0),
                    1 if item.get("mandatory", True) else 0,
                ),
            )
        conn.commit()
        conn.close()
        return TrainingPlmService.get_curriculum(curriculum_id)

    @staticmethod
    def set_curriculum_rules(
        curriculum_id: int,
        payload: dict,
        user_display_map: dict[str, str],
    ):
        existing = TrainingPlmService.get_curriculum(curriculum_id, include_courses=False)
        if not existing:
            return None
        if existing["status"] != "Draft":
            raise ValueError("Rules can only be changed on draft curricula.")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        if "due_date" in payload:
            cursor.execute(
                "UPDATE training_curriculum SET assignment_due_date=%s WHERE id=%s",
                (payload.get("due_date"), curriculum_id),
            )

        if "user_ids" in payload:
            cursor.execute("DELETE FROM curriculum_assignees WHERE curriculum_id=%s", (curriculum_id,))
            for user_id in payload.get("user_ids") or []:
                if user_id:
                    cursor.execute(
                        """
                        INSERT INTO curriculum_assignees (curriculum_id, user_id, user_display)
                        VALUES (%s, %s, %s)
                        """,
                        (curriculum_id, user_id, user_display_map.get(user_id) or user_id),
                    )

        if "group_ids" in payload:
            cursor.execute(
                "DELETE FROM curriculum_assignee_groups WHERE curriculum_id=%s",
                (curriculum_id,),
            )
            group_names = payload.get("group_names") or {}
            for group_id in payload.get("group_ids") or []:
                if group_id:
                    cursor.execute(
                        """
                        INSERT INTO curriculum_assignee_groups (curriculum_id, group_id, group_name)
                        VALUES (%s, %s, %s)
                        """,
                        (curriculum_id, group_id, group_names.get(group_id)),
                    )

        conn.commit()
        conn.close()
        return TrainingPlmService.get_curriculum(curriculum_id)

    @staticmethod
    def _create_curriculum_assignment_records(
        cursor,
        *,
        curriculum: dict,
        course_id: int,
        audience: dict[str, str],
        assigned_by: str | None,
        due_date: datetime | None,
    ):
        created_assignments = []
        for user_id, display in audience.items():
            cursor.execute(
                """
                INSERT INTO curriculum_assignments (
                    curriculum_id, user_id, user_display, assigned_by, due_date, status
                )
                VALUES (%s, %s, %s, %s, %s, 'Assigned')
                """,
                (curriculum["id"], user_id, display, assigned_by, due_date),
            )
            assignment_id = cursor.lastrowid

            cursor.execute(
                """
                INSERT INTO plm_training_records (
                    user_id, user_display, course_id, form_id, curriculum_id,
                    assignment_id, curriculum_revision, status,
                    completion_date, due_date
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'Assigned', NULL, %s)
                """,
                (
                    user_id,
                    display,
                    course_id,
                    curriculum.get("form_id"),
                    curriculum["id"],
                    assignment_id,
                    curriculum.get("revision"),
                    due_date,
                ),
            )

            cursor.execute(
                "SELECT * FROM curriculum_assignments WHERE id=%s",
                (assignment_id,),
            )
            created_assignments.append(_serialize_row(cursor.fetchone()))

        return created_assignments

    @staticmethod
    def release_curriculum(
        curriculum_id: int,
        user_display_map: dict[str, str],
        assigned_by: str | None,
    ):
        curriculum = TrainingPlmService.get_curriculum(curriculum_id)
        if not curriculum:
            return None
        if curriculum["status"] != "Draft":
            raise ValueError("Only draft curricula can be released.")
        if not curriculum.get("form_id"):
            raise ValueError("Select a training form before releasing.")

        course_id = TrainingPlmService._sync_curriculum_linked_course(curriculum_id)
        if not course_id:
            raise ValueError("Could not prepare curriculum template.")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "UPDATE training_curriculum SET status='Released' WHERE id=%s",
            (curriculum_id,),
        )
        cursor.execute(
            "UPDATE training_courses SET status='Released' WHERE id=%s",
            (course_id,),
        )
        conn.commit()
        conn.close()
        return TrainingPlmService.get_curriculum(curriculum_id)

    @staticmethod
    def submit_curriculum_for_review(
        curriculum_id: int,
        payload: dict,
        user_display_map: dict[str, str],
    ):
        curriculum = TrainingPlmService.get_curriculum(curriculum_id, include_courses=False)
        if not curriculum:
            return None
        if curriculum["status"] != "Draft":
            raise ValueError("Only draft curricula can be sent for review.")

        approver_id = (
            (payload.get("approver_user_id") or curriculum.get("approver_user_id") or "")
            .strip()
            or None
        )
        if not approver_id:
            raise ValueError("Select an approver before sending for review.")

        approver_display = user_display_map.get(approver_id) or approver_id
        effective_date = payload.get("effective_date")
        if effective_date is None:
            effective_date = curriculum.get("effective_date")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            UPDATE training_curriculum
            SET status='Pending Approval',
                approver_user_id=%s,
                approver_display=%s,
                effective_date=%s
            WHERE id=%s
            """,
            (approver_id, approver_display, effective_date, curriculum_id),
        )
        conn.commit()
        conn.close()
        return TrainingPlmService.get_curriculum(curriculum_id)

    @staticmethod
    def approve_curriculum(curriculum_id: int):
        curriculum = TrainingPlmService.get_curriculum(curriculum_id, include_courses=False)
        if not curriculum:
            return None
        if curriculum["status"] != "Pending Approval":
            raise ValueError("Only pending curricula can be approved.")

        course_id = TrainingPlmService._curriculum_linked_course_id(curriculum_id)
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "UPDATE training_curriculum SET status='Released' WHERE id=%s",
            (curriculum_id,),
        )
        if course_id:
            cursor.execute(
                "UPDATE training_courses SET status='Released' WHERE id=%s",
                (course_id,),
            )
        conn.commit()
        conn.close()
        return TrainingPlmService.get_curriculum(curriculum_id)

    @staticmethod
    def archive_curriculum(curriculum_id: int):
        curriculum = TrainingPlmService.get_curriculum(curriculum_id, include_courses=False)
        if not curriculum:
            return None
        if curriculum["status"] != "Released":
            raise ValueError("Only published curricula can be archived.")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "UPDATE training_curriculum SET status='Obsolete' WHERE id=%s",
            (curriculum_id,),
        )
        conn.commit()
        conn.close()
        return TrainingPlmService.get_curriculum(curriculum_id)

    @staticmethod
    def revise_curriculum(curriculum_id: int, created_by: str | None):
        existing = TrainingPlmService.get_curriculum(curriculum_id)
        if not existing:
            return None
        if existing["status"] != "Released":
            raise ValueError("Only released curricula can be revised.")

        new_revision = next_revision(existing["revision"])
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            UPDATE training_curriculum
            SET revision=%s,
                status='Draft',
                approver_user_id=NULL,
                approver_display=NULL,
                effective_date=NULL
            WHERE id=%s
            """,
            (new_revision, curriculum_id),
        )
        course_id = TrainingPlmService._curriculum_linked_course_id(curriculum_id)
        if course_id:
            cursor.execute(
                """
                UPDATE training_courses
                SET revision=%s, status='Draft'
                WHERE id=%s
                """,
                (new_revision, course_id),
            )
        conn.commit()
        conn.close()
        return TrainingPlmService.get_curriculum(curriculum_id)

    # ── Assignments & records ────────────────────────────────────────

    @staticmethod
    def assign_curriculum(
        *,
        curriculum_id: int,
        user_ids: list[str],
        group_ids: list[str] | None = None,
        user_display_map: dict[str, str],
        assigned_by: str | None,
        due_date: datetime | None,
    ):
        curriculum = TrainingPlmService.get_curriculum(curriculum_id)
        if not curriculum:
            raise ValueError("Curriculum not found.")
        if curriculum["status"] != "Released":
            raise ValueError("Only released curricula can be assigned.")

        course_id = TrainingPlmService._curriculum_linked_course_id(curriculum_id)
        if not course_id:
            course_id = TrainingPlmService._sync_curriculum_linked_course(curriculum_id)
        if not course_id:
            raise ValueError("Curriculum template is not ready for assignment.")
        if not curriculum.get("form_id"):
            raise ValueError("Curriculum has no training form configured.")

        audience = TrainingPlmService._resolve_audience(
            user_ids,
            group_ids or [],
            user_display_map,
        )
        if not audience:
            raise ValueError("Select at least one user or group.")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        created_assignments = TrainingPlmService._create_curriculum_assignment_records(
            cursor,
            curriculum=curriculum,
            course_id=course_id,
            audience=audience,
            assigned_by=assigned_by,
            due_date=due_date,
        )
        conn.commit()
        conn.close()
        return created_assignments

    @staticmethod
    def list_assignments(*, user_id: str | None = None, curriculum_id: int | None = None):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        clauses = []
        params: list = []
        if user_id:
            clauses.append("a.user_id = %s")
            params.append(user_id)
        if curriculum_id:
            clauses.append("a.curriculum_id = %s")
            params.append(curriculum_id)

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        cursor.execute(
            f"""
            SELECT a.*, c.curriculum_name
            FROM curriculum_assignments a
            JOIN training_curriculum c ON c.id = a.curriculum_id
            {where}
            ORDER BY a.assigned_date DESC
            """,
            tuple(params),
        )
        rows = [_serialize_row(row) for row in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def list_records(*, user_id: str | None = None, curriculum_id: int | None = None):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        clauses = []
        params: list = []
        if user_id:
            clauses.append("r.user_id = %s")
            params.append(user_id)
        if curriculum_id:
            clauses.append("r.curriculum_id = %s")
            params.append(curriculum_id)

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        cursor.execute(
            f"""
            SELECT
                r.*,
                c.course_code,
                c.course_name,
                c.revision AS course_revision,
                tc.curriculum_name,
                tc.curriculum_code,
                COALESCE(r.curriculum_revision, tc.revision) AS curriculum_revision,
                tc.form_id AS curriculum_form_id,
                tc.fielddata AS curriculum_fielddata,
                c.form_id AS course_form_id,
                a.assigned_date,
                COALESCE(r.due_date, a.due_date) AS due_date,
                fs.fmname AS form_name
            FROM plm_training_records r
            JOIN training_courses c ON c.id = r.course_id
            LEFT JOIN training_curriculum tc ON tc.id = r.curriculum_id
            LEFT JOIN curriculum_assignments a ON a.id = r.assignment_id
            LEFT JOIN formstab fs ON fs.fmid = COALESCE(r.form_id, c.form_id, tc.form_id)
            {where}
            ORDER BY r.updated_at DESC, r.id DESC
            """,
            tuple(params),
        )
        rows = [_enrich_training_record(row) for row in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def get_record(record_id: int):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT
                r.*,
                c.course_code,
                c.course_name,
                c.revision AS course_revision,
                tc.curriculum_name,
                tc.curriculum_code,
                COALESCE(r.curriculum_revision, tc.revision) AS curriculum_revision,
                tc.form_id AS curriculum_form_id,
                tc.fielddata AS curriculum_fielddata,
                c.form_id AS course_form_id,
                a.assigned_date,
                COALESCE(r.due_date, a.due_date) AS due_date,
                fs.fmname AS form_name
            FROM plm_training_records r
            JOIN training_courses c ON c.id = r.course_id
            LEFT JOIN training_curriculum tc ON tc.id = r.curriculum_id
            LEFT JOIN curriculum_assignments a ON a.id = r.assignment_id
            LEFT JOIN formstab fs ON fs.fmid = COALESCE(r.form_id, c.form_id, tc.form_id)
            WHERE r.id = %s
            """,
            (record_id,),
        )
        row = _enrich_training_record(cursor.fetchone())
        conn.close()
        return row

    @staticmethod
    def update_record(record_id: int, payload: dict, *, actor_sub: str | None = None):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM plm_training_records WHERE id=%s", (record_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            return None

        payload = dict(payload)
        submit_action = payload.pop("submit_action", None)
        execution_keys = {
            "status",
            "fielddata",
            "training_date",
            "completion_date",
            "remarks",
        }
        touches_execution = bool(submit_action) or any(
            key in payload and payload[key] is not None for key in execution_keys
        )
        if touches_execution:
            if not actor_sub or actor_sub != existing.get("user_id"):
                conn.close()
                raise ValueError("Only the assigned trainee can update training execution.")

        existing_full = TrainingPlmService.get_record(record_id) or {}
        assigned_start = existing_full.get("assigned_date") or existing.get("created_at")

        if submit_action == "save":
            payload["status"] = "In Progress"
            if not existing.get("training_date"):
                payload["training_date"] = assigned_start
        elif submit_action == "submit":
            payload["status"] = "Completed"
            if not existing.get("training_date") and "training_date" not in payload:
                payload["training_date"] = assigned_start
            payload["completion_date"] = datetime.now()

        if "status" in payload and payload["status"] is not None:
            normalized = _normalize_record_status(payload["status"])
            if normalized not in RECORD_STATUSES:
                conn.close()
                raise ValueError("Invalid training record status.")
            payload["status"] = normalized

        fields = []
        values = []
        for key in (
            "status",
            "training_date",
            "completion_date",
            "trainer",
            "remarks",
            "certificate_file",
            "fielddata",
        ):
            if key in payload and payload[key] is not None:
                fields.append(f"{key}=%s")
                if key == "fielddata":
                    values.append(json.dumps(payload[key]))
                else:
                    values.append(payload[key])

        if fields:
            values.append(record_id)
            cursor.execute(
                f"UPDATE plm_training_records SET {', '.join(fields)} WHERE id=%s",
                tuple(values),
            )
            conn.commit()

        conn.close()
        return TrainingPlmService.get_record(record_id)

    @staticmethod
    def qualification_matrix(*, user_id: str | None = None):
        records = TrainingPlmService.list_records(user_id=user_id)
        users: dict[str, dict] = {}

        for record in records:
            uid = record["user_id"]
            if uid not in users:
                users[uid] = {
                    "user_id": uid,
                    "user_display": record.get("user_display") or uid,
                    "courses": {},
                }
            course_key = record["course_id"]
            users[uid]["courses"][course_key] = {
                "course_id": record["course_id"],
                "course_code": record.get("course_code") or "",
                "course_name": record.get("course_name") or "",
                    "status": record.get("status") or "Assigned",
            }

        matrix = []
        for user in users.values():
            course_list = list(user["courses"].values())
            completed = sum(1 for c in course_list if c["status"] == "Completed")
            total = len(course_list)
            matrix.append(
                {
                    "user_id": user["user_id"],
                    "user_display": (user["user_display"] or user["user_id"] or "").strip(),
                    "courses": course_list,
                    "completion_percent": round((completed / total) * 100, 1) if total else 0,
                }
            )

        matrix = [row for row in matrix if row.get("user_id")]
        matrix.sort(key=lambda row: (row.get("user_display") or "").lower())
        return matrix

    @staticmethod
    def create_course_from_document(doc_id: int, owner_id: str | None):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM doctab WHERE id=%s", (doc_id,))
        doc = cursor.fetchone()
        conn.close()
        if not doc:
            raise ValueError("Document not found.")
        if (doc.get("dstatus") or "").strip() != "Released":
            raise ValueError("Training courses can only be created from released documents.")

        code_base = (doc.get("dname") or f"DOC-{doc_id}").upper().replace(" ", "-")[:40]
        revision = (doc.get("drev") or "A").strip().upper()
        created = TrainingPlmService.create_course(
            {
                "course_code": f"TR-{code_base}",
                "course_name": doc.get("dname") or f"Document {doc_id}",
                "description": doc.get("ddesc"),
                "category": doc.get("dtype"),
                "revision": revision,
                "doc_id": doc_id,
            },
            owner_id,
        )
        if created:
            TrainingPlmService.set_course_setup(
                created["id"],
                {"documents": [{"doc_id": doc_id, "sequence_order": 0}]},
                {},
            )
            return TrainingPlmService.get_course(created["id"], detailed=True)
        return created
