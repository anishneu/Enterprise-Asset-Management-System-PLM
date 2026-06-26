-- Support form-based training records with completion status
ALTER TABLE traintab
  ADD COLUMN fid INT NULL AFTER id,
  ADD COLUMN fielddata JSON NULL,
  ADD COLUMN completionstatus VARCHAR(50) NOT NULL DEFAULT 'Pending' AFTER duedate;

ALTER TABLE traintab
  MODIFY COLUMN docid INT NULL,
  MODIFY COLUMN trainee VARCHAR(250) NULL;

UPDATE traintab
SET completionstatus = 'Pending'
WHERE completionstatus IS NULL OR TRIM(completionstatus) = '';
