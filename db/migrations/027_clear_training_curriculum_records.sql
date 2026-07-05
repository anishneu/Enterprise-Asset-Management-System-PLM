-- One-time reset: clear all curriculum templates and training record execution data.
-- Run against authdb after migration 026.
-- Safe to run once; re-running only clears any data created since the last run.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE plm_training_records;
TRUNCATE TABLE curriculum_assignments;
TRUNCATE TABLE curriculum_documents;
TRUNCATE TABLE curriculum_assignees;
TRUNCATE TABLE curriculum_assignee_groups;
TRUNCATE TABLE curriculum_courses;
TRUNCATE TABLE course_documents;
TRUNCATE TABLE training_courses;
TRUNCATE TABLE training_curriculum;

SET FOREIGN_KEY_CHECKS = 1;
