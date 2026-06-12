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