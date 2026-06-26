import json
from datetime import datetime

from database.db import get_connection

_TRAINING_COLUMNS = None

TRAINING_FIELDS = (
    "id",
    "fid",
    "rev",
    "title",
    "trainee",
    "assigndate",
    "duedate",
    "completionstatus",
    "fielddata",
    "updated",
)


class TrainingService:
    @staticmethod
    def _get_training_columns():
        global _TRAINING_COLUMNS
        if _TRAINING_COLUMNS is not None:
            return _TRAINING_COLUMNS

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'traintab'
            """
        )
        _TRAINING_COLUMNS = {row[0] for row in cursor.fetchall()}
        conn.close()
        return _TRAINING_COLUMNS

    @staticmethod
    def _select_columns():
        existing = TrainingService._get_training_columns()
        return [field for field in TRAINING_FIELDS if field in existing]

    @staticmethod
    def _select_clause():
        return ", ".join(TrainingService._select_columns())

    @staticmethod
    def _serialize_fielddata(fielddata):
        if fielddata is None:
            return None
        if isinstance(fielddata, str):
            return fielddata
        return json.dumps(fielddata)

    @staticmethod
    def _normalize_row(row):
        if not row:
            return row

        record = dict(row)
        fielddata = record.get("fielddata")
        if isinstance(fielddata, str):
            try:
                record["fielddata"] = json.loads(fielddata)
            except json.JSONDecodeError:
                pass

        for field in ("assigndate", "duedate"):
            value = record.get(field)
            if value is not None and hasattr(value, "isoformat"):
                record[field] = value.isoformat()
        if record.get("updated") is not None and hasattr(record["updated"], "isoformat"):
            record["updated"] = record["updated"].isoformat()

        record.setdefault("fid", None)
        record.setdefault("fielddata", None)
        if not record.get("completionstatus"):
            record["completionstatus"] = "Pending"

        return record

    @staticmethod
    def _fetch_training_row(cursor, training_id):
        cursor.execute(
            f"""
            SELECT {TrainingService._select_clause()}
            FROM traintab
            WHERE id=%s
            """,
            (training_id,),
        )
        return TrainingService._normalize_row(cursor.fetchone())

    @staticmethod
    def get_all_training():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT {TrainingService._select_clause()}
            FROM traintab
            ORDER BY id DESC
            """
        )
        rows = [TrainingService._normalize_row(row) for row in cursor.fetchall()]

        conn.close()
        return rows

    @staticmethod
    def get_training(training_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        row = TrainingService._fetch_training_row(cursor, training_id)

        conn.close()
        return row

    @staticmethod
    def add_training(training):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        existing = TrainingService._get_training_columns()

        assigndate = training.get("assigndate") or datetime.now()
        rev = (training.get("rev") or "1").strip() or "1"
        completionstatus = (training.get("completionstatus") or "Pending").strip() or "Pending"

        values_by_column = {
            "fid": training.get("fid"),
            "rev": rev,
            "title": training["title"],
            "trainee": training.get("trainee"),
            "assigndate": assigndate,
            "duedate": training.get("duedate"),
            "completionstatus": completionstatus,
            "fielddata": TrainingService._serialize_fielddata(training.get("fielddata")),
        }

        insert_columns = [
            column
            for column in (
                "fid",
                "rev",
                "title",
                "trainee",
                "assigndate",
                "duedate",
                "completionstatus",
                "fielddata",
            )
            if column in existing
        ]

        if "title" not in insert_columns:
            raise ValueError("traintab is missing required column: title")

        placeholders = ", ".join(["%s"] * len(insert_columns))
        column_list = ", ".join(insert_columns)

        cursor.execute(
            f"""
            INSERT INTO traintab ({column_list})
            VALUES ({placeholders})
            """,
            tuple(values_by_column[column] for column in insert_columns),
        )

        training_id = cursor.lastrowid
        conn.commit()

        created = TrainingService._fetch_training_row(cursor, training_id)

        conn.close()
        return created

    @staticmethod
    def update_training(training_id, training):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        existing = TrainingService._get_training_columns()

        values_by_column = {
            "fid": training.get("fid"),
            "rev": training.get("rev") or "1",
            "title": training["title"],
            "trainee": training.get("trainee"),
            "assigndate": training.get("assigndate"),
            "duedate": training.get("duedate"),
            "completionstatus": training.get("completionstatus") or "Pending",
            "fielddata": TrainingService._serialize_fielddata(training.get("fielddata")),
        }

        update_columns = [
            column
            for column in (
                "fid",
                "rev",
                "title",
                "trainee",
                "assigndate",
                "duedate",
                "completionstatus",
                "fielddata",
            )
            if column in existing
        ]

        set_clause = ", ".join(f"{column}=%s" for column in update_columns)

        cursor.execute(
            f"""
            UPDATE traintab
            SET {set_clause}
            WHERE id=%s
            """,
            (*[values_by_column[column] for column in update_columns], training_id),
        )

        conn.commit()

        updated = TrainingService._fetch_training_row(cursor, training_id)

        conn.close()
        return updated

    @staticmethod
    def delete_training(training_id):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM traintab WHERE id=%s", (training_id,))

        conn.commit()
        conn.close()

        return {"message": "Training record deleted successfully"}
