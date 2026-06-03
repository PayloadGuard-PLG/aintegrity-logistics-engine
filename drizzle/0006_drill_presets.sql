CREATE TABLE IF NOT EXISTS `drill_presets` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `drill_names` text NOT NULL,
  `created_at` integer NOT NULL
);
