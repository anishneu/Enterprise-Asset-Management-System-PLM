-- Add missing ftype column to form_revisions (required for form revise archive)

ALTER TABLE form_revisions
  ADD COLUMN ftype VARCHAR(250) NULL AFTER fmjson;
