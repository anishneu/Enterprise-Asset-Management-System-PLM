-- Fix training_courses.duration_hours column (typo duration_hourse or missing column)
-- Safe to re-run: only applies when needed.

DROP PROCEDURE IF EXISTS fix_training_courses_duration_hours;

DELIMITER //
CREATE PROCEDURE fix_training_courses_duration_hours()
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'training_courses'
      AND COLUMN_NAME = 'duration_hourse'
  ) THEN
    ALTER TABLE training_courses
      CHANGE COLUMN duration_hourse duration_hours DECIMAL(6,2) NULL;
  ELSEIF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'training_courses'
      AND COLUMN_NAME = 'duration_hours'
  ) THEN
    ALTER TABLE training_courses
      ADD COLUMN duration_hours DECIMAL(6,2) NULL AFTER status;
  END IF;
END//
DELIMITER ;

CALL fix_training_courses_duration_hours();
DROP PROCEDURE fix_training_courses_duration_hours;
