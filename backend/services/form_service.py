import json



from constants.workflow import can_delete, can_edit, normalize_status
from database.db import get_connection



from services.form_type_service import FormTypeService



INITIAL_STATUS = "Draft"





class FormService:

    @staticmethod

    def _normalize_form(form):

        if not form:

            return form



        row = dict(form)

        if row.get("fmid") is not None and row.get("id") is None:

            row["id"] = row["fmid"]

        if row.get("fmrev") is None:

            row["fmrev"] = "1"

        if not row.get("fmstatus"):
            row["fmstatus"] = INITIAL_STATUS
        else:
            row["fmstatus"] = normalize_status(row["fmstatus"])

        return row



    @staticmethod

    def get_all_forms():

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)



        cursor.execute("SELECT * FROM formstab ORDER BY fmid DESC;")

        forms = [FormService._normalize_form(row) for row in cursor.fetchall()]



        conn.close()

        return forms



    @staticmethod

    def get_forms_by_ftype(ftype):

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)



        cursor.execute(

            """

            SELECT * FROM formstab

            WHERE ftype = %s

            ORDER BY fmname ASC;

            """,

            (ftype,),

        )

        forms = [FormService._normalize_form(row) for row in cursor.fetchall()]



        conn.close()

        return forms



    @staticmethod

    def get_form(form_id):

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)



        cursor.execute("SELECT * FROM formstab WHERE fmid=%s;", (form_id,))

        form = FormService._normalize_form(cursor.fetchone())



        conn.close()

        return form



    @staticmethod

    def add_form(form):

        ftype = (form.get("ftype") or "").strip()

        if not ftype:

            raise ValueError("Form type is required")



        FormTypeService.ensure_form_type(ftype)



        conn = get_connection()

        cursor = conn.cursor(dictionary=True)



        fmjson = form["fmjson"]

        if not isinstance(fmjson, str):

            fmjson = json.dumps(fmjson)



        fmrev = (form.get("fmrev") or "1").strip() or "1"

        fmstatus = (form.get("fmstatus") or INITIAL_STATUS).strip() or INITIAL_STATUS

        fmlink = (form.get("fmlink") or "").strip() or None

        fowner = (form.get("fowner") or "").strip() or None

        fmapprover = (form.get("fmapprover") or "").strip() or None

        fmeffective = form.get("fmeffective") or None



        sql = """

        INSERT INTO formstab (

            fmname, ftype, fmjson, fmrev, fmstatus, fmlink, fowner, fmapprover, fmeffective

        )

        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)

        """



        cursor.execute(

            sql,

            (

                form["fmname"],

                form["ftype"],

                fmjson,

                fmrev,

                fmstatus,

                fmlink,

                fowner,

                fmapprover,

                fmeffective or None,

            ),

        )



        form_id = cursor.lastrowid

        conn.commit()



        cursor.execute("SELECT * FROM formstab WHERE fmid=%s;", (form_id,))

        created = FormService._normalize_form(cursor.fetchone())



        conn.close()

        return created



    @staticmethod

    def update_form(form_id, form):

        ftype = (form.get("ftype") or "").strip()

        if not ftype:

            raise ValueError("Form type is required")



        FormTypeService.ensure_form_type(ftype)



        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT fmstatus FROM formstab WHERE fmid=%s;", (form_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            raise ValueError("Form not found")

        if not can_edit(existing.get("fmstatus")):
            conn.close()
            raise ValueError("Only draft forms can be edited")

        fmjson = form["fmjson"]

        if not isinstance(fmjson, str):

            fmjson = json.dumps(fmjson)



        fmrev = (form.get("fmrev") or "1").strip() or "1"

        fmstatus = normalize_status(existing.get("fmstatus"))

        fmlink = (form.get("fmlink") or "").strip() or None

        fowner = (form.get("fowner") or "").strip() or None

        fmapprover = (form.get("fmapprover") or "").strip() or None

        fmeffective = form.get("fmeffective") or None



        sql = """

        UPDATE formstab

        SET fmname=%s, ftype=%s, fmjson=%s, fmrev=%s, fmstatus=%s,

            fmlink=%s, fowner=%s, fmapprover=%s, fmeffective=%s

        WHERE fmid=%s

        """



        cursor.execute(

            sql,

            (

                form["fmname"],

                form["ftype"],

                fmjson,

                fmrev,

                fmstatus,

                fmlink,

                fowner,

                fmapprover,

                fmeffective or None,

                form_id,

            ),

        )



        conn.commit()



        cursor.execute("SELECT * FROM formstab WHERE fmid=%s;", (form_id,))

        updated = FormService._normalize_form(cursor.fetchone())



        conn.close()

        return updated

    @staticmethod
    def delete_form(form_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT fmstatus FROM formstab WHERE fmid=%s;", (form_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            raise ValueError("Form not found")

        if not can_delete(existing.get("fmstatus")):
            conn.close()
            raise ValueError("Only draft forms can be deleted")

        cursor.execute("DELETE FROM formstab WHERE fmid=%s", (form_id,))



        conn.commit()

        conn.close()



        return {"message": "Form deleted successfully"}


