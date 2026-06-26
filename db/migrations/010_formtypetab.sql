-- Dynamic form types (nav-aligned categories such as Documents, Training)
CREATE TABLE IF NOT EXISTS formtypetab (
  id INT NOT NULL AUTO_INCREMENT,
  fname VARCHAR(250) NOT NULL,
  updated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_formtypetab_fname (fname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO formtypetab (fname) VALUES ('Documents'), ('Training');
