-- Archive released revisions when creating the next revision

CREATE TABLE IF NOT EXISTS form_revisions (
  revision_id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  revision VARCHAR(20) NOT NULL,
  fmname VARCHAR(250) NULL,
  fmjson JSON NULL,
  ftype VARCHAR(250) NULL,
  fmstatus VARCHAR(50) NULL,
  archived_by_display VARCHAR(250) NULL,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_form_revisions_form (form_id),
  CONSTRAINT fk_form_revisions_form
    FOREIGN KEY (form_id) REFERENCES formstab(fmid)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS doc_revisions (
  revision_id INT AUTO_INCREMENT PRIMARY KEY,
  doc_id INT NOT NULL,
  revision VARCHAR(20) NOT NULL,
  dname VARCHAR(100) NULL,
  ddesc VARCHAR(250) NULL,
  dtype VARCHAR(250) NULL,
  ftype VARCHAR(250) NULL,
  fid INT NULL,
  fmat VARCHAR(250) NULL,
  dstatus VARCHAR(50) NULL,
  fielddata JSON NULL,
  archived_by_display VARCHAR(250) NULL,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_doc_revisions_doc (doc_id),
  CONSTRAINT fk_doc_revisions_doc
    FOREIGN KEY (doc_id) REFERENCES doctab(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
