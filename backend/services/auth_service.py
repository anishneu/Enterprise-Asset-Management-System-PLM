from database.db import get_connection

class AuthService:

    # =========================
    # REGISTER USER
    # =========================
    @staticmethod
    def register(name, email, password):

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if email already exists
        cursor.execute(
            "SELECT * FROM users WHERE email=%s",
            (email,)
        )

        if cursor.fetchone():
            conn.close()
            return {"message": "Email already exists", "success": False}

        # Insert new user (plain text password)
        cursor.execute(
            """
            INSERT INTO users (name, email, password)
            VALUES (%s, %s, %s)
            """,
            (name, email, password)
        )

        conn.commit()
        conn.close()

        return {"message": "Registration successful", "success": True}


    # =========================
    # LOGIN USER
    # =========================
    @staticmethod
    def login(email, password):

        print("Email received:", email)
        print("Password received:", password)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Step 1: validate user
        cursor.execute(
            "SELECT id, name, email FROM users WHERE email=%s AND password=%s",
            (email, password)
        )

        user = cursor.fetchone()

        if not user:
            conn.close()
            return {
                "message": "Invalid email or password",
                "success": False
            }

        conn.close()

        return {
            "message": "Login successful",
            "success": True,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"]
            },
        }
    
    