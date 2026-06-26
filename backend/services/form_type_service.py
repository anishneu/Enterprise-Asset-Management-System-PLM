from database.db import get_connection

DEFAULT_FORM_TYPES = ("Documents", "Training")


class FormTypeService:
    @staticmethod
    def _normalize_row(row):
        if not row:
            return row
        record = dict(row)
        record["name"] = record.pop("fname", record.get("name"))
        if record.get("updated") is not None and hasattr(record["updated"], "isoformat"):
            record["updated"] = record["updated"].isoformat()
        return record

    @staticmethod
    def seed_defaults(cursor=None):
        owns_cursor = cursor is None
        if owns_cursor:
            conn = get_connection()
            cursor = conn.cursor()

        for name in DEFAULT_FORM_TYPES:
            cursor.execute(
                "INSERT IGNORE INTO formtypetab (fname) VALUES (%s);",
                (name,),
            )

        if owns_cursor:
            conn.commit()
            conn.close()

    @staticmethod
    def get_all_form_types():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        FormTypeService.seed_defaults(cursor)
        conn.commit()

        cursor.execute(
            """
            SELECT id, fname, updated
            FROM formtypetab
            ORDER BY fname ASC
            """
        )
        rows = [FormTypeService._normalize_row(row) for row in cursor.fetchall()]

        conn.close()
        return rows

    @staticmethod
    def ensure_form_type(name):
        cleaned = (name or "").strip()
        if not cleaned:
            raise ValueError("Form type is required")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        FormTypeService.seed_defaults(cursor)
        conn.commit()

        cursor.execute(
            "SELECT id, fname, updated FROM formtypetab WHERE fname=%s;",
            (cleaned,),
        )
        existing = FormTypeService._normalize_row(cursor.fetchone())
        if existing:
            conn.close()
            return existing

        cursor.execute(
            "INSERT INTO formtypetab (fname) VALUES (%s);",
            (cleaned,),
        )
        form_type_id = cursor.lastrowid
        conn.commit()

        cursor.execute(
            "SELECT id, fname, updated FROM formtypetab WHERE id=%s;",
            (form_type_id,),
        )
        created = FormTypeService._normalize_row(cursor.fetchone())

        conn.close()
        return created
