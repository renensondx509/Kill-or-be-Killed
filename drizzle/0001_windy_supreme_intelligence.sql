CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`messageType` enum('text','quick') NOT NULL DEFAULT 'text',
	`filtered` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`player1Id` int NOT NULL,
	`player2Id` int NOT NULL,
	`stakeAmount` decimal(10,2) NOT NULL DEFAULT '0.10',
	`potAmount` decimal(10,2) NOT NULL DEFAULT '0.10',
	`commissionRate` decimal(5,4) NOT NULL DEFAULT '0.1000',
	`winnerId` int,
	`status` enum('waiting','active','completed','cancelled') NOT NULL DEFAULT 'waiting',
	`player1Rounds` int NOT NULL DEFAULT 0,
	`player2Rounds` int NOT NULL DEFAULT 0,
	`totalRounds` int NOT NULL DEFAULT 0,
	`payoutAmount` decimal(10,2),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('match_found','rematch_challenge','low_balance','payout_received','system') NOT NULL,
	`title` varchar(128) NOT NULL,
	`body` text NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playerLoadouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weaponId` int NOT NULL,
	`skinKey` varchar(64) DEFAULT 'default',
	`equippedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playerLoadouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playerStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`elo` int NOT NULL DEFAULT 1000,
	`tier` enum('bronze','silver','gold','platinum','diamond','apex') NOT NULL DEFAULT 'bronze',
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`totalMatches` int NOT NULL DEFAULT 0,
	`currentWinStreak` int NOT NULL DEFAULT 0,
	`bestWinStreak` int NOT NULL DEFAULT 0,
	`totalEarnings` decimal(10,2) NOT NULL DEFAULT '0.00',
	`totalStaked` decimal(10,2) NOT NULL DEFAULT '0.00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playerStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `playerStats_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`roundNumber` int NOT NULL,
	`winnerId` int,
	`player1Action` json,
	`player2Action` json,
	`player1Hit` boolean NOT NULL DEFAULT false,
	`player2Hit` boolean NOT NULL DEFAULT false,
	`durationMs` int,
	`isFinalRound` boolean NOT NULL DEFAULT false,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `rounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('topup','stake','payout','commission','refund') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`balanceBefore` decimal(10,2) NOT NULL,
	`balanceAfter` decimal(10,2) NOT NULL,
	`matchId` int,
	`stripePaymentIntentId` varchar(128),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` decimal(10,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weapons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`description` text,
	`damage` int NOT NULL DEFAULT 100,
	`recoilStrength` int NOT NULL DEFAULT 50,
	`effectColor` varchar(16) NOT NULL DEFAULT '#ff0000',
	`soundKey` varchar(64),
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weapons_id` PRIMARY KEY(`id`),
	CONSTRAINT `weapons_slug_unique` UNIQUE(`slug`)
);
