-- Extend doctab for revisions, created timestamp, form field data, and unique document names
ALTER TABLE doctab
  ADD COLUMN drev VARCHAR(20) NOT NULL DEFAULT '1' AFTER fmat,
  ADD COLUMN fielddata JSON NULL AFTER drev,
  ADD COLUMN created TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER updated;

-- Enforce unique auto-generated document names (Doc_<timestamp>)
ALTER TABLE doctab
  ADD UNIQUE KEY uk_doctab_dname (dname);
