from database.db import get_connection

class FormService:

    @staticmethod
    def get_all_forms():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM formstab;")
        forms = cursor.fetchall()
        print(forms)

        conn.close()
        return forms
    
    # ================= ADD =================
    @staticmethod
    def add_form(form):
        conn = get_connection()
        cursor = conn.cursor()

        sql = """
        INSERT INTO formstab (fmname, dtype, fmjson)
        VALUES (%s, %s, %s)
        """

        cursor.execute(sql, (
            form["fmname"],
            form["dtype"],
            form["fmjson"]
        ))

        conn.commit()
        conn.close()

        return {"message": "Form added successfully"}

    # ================= UPDATE =================
    @staticmethod
    def update_form(form_id, form):
        conn = get_connection()
        cursor = conn.cursor()

        sql = """
        UPDATE formstab
        SET fmname=%s, dtype=%s, fmjson=%s
        WHERE id=%s
        """

        cursor.execute(sql, (
            form["fmname"],
            form["dtype"],
            form["fmjson"],
            form_id
        ))

        conn.commit()
        conn.close()

        return {"message": "Form updated successfully"}

    # ================= DELETE =================
    @staticmethod
    def delete_form(form_id):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM formstab WHERE id=%s", (form_id,))

        conn.commit()
        conn.close()

        return {"message": "Form deleted successfully"}
     