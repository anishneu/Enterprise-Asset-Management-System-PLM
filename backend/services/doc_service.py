import json
import random
import time

from constants.workflow import can_delete, can_edit, normalize_status
from database.db import get_connection


from services.form_type_service import FormTypeService

INITIAL_STATUS = "Draft"


class DocService:
    @staticmethod
    def _generate_unique_doc_name(cursor):
        for _ in range(20):
            suffix = f"{int(time.time() * 1000)}{random.randint(100, 999)}"
            name = f"Doc_{suffix}"
            cursor.execute("SELECT id FROM doctab WHERE dname=%s LIMIT 1;", (name,))
            if not cursor.fetchone():
                return name
            time.sleep(0.001)
        raise ValueError("Could not generate a unique document name")
    @staticmethod
    def _serialize_fielddata(fielddata):
        if fielddata is None:
            return None
        if isinstance(fielddata, str):
            return fielddata
        return json.dumps(fielddata)

    @staticmethod
    def _build_ddesc(dtype, fmat, drev):
        parts = [part for part in (dtype, fmat) if part]
        if not parts:
            return ""

        summary = " — ".join(parts)
        revision = (drev or "").strip()
        if summary and revision:
            return f"{summary} (Rev {revision})"
        return summary

    @staticmethod
    def _resolve_ddesc(doc, drev=None):
        stored = (doc.get("ddesc") or "").strip()
        if stored:
            return stored

        revision = drev if drev is not None else doc.get("drev")
        return DocService._build_ddesc(doc.get("dtype"), doc.get("fmat"), revision)

    @staticmethod
    def _normalize_doc(row):
        if not row:
            return row

        doc = dict(row)
        fielddata = doc.get("fielddata")
        if isinstance(fielddata, str):
            try:
                doc["fielddata"] = json.loads(fielddata)
            except json.JSONDecodeError:
                pass

        if doc.get("drev") is None:
            doc["drev"] = "1"

        if not doc.get("dstatus"):
            doc["dstatus"] = INITIAL_STATUS
        else:
            doc["dstatus"] = normalize_status(doc["dstatus"])

        doc["ddesc"] = DocService._resolve_ddesc(doc)

        return doc

    @staticmethod
    def get_all_docs(dtype=None):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if dtype:
            cursor.execute(
                "SELECT * FROM doctab WHERE dtype=%s ORDER BY id DESC;",
                (dtype.strip(),),
            )
        else:
            cursor.execute("SELECT * FROM doctab ORDER BY id DESC;")
        docs = [DocService._normalize_doc(row) for row in cursor.fetchall()]

        conn.close()
        return docs

    @staticmethod
    def get_doc(doc_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM doctab WHERE id=%s;", (doc_id,))
        doc = DocService._normalize_doc(cursor.fetchone())

        conn.close()
        return doc

    @staticmethod
    def add_doc(doc):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        dname = (doc.get("dname") or "").strip()
        if not dname:
            dname = DocService._generate_unique_doc_name(cursor)

        drev = (doc.get("drev") or "").strip()
        if not drev:
            raise ValueError("Revision is required")

        ddesc = DocService._resolve_ddesc(doc, drev)

        fid = doc.get("fid")
        if fid is None:
            raise ValueError("Form id is required")

        ftype = (doc.get("ftype") or "").strip()
        if not ftype:
            raise ValueError("Form type is required")

        FormTypeService.ensure_form_type(ftype)

        dstatus = normalize_status(doc.get("dstatus") or INITIAL_STATUS)
        dlink = (doc.get("dlink") or "").strip() or None
        downer = (doc.get("downer") or "").strip() or None
        dapprover = (doc.get("dapprover") or "").strip() or None
        deffective = doc.get("deffective") or None

        sql = """
        INSERT INTO doctab (
            dname, ddesc, dtype, ftype, fid, fmat, drev, dstatus,
            dlink, downer, dapprover, deffective, fielddata
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            sql,
            (
                dname,
                ddesc,
                doc["dtype"],
                ftype,
                fid,
                doc["fmat"],
                drev,
                dstatus,
                dlink,
                downer,
                dapprover,
                deffective or None,
                DocService._serialize_fielddata(doc.get("fielddata")),
            ),
        )

        doc_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT * FROM doctab WHERE id=%s;", (doc_id,))
        created = DocService._normalize_doc(cursor.fetchone())

        conn.close()
        return created

    @staticmethod
    def update_doc(doc_id, doc):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT dstatus FROM doctab WHERE id=%s;", (doc_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            raise ValueError("Document not found")

        if not can_edit(existing.get("dstatus")):
            conn.close()
            raise ValueError("Only draft documents can be edited")

        ddesc = DocService._resolve_ddesc(doc)
        fid = doc.get("fid")
        if fid is None:
            raise ValueError("Form id is required")

        ftype = (doc.get("ftype") or "").strip()
        if not ftype:
            raise ValueError("Form type is required")

        FormTypeService.ensure_form_type(ftype)

        dstatus = INITIAL_STATUS
        dlink = (doc.get("dlink") or "").strip() or None
        downer = (doc.get("downer") or "").strip() or None
        dapprover = (doc.get("dapprover") or "").strip() or None
        deffective = doc.get("deffective") or None

        sql = """
        UPDATE doctab
        SET dname=%s, ddesc=%s, dtype=%s, ftype=%s, fid=%s, fmat=%s, drev=%s,
            dstatus=%s, dlink=%s, downer=%s, dapprover=%s, deffective=%s, fielddata=%s
        WHERE id=%s
        """

        cursor.execute(
            sql,
            (
                doc["dname"],
                ddesc,
                doc["dtype"],
                ftype,
                fid,
                doc["fmat"],
                doc.get("drev") or "1",
                dstatus,
                dlink,
                downer,
                dapprover,
                deffective or None,
                DocService._serialize_fielddata(doc.get("fielddata")),
                doc_id,
            ),
        )

        conn.commit()

        cursor.execute("SELECT * FROM doctab WHERE id=%s;", (doc_id,))
        updated = DocService._normalize_doc(cursor.fetchone())

        conn.close()
        return updated

    @staticmethod
    def delete_doc(doc_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT dstatus FROM doctab WHERE id=%s;", (doc_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            raise ValueError("Document not found")

        if not can_delete(existing.get("dstatus")):
            conn.close()
            raise ValueError("Only draft documents can be deleted")

        cursor = conn.cursor()
        cursor.execute("DELETE FROM doctab WHERE id=%s", (doc_id,))

        conn.commit()
        conn.close()

        return {"message": "Document deleted successfully"}
