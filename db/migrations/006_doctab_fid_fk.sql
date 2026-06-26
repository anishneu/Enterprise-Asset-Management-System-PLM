-- Enforce non-null dtype & fid and add FK to formstab
--
-- 1) Ensure existing rows have dtype
UPDATE doctab
SET dtype = 'Form'
WHERE dtype IS NULL OR TRIM(dtype) = '';
--
-- 2) Ensure existing rows have fid (try to read from JSON payload first)
--    NOTE: Requires MySQL 8.0+ and valid JSON in `fielddata`.
UPDATE doctab
SET fid = CAST(JSON_UNQUOTE(JSON_EXTRACT(fielddata, '$.formId')) AS UNSIGNED)
WHERE (fid IS NULL OR fid = 0) AND fielddata IS NOT NULL;
--
-- 3) If any fid are still NULL/0, you must backfill manually before enforcing NOT NULL.
--    Example:
--    UPDATE doctab SET fid = 12 WHERE id = 10;
--
-- 4) Enforce constraints + FK
ALTER TABLE doctab
  MODIFY COLUMN dtype VARCHAR(250) NOT NULL,
  MODIFY COLUMN fid INT NOT NULL,
  ADD CONSTRAINT fk_doctab_fid_formstab
    FOREIGN KEY (fid) REFERENCES formstab(fmid)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

