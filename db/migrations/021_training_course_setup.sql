-- Course setup: training forms, multi-document links, pre-release audience, record form data

ALTER TABLE training_courses
  ADD COLUMN form_id INT NULL AFTER doc_id,
  ADD COLUMN release_due_date DATETIME NULL AFTER form_id;

CREATE TABLE IF NOT EXISTS course_documents (
  id INT NOT NULL AUTO_INCREMENT,
  course_id INT NOT NULL,
  doc_id INT NOT NULL,
  sequence_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_document (course_id, doc_id),
  KEY idx_course_documents_course (course_id),
  KEY idx_course_documents_doc (doc_id),
  CONSTRAINT fk_course_documents_course
    FOREIGN KEY (course_id) REFERENCES training_courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS course_assignees (
  id INT NOT NULL AUTO_INCREMENT,
  course_id INT NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  user_display VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_assignee (course_id, user_id),
  KEY idx_course_assignees_course (course_id),
  CONSTRAINT fk_course_assignees_course
    FOREIGN KEY (course_id) REFERENCES training_courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS course_assignee_groups (
  id INT NOT NULL AUTO_INCREMENT,
  course_id INT NOT NULL,
  group_id VARCHAR(128) NOT NULL,
  group_name VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_assignee_group (course_id, group_id),
  KEY idx_course_assignee_groups_course (course_id),
  CONSTRAINT fk_course_assignee_groups_course
    FOREIGN KEY (course_id) REFERENCES training_courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE plm_training_records
  ADD COLUMN form_id INT NULL AFTER course_id,
  ADD COLUMN due_date DATETIME NULL AFTER completion_date,
  ADD COLUMN fielddata JSON NULL AFTER remarks;
