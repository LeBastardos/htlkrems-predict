-- htlkrems-predict Datenbank-Schema
-- Wird beim ersten Start automatisch über SQLModel.metadata.create_all() erstellt.
-- Diese Datei dient als Referenz und für manuelle Resets.

CREATE TABLE IF NOT EXISTS `users` (
    `id`                INT          NOT NULL AUTO_INCREMENT,
    `azure_oid`         VARCHAR(255) NOT NULL DEFAULT '',
    `name`              VARCHAR(255) NOT NULL DEFAULT '',
    `email`             VARCHAR(255) NOT NULL,
    `role`              VARCHAR(50)  NOT NULL DEFAULT 'user',
    `balance`           DOUBLE       NOT NULL DEFAULT 1000.0,
    `last_daily_claim`  DATETIME     NULL,
    `last_login_at`     DATETIME     NULL,
    `allow_as_subject`  TINYINT(1)   NOT NULL DEFAULT 1,
    `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email`     (`email`),
    UNIQUE KEY `uq_users_azure_oid` (`azure_oid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `markets` (
    `id`          INT          NOT NULL AUTO_INCREMENT,
    `title`       VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `end_date`    DATETIME     NOT NULL,
    `status`      VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    `current_pool` DOUBLE      NOT NULL DEFAULT 0.0,
    `pool_yes`    DOUBLE       NOT NULL DEFAULT 0.0,
    `pool_no`     DOUBLE       NOT NULL DEFAULT 0.0,
    `odds_yes`    DOUBLE       NOT NULL DEFAULT 0.5,
    `odds_no`     DOUBLE       NOT NULL DEFAULT 0.5,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by`  INT          NULL,
    PRIMARY KEY (`id`),
    KEY `ix_markets_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `odds_history` (
    `id`         INT      NOT NULL AUTO_INCREMENT,
    `market_id`  INT      NOT NULL,
    `odds_yes`   DOUBLE   NOT NULL,
    `odds_no`    DOUBLE   NOT NULL,
    `pool_yes`   DOUBLE   NOT NULL DEFAULT 0.0,
    `pool_no`    DOUBLE   NOT NULL DEFAULT 0.0,
    `timestamp`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ix_odds_history_market_id` (`market_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bets` (
    `id`         INT      NOT NULL AUTO_INCREMENT,
    `user_id`    INT      NOT NULL,
    `market_id`  INT      NOT NULL,
    `amount`     DOUBLE   NOT NULL,
    `choice`     TINYINT(1) NOT NULL,
    `status`     VARCHAR(20) NOT NULL DEFAULT 'placed',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ix_bets_user_id`   (`user_id`),
    KEY `ix_bets_market_id` (`market_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `transactions` (
    `id`        INT          NOT NULL AUTO_INCREMENT,
    `user_id`   INT          NOT NULL,
    `amount`    DOUBLE       NOT NULL,
    `type`      VARCHAR(50)  NOT NULL,
    `reason`    VARCHAR(255) NULL,
    `timestamp` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ix_transactions_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;