-- Store form category on documents (Documents, Training, etc.)
ALTER TABLE doctab
  ADD COLUMN ftype VARCHAR(250) NULL AFTER dtype;

UPDATE doctab
SET ftype = 'Documents'
WHERE ftype IS NULL OR TRIM(ftype) = '';

ALTER TABLE doctab
  MODIFY ftype VARCHAR(250) NOT NULL;

-- Align legacy form templates with nav form types
UPDATE formstab
SET ftype = 'Documents'
WHERE ftype NOT IN ('Documents', 'Training');

INSERT IGNORE INTO formtypetab (fname)
SELECT DISTINCT ftype FROM formstab WHERE ftype IS NOT NULL AND TRIM(ftype) <> '';
