-- Default trainer assigned at course design time

ALTER TABLE training_courses
  ADD COLUMN trainer_user_id VARCHAR(128) NULL AFTER release_due_date,
  ADD COLUMN trainer_name VARCHAR(255) NULL AFTER trainer_user_id;
