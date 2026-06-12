from database.db import get_connection

class UserService:

    @staticmethod
    def get_all_users():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM users;")
        users = cursor.fetchall()
        print(users)

        conn.close()
        return users