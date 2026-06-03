CREATE TABLE `drill_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`drill_name` text NOT NULL,
	`session_count` integer DEFAULT 1 NOT NULL,
	`drill_level` text DEFAULT 'Amateur' NOT NULL,
	`talent_tier` text DEFAULT 'Normal' NOT NULL,
	`twox_ad` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
