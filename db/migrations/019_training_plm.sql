-- PLM training model: courses -> curriculum -> assignment -> records
-- Run against authdb after prior migrations

CREATE TABLE IF NOT EXISTS training_courses (
  id INT NOT NULL AUTO_INCREMENT,
  course_code VARCHAR(50) NOT NULL,
  course_name VARCHAR(250) NOT NULL,
  description TEXT NULL,
  category VARCHAR(100) NULL,
  revision VARCHAR(20) NOT NULL DEFAULT 'A',
  status VARCHAR(30) NOT NULL DEFAULT 'Draft',
  duration_hours DECIMAL(6,2) NULL,
  pass_percentage INT NULL,
  requires_assessment TINYINT(1) NOT NULL DEFAULT 0,
  validity_months INT NULL,
  doc_id INT NULL,
  owner_id VARCHAR(128) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_training_course_code_rev (course_code, revision),
  KEY idx_training_course_status (status),
  KEY idx_training_course_doc (doc_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS training_curriculum (
  id INT NOT NULL AUTO_INCREMENT,
  curriculum_code VARCHAR(50) NOT NULL,
  curriculum_name VARCHAR(250) NOT NULL,
  description TEXT NULL,
  revision VARCHAR(20) NOT NULL DEFAULT 'A',
  status VARCHAR(30) NOT NULL DEFAULT 'Draft',
  created_by VARCHAR(128) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_training_curriculum_code_rev (curriculum_code, revision),
  KEY idx_training_curriculum_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS curriculum_courses (
  id INT NOT NULL AUTO_INCREMENT,
  curriculum_id INT NOT NULL,
  course_id INT NOT NULL,
  sequence_order INT NOT NULL DEFAULT 0,
  mandatory TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_curriculum_course (curriculum_id, course_id),
  KEY idx_curriculum_courses_curr (curriculum_id),
  KEY idx_curriculum_courses_course (course_id),
  CONSTRAINT fk_curriculum_courses_curr
    FOREIGN KEY (curriculum_id) REFERENCES training_curriculum (id) ON DELETE CASCADE,
  CONSTRAINT fk_curriculum_courses_course
    FOREIGN KEY (course_id) REFERENCES training_courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS curriculum_assignments (
  id INT NOT NULL AUTO_INCREMENT,
  curriculum_id INT NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  user_display VARCHAR(255) NULL,
  assigned_by VARCHAR(128) NULL,
  assigned_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Assigned',
  PRIMARY KEY (id),
  KEY idx_curriculum_assign_curr (curriculum_id),
  KEY idx_curriculum_assign_user (user_id),
  CONSTRAINT fk_curriculum_assign_curr
    FOREIGN KEY (curriculum_id) REFERENCES training_curriculum (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS plm_training_records (
  id INT NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(128) NOT NULL,
  user_display VARCHAR(255) NULL,
  course_id INT NOT NULL,
  curriculum_id INT NULL,
  assignment_id INT NULL,
  training_date DATETIME NULL,
  completion_date DATETIME NULL,
  trainer VARCHAR(255) NULL,
  score DECIMAL(5,2) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  certificate_file VARCHAR(500) NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_plm_record_user (user_id),
  KEY idx_plm_record_course (course_id),
  KEY idx_plm_record_curr (curriculum_id),
  KEY idx_plm_record_assign (assignment_id),
  CONSTRAINT fk_plm_record_course
    FOREIGN KEY (course_id) REFERENCES training_courses (id),
  CONSTRAINT fk_plm_record_curr
    FOREIGN KEY (curriculum_id) REFERENCES training_curriculum (id),
  CONSTRAINT fk_plm_record_assign
    FOREIGN KEY (assignment_id) REFERENCES curriculum_assignments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
