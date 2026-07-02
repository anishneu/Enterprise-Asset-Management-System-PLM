-- Unified audit trail for all PLM entities
-- Run against authdb after prior migrations

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  entity_label VARCHAR(255) NULL,
  revision VARCHAR(20) NULL,
  action VARCHAR(50) NOT NULL,
  summary TEXT NULL,
  changes_json JSON NULL,
  performed_by_sub VARCHAR(128) NULL,
  performed_by_display VARCHAR(255) NULL,
  action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_type_date (entity_type, action_date),
  INDEX idx_audit_date (action_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
