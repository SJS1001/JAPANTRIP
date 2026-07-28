CREATE TABLE IF NOT EXISTS `geocode_cache` (
	`query` text PRIMARY KEY NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geocode_rate_limit` (
	`id` text PRIMARY KEY NOT NULL,
	`last_request_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `weather_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `weather_refresh_lock` (
	`id` text PRIMARY KEY NOT NULL,
	`last_request_at` integer DEFAULT 0 NOT NULL
);
