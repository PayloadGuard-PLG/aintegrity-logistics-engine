// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo
// SQL content is inlined as strings — Metro cannot import .sql files as text via assetExts

import journal from './meta/_journal.json';

const m0000 = `CREATE TABLE \`coaches\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`type\` text NOT NULL,
	\`session_type\` text DEFAULT 'Training' NOT NULL,
	\`multiplier\` integer NOT NULL,
	\`attributes\` text DEFAULT '[]' NOT NULL,
	\`source\` text DEFAULT 'Academy' NOT NULL,
	\`cost_currency\` text DEFAULT 'free' NOT NULL,
	\`cost_amount\` integer DEFAULT 0 NOT NULL,
	\`duration_days\` integer DEFAULT 1 NOT NULL,
	\`created_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`players\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`roles\` text DEFAULT '["ST"]' NOT NULL,
	\`age\` integer NOT NULL,
	\`overall\` real NOT NULL,
	\`tier\` text DEFAULT 'None' NOT NULL,
	\`stats\` text DEFAULT '{}' NOT NULL,
	\`is_mutant_candidate\` integer DEFAULT false NOT NULL,
	\`created_at\` integer NOT NULL
);`;

const m0001 = `CREATE TABLE \`drill_sessions\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`player_id\` text NOT NULL,
	\`drill_name\` text NOT NULL,
	\`session_count\` integer DEFAULT 1 NOT NULL,
	\`drill_level\` text DEFAULT 'Amateur' NOT NULL,
	\`talent_tier\` text DEFAULT 'Normal' NOT NULL,
	\`twox_ad\` integer DEFAULT false NOT NULL,
	\`created_at\` integer NOT NULL
);`;

const m0002 = `ALTER TABLE \`players\` ADD \`talent\` text DEFAULT 'Normal' NOT NULL;`;

const m0003 = `ALTER TABLE \`players\` ADD \`snapshot\` text DEFAULT NULL;`;

const m0004 = `CREATE TABLE \`squad_plan_runs\` (\n  \`id\` text PRIMARY KEY NOT NULL,\n  \`player_id\` text NOT NULL,\n  \`label\` text DEFAULT NULL,\n  \`sessions\` integer NOT NULL,\n  \`selected_stats\` text NOT NULL,\n  \`ovr_before\` real NOT NULL,\n  \`ovr_after\` real NOT NULL,\n  \`gains\` text NOT NULL,\n  \`tier\` text DEFAULT NULL,\n  \`created_at\` integer NOT NULL\n);`;

const m0005 = `UPDATE \`players\` SET \`tier\` = 'T0' WHERE \`tier\` = 'None';
UPDATE \`players\` SET \`tier\` = 'T1' WHERE \`tier\` = 'Rare';
UPDATE \`players\` SET \`tier\` = 'T2' WHERE \`tier\` = 'Elite';
UPDATE \`players\` SET \`tier\` = 'T3' WHERE \`tier\` = 'Stellar';
UPDATE \`players\` SET \`tier\` = 'T4' WHERE \`tier\` = 'Master';
UPDATE \`players\` SET \`tier\` = 'T5' WHERE \`tier\` = 'Epic';
UPDATE \`players\` SET \`tier\` = 'T6' WHERE \`tier\` = 'Legendary';`;

const m0006 = `CREATE TABLE IF NOT EXISTS \`drill_presets\` (\n  \`id\` text PRIMARY KEY NOT NULL,\n  \`name\` text NOT NULL,\n  \`drill_names\` text NOT NULL,\n  \`created_at\` integer NOT NULL\n);`;

const m0007 = `ALTER TABLE \`players\` ADD \`new_role\` text;\nALTER TABLE \`players\` ADD \`new_role_points\` integer NOT NULL DEFAULT 0;`;

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
    m0005,
    m0006,
    m0007,
  },
};
