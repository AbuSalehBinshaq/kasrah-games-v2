CREATE TABLE `ad_events` (
	`id` varchar(64) NOT NULL,
	`adId` varchar(64) NOT NULL,
	`gameId` varchar(64) NOT NULL,
	`eventType` enum('impression','click','start','complete','error','close') NOT NULL,
	`playerId` varchar(255),
	`playerIp` varchar(45),
	`userAgent` text,
	`revenue` decimal(10,2) DEFAULT '0.00',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ad_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ads` (
	`id` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('interstitial','rewarded','banner') NOT NULL,
	`size` enum('300x250','728x90','320x50','custom') NOT NULL DEFAULT '300x250',
	`imageUrl` varchar(512),
	`clickUrl` varchar(512),
	`code` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`revenue` decimal(10,2) NOT NULL DEFAULT '0.00',
	`startDate` timestamp,
	`endDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_summary` (
	`id` varchar(64) NOT NULL,
	`gameId` varchar(64) NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalImpressions` int NOT NULL DEFAULT 0,
	`totalClicks` int NOT NULL DEFAULT 0,
	`totalRevenue` decimal(10,2) NOT NULL DEFAULT '0.00',
	`uniquePlayers` int NOT NULL DEFAULT 0,
	`avgPlayDuration` int NOT NULL DEFAULT 0,
	`totalPlayTime` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_summary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cloud_saves` (
	`id` varchar(64) NOT NULL,
	`gameId` varchar(64) NOT NULL,
	`playerId` varchar(255) NOT NULL,
	`data` json NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`isEncrypted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cloud_saves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_events` (
	`id` varchar(64) NOT NULL,
	`gameId` varchar(64) NOT NULL,
	`playerId` varchar(255) NOT NULL,
	`eventType` enum('gameplayStart','gameplayStop','gameLoadingFinished','happyTime','levelComplete','gameOver') NOT NULL,
	`duration` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` varchar(64) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`developer` varchar(255),
	`gameUrl` varchar(512) NOT NULL,
	`thumbnail` varchar(512),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `games_id` PRIMARY KEY(`id`),
	CONSTRAINT `games_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `sdk_configs` (
	`id` varchar(64) NOT NULL,
	`gameId` varchar(64) NOT NULL,
	`apiKey` varchar(255) NOT NULL,
	`allowedDomains` json NOT NULL,
	`adFrequency` int NOT NULL DEFAULT 30,
	`enableBanners` boolean NOT NULL DEFAULT true,
	`enableInterstitial` boolean NOT NULL DEFAULT true,
	`enableRewarded` boolean NOT NULL DEFAULT true,
	`enableCloudSave` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sdk_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `sdk_configs_gameId_unique` UNIQUE(`gameId`),
	CONSTRAINT `sdk_configs_apiKey_unique` UNIQUE(`apiKey`)
);
--> statement-breakpoint
CREATE INDEX `ad_events_ad_id_idx` ON `ad_events` (`adId`);--> statement-breakpoint
CREATE INDEX `ad_events_game_id_idx` ON `ad_events` (`gameId`);--> statement-breakpoint
CREATE INDEX `ad_events_event_type_idx` ON `ad_events` (`eventType`);--> statement-breakpoint
CREATE INDEX `ad_events_created_at_idx` ON `ad_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `ads_type_idx` ON `ads` (`type`);--> statement-breakpoint
CREATE INDEX `ads_active_idx` ON `ads` (`isActive`);--> statement-breakpoint
CREATE INDEX `analytics_summary_game_id_date_idx` ON `analytics_summary` (`gameId`,`date`);--> statement-breakpoint
CREATE INDEX `analytics_summary_game_id_idx` ON `analytics_summary` (`gameId`);--> statement-breakpoint
CREATE INDEX `cloud_saves_game_id_player_id_idx` ON `cloud_saves` (`gameId`,`playerId`);--> statement-breakpoint
CREATE INDEX `cloud_saves_game_id_idx` ON `cloud_saves` (`gameId`);--> statement-breakpoint
CREATE INDEX `cloud_saves_updated_at_idx` ON `cloud_saves` (`updatedAt`);--> statement-breakpoint
CREATE INDEX `game_events_game_id_idx` ON `game_events` (`gameId`);--> statement-breakpoint
CREATE INDEX `game_events_player_id_idx` ON `game_events` (`playerId`);--> statement-breakpoint
CREATE INDEX `game_events_event_type_idx` ON `game_events` (`eventType`);--> statement-breakpoint
CREATE INDEX `game_events_created_at_idx` ON `game_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `games_slug_idx` ON `games` (`slug`);--> statement-breakpoint
CREATE INDEX `games_active_idx` ON `games` (`isActive`);--> statement-breakpoint
CREATE INDEX `sdk_configs_game_id_idx` ON `sdk_configs` (`gameId`);--> statement-breakpoint
CREATE INDEX `sdk_configs_api_key_idx` ON `sdk_configs` (`apiKey`);