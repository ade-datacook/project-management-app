ALTER TABLE `clients` DROP INDEX `clients_name_unique`;--> statement-breakpoint
ALTER TABLE `clients` MODIFY COLUMN `name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `priority`;--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `estimatedTime`;--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `workTime`;