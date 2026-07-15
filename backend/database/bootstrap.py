"""Ensure required tables exist (handles Docker volumes created before migrations)."""

from database.db import get_connection

_WORKFLOW_HISTORY_SQL = """
CREATE TABLE IF NOT EXISTS `workflow_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(20) NOT NULL,
  `entity_id` int NOT NULL,
  `revision` varchar(20) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `performed_by_sub` varchar(64) DEFAULT NULL,
  `performed_by_display` varchar(250) DEFAULT NULL,
  `comments` text,
  `action_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_history_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
"""


def ensure_schema() -> None:
    """Apply idempotent schema fixes for databases created before all migrations ran."""
    from config import DB_HOST, DB_NAME, DB_USER

    try:
        conn = get_connection()
    except Exception as exc:
        raise RuntimeError(
            f"Cannot connect to MySQL as {DB_USER!r}@{DB_HOST!r}/{DB_NAME!r}. "
            "Check DB_* values in the project root .env. Also clear leftover shell "
            "vars with: unset DB_PASSWORD DB_USER DB_USERNAME"
        ) from exc

    try:
        cursor = conn.cursor()
        cursor.execute(_WORKFLOW_HISTORY_SQL)
        conn.commit()
    finally:
        conn.close()
