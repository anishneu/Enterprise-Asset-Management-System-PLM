-- Workflow action history (forms, docs, curriculum approvals).
-- Safe to run on existing databases; skipped when the table already exists.

CREATE TABLE IF NOT EXISTS `workflow_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(20) NOT NULL,
  `entity_id` int NOT NULL,
  `revision` varchar(20) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `performed_by_sub` varchar(64) DEFAULT NULL,
  `performed_by_display` varchar(250) DEFAULT NULL,
  `comments` text,
  `action_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_history_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
