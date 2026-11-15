CREATE TABLE `community_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`alias` text NOT NULL,
	`channel` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `community_channel_created` ON `community_posts` (`channel`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_owner_created` ON `community_posts` (`owner`,`created_at`);