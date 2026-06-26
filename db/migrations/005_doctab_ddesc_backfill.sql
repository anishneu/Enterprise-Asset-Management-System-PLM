-- Backfill empty document descriptions from form type, form name, and revision
UPDATE doctab
SET ddesc = CONCAT(ftype, ' — ', fmat, ' (Rev ', COALESCE(NULLIF(drev, ''), '1'), ')')
WHERE ddesc IS NULL OR TRIM(ddesc) = '';
