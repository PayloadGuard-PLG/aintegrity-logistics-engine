CREATE TABLE `squad_plan_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `player_id` text NOT NULL,
  `label` text DEFAULT NULL,
  `sessions` integer NOT NULL,
  `selected_stats` text NOT NULL,
  `ovr_before` real NOT NULL,
  `ovr_after` real NOT NULL,
  `gains` text NOT NULL,
  `tier` text DEFAULT NULL,
  `created_at` integer NOT NULL
);
