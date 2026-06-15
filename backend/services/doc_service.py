from database.db import get_connection

class DocService:

    @staticmethod
    def get_all_docs():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM doctab;")
        docs = cursor.fetchall()
        print(docs)

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
       
       