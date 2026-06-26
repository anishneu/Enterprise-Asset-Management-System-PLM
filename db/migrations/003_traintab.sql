-- Training assignments table (matches live schema)
CREATE TABLE IF NOT EXISTS traintab (
  id INT NOT NULL AUTO_INCREMENT,
  docid INT NOT NULL,
  rev VARCHAR(20) NOT NULL DEFAULT '1',
  title VARCHAR(250) NOT NULL,
  trainee VARCHAR(250) NOT NULL,
  assigndate DATE NULL,
  duedate DATE NULL,
  updated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_traintab_doc (id),
  KEY idx_traintab_trainee (trainee)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
