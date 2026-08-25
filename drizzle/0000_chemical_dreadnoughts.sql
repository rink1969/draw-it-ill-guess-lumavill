CREATE TABLE `memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`save_key` text NOT NULL,
	`title` text NOT NULL,
	`story` text NOT NULL,
	`target_word` text NOT NULL,
	`emoji` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`difficulty` text NOT NULL,
	`drawing_data_url` text NOT NULL,
	`attempts_json` text NOT NULL,
	`solved` integer DEFAULT false NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memories_save_key` ON `memories` (`save_key`);