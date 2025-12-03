ALTER TABLE `tasks` ADD `priority` varchar(100);--> statement-breakpoint
ALTER TABLE `tasks` ADD `estimatedTime` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tasks` ADD `workTime` int DEFAULT 0;