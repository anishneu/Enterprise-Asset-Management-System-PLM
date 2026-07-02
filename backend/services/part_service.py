from database.db import get_connection

class PartService:

    @staticmethod
    def get_all_parts():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM parttb")
        data = cursor.fetchall()

        conn.close()
        return data

    @staticmethod
    def get_part(part_id):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM parttb WHERE id=%s", (part_id,))
        row = cursor.fetchone()
        conn.close()
        return row

    # ================= ADD =================
    @staticmethod
    def add_part(part):
        conn = get_connection()
        cursor = conn.cursor()

        sql = """
        INSERT INTO parttb (partno, pdesc, prev)
        VALUES (%s, %s, %s)
        """

        cursor.execute(sql, (
            part["partno"],
            part["pdesc"],
            part["prev"]
        ))

        part_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return {
            "message": "Part added successfully",
            "id": part_id,
            "partno": part["partno"],
            "pdesc": part["pdesc"],
            "prev": part["prev"],
        }

    # ================= UPDATE =================
    @staticmethod
    def update_part(part_id, part):
        conn = get_connection()
        cursor = conn.cursor()

        sql = """
        UPDATE parttb
        SET partno=%s, pdesc=%s, prev=%s
        WHERE id=%s
        """

        cursor.execute(sql, (
            part["partno"],
            part["pdesc"],
            part["prev"],
            part_id
        ))

        conn.commit()
        conn.close()

        return {
            "message": "Part updated successfully",
            "id": part_id,
            "partno": part["partno"],
            "pdesc": part["pdesc"],
            "prev": part["prev"],
        }

    # ================= DELETE =================
    @staticmethod
    def delete_part(part_id):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM parttb WHERE id=%s", (part_id,))

        conn.commit()
        conn.close()

        return {"message": "Part deleted successfully"}
    