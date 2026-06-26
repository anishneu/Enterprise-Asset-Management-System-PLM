-- Enforce form type on forms table
UPDATE formstab
SET ftype = 'Form'
WHERE ftype IS NULL OR TRIM(ftype) = '';

ALTER TABLE formstab
  MODIFY COLUMN ftype VARCHAR(250) NOT NULL;

