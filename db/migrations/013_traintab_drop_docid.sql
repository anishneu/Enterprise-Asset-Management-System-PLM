-- Remove unused docid column from training records
ALTER TABLE traintab
  DROP COLUMN docid;
