-- PLM workflow engine: approval requests + audit history
-- Run against authdb after 014_formstab_doctab_workflow.sql

CREATE TABLE IF NOT EXISTS approval_requests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,
  entity_id INT NOT NULL,
  revision VARCHAR(20) NULL,
  entity_title VARCHAR(255) NULL,
  requester_sub VARCHAR(64) NOT NULL,
  requester_display VARCHAR(250) NULL,
  approver_sub VARCHAR(64) NOT NULL,
  approver_display VARCHAR(250) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  comments TEXT NULL,
  effective_date DATE NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_approval_status (status),
  INDEX idx_approval_approver (approver_sub, status),
  INDEX idx_approval_requester (requester_sub, status),
  INDEX idx_approval_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workflow_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,
  entity_id INT NOT NULL,
  revision VARCHAR(20) NULL,
  action VARCHAR(50) NOT NULL,
  performed_by_sub VARCHAR(64) NULL,
  performed_by_display VARCHAR(250) NULL,
  comments TEXT NULL,
  action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_history_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Normalize legacy status label
UPDATE formstab SET fmstatus = 'Pending Approval' WHERE fmstatus = 'In Review';
UPDATE doctab SET dstatus = 'Pending Approval' WHERE dstatus = 'In Review';
