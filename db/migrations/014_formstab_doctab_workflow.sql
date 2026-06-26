-- Form and document workflow: revision, status, hyperlink, owner, approver, effective date

ALTER TABLE formstab
  ADD COLUMN fmrev VARCHAR(20) NOT NULL DEFAULT '1' AFTER ftype,
  ADD COLUMN fmstatus VARCHAR(50) NOT NULL DEFAULT 'Draft' AFTER fmrev,
  ADD COLUMN fmlink VARCHAR(500) NULL AFTER fmstatus,
  ADD COLUMN fowner VARCHAR(250) NULL AFTER fmlink,
  ADD COLUMN fmapprover VARCHAR(250) NULL AFTER fowner,
  ADD COLUMN fmeffective DATE NULL AFTER fmapprover;

ALTER TABLE doctab
  ADD COLUMN dstatus VARCHAR(50) NOT NULL DEFAULT 'Draft' AFTER drev,
  ADD COLUMN dlink VARCHAR(500) NULL AFTER dstatus,
  ADD COLUMN downer VARCHAR(250) NULL AFTER dlink,
  ADD COLUMN dapprover VARCHAR(250) NULL AFTER downer,
  ADD COLUMN deffective DATE NULL AFTER dapprover;
