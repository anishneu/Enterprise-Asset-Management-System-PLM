from database.db import get_connection

class DocService:

    @staticmethod
    def get_all_docs():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM doctab;")
        docs = cursor.fetchall()

        conn.close()
        return docs
    
     # ================= ADD =================
    @staticmethod
    def add_doc(doc):
        conn = get_connection()
        cursor = conn.cursor()

        sql = """
        INSERT INTO doctab (dname, ddesc, doctype, fmat)
        VALUES (%s, %s, %s, %s)
        """

        cursor.execute(sql, (
            doc["dname"],
            doc["ddesc"],
            doc["doctype"],
            doc["fmat"]
        ))

        conn.commit()
        conn.close()

        return {"message": "Document added successfully"}

    @staticmethod
    def update_doc(doc_id, doc):
        conn = get_connection()
        cursor = conn.cursor()

        sql = """
        UPDATE doctab
        SET dname=%s, ddesc=%s, doctype=%s, fmat=%s
        WHERE id=%s
        """

        cursor.execute(sql, (
            doc["dname"],
            doc["ddesc"],
            doc["doctype"],
            doc["fmat"],
            doc_id,
        ))

        conn.commit()
        conn.close()

        return {"message": "Document updated successfully"}

    @staticmethod
    def delete_doc(doc_id):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM doctab WHERE id=%s", (doc_id,))

        conn.commit()
        conn.close()

        return {"message": "Document deleted successfully"}
       