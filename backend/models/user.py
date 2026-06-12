from database.db import get_connection

class User:

    @staticmethod
    def find_by_email(email):

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM users WHERE email=%s",
            (email,)
        )

        user = cursor.fetchone()

        cursor.close()
        conn.close()

        return user

    @staticmethod
    def create_user(name, email, password):

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO users(name,email,password)
            VALUES(%s,%s,%s)
            """,
            (name, email, password)
        )

        conn.commit()

        cursor.close()
        conn.close()