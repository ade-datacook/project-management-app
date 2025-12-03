ALTER TABLE `tasks` ADD `estimatedDays` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `taskType`;