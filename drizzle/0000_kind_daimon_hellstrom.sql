CREATE TABLE `coaches` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`session_type` text DEFAULT 'Training' NOT NULL,
	`multiplier` integer NOT NULL,
	`attributes` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'Academy' NOT NULL,
	`cost_currency` text DEFAULT 'free' NOT NULL,
	`cost_amount` integer DEFAULT 0 NOT NULL,
	`duration_days` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`roles` text DEFAULT '["ST"]' NOT NULL,
	`age` integer NOT NULL,
	`overall` real NOT NULL,
	`tier` text DEFAULT 'None' NOT NULL,
	`stats` text DEFAULT '{}' NOT NULL,
	`is_mutant_candidate` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
