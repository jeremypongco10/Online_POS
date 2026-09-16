-- Execute IT POS — sanitized baseline dump
-- Generated 2026-09-17
--
-- Structure for all 38 tables. DATA is included ONLY for reference and
-- catalog tables (listed below). Every table holding a person, a
-- credential, money or an audit record ships as STRUCTURE ONLY.
--
-- Data included:  categories category_discount_eligibility companies 
--   migrations payment_methods permissions product_discount_eligibility 
--   products registers role_permissions roles stores tax_rates units
--
-- Structure only (deliberately emptied): users, customers,
-- loyalty_cards, loyalty_point_transactions, audit_logs, sales,
-- sale_items, payments, returns, return_items, cash_sessions,
-- cash_movements, revoked_tokens, user_stores, z_readings, inventory,
-- inventory_transactions, store_product_prices, invoice_series,
-- invoice_sequences, transaction_counters, purchase_orders,
-- purchase_order_items, suppliers.
--
-- Restore into an EMPTY database, then create your first admin user
-- through the app. See README for the full first-run steps.

-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: pos_system
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `user_name` varchar(150) DEFAULT NULL,
  `action` varchar(30) NOT NULL,
  `entity_type` varchar(60) NOT NULL,
  `entity_id` bigint(20) unsigned DEFAULT NULL,
  `entity_label` varchar(150) DEFAULT NULL,
  `changes` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `entity_type_entity_id` (`entity_type`,`entity_id`),
  KEY `user_id` (`user_id`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `audit_logs_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1552 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cash_movements`
--

DROP TABLE IF EXISTS `cash_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cash_movements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cash_session_id` bigint(20) unsigned NOT NULL,
  `type` enum('cash_in','cash_out') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cash_movements_user_id_foreign` (`user_id`),
  KEY `cash_session_id` (`cash_session_id`),
  CONSTRAINT `cash_movements_cash_session_id_foreign` FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cash_movements_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cash_sessions`
--

DROP TABLE IF EXISTS `cash_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cash_sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `register_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `opened_at` datetime NOT NULL,
  `closed_at` datetime DEFAULT NULL,
  `opening_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `closing_balance` decimal(15,2) DEFAULT NULL,
  `expected_balance` decimal(15,2) DEFAULT NULL,
  `difference` decimal(15,2) DEFAULT NULL,
  `status` enum('open','closed') NOT NULL DEFAULT 'open',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `register_id` (`register_id`),
  KEY `user_id` (`user_id`),
  KEY `status` (`status`),
  CONSTRAINT `cash_sessions_register_id_foreign` FOREIGN KEY (`register_id`) REFERENCES `registers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cash_sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_name` (`company_id`,`name`),
  KEY `company_id` (`company_id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `categories_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `categories_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `category_discount_eligibility`
--

DROP TABLE IF EXISTS `category_discount_eligibility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `category_discount_eligibility` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `category_id` bigint(20) unsigned NOT NULL,
  `discount_type` varchar(30) NOT NULL,
  `eligible` tinyint(1) unsigned DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_id_discount_type` (`category_id`,`discount_type`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `category_discount_eligibility_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `companies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `trade_name` varchar(150) NOT NULL,
  `legal_name` varchar(150) DEFAULT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `is_vat_registered` tinyint(1) unsigned DEFAULT 0,
  `vat_registration_number` varchar(50) DEFAULT NULL,
  `is_bir_registered` tinyint(1) NOT NULL DEFAULT 1,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `tax_system` varchar(10) NOT NULL DEFAULT 'vat',
  `pos_lock_idle_minutes` int(11) unsigned NOT NULL DEFAULT 0,
  `transaction_no_reset_rule` enum('per_session','per_register','per_day') NOT NULL DEFAULT 'per_session',
  `transaction_no_prefix` varchar(20) DEFAULT NULL,
  `transaction_no_length` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `timezone` varchar(64) NOT NULL DEFAULT 'UTC',
  `loyalty_points_per_100` int(10) unsigned NOT NULL DEFAULT 0,
  `require_item_void_approval` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `require_cancel_approval` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `require_manual_discount_approval` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `default_regular_discount_percent` decimal(5,2) DEFAULT NULL,
  `default_promo_discount_percent` decimal(5,2) DEFAULT NULL,
  `default_employee_discount_percent` decimal(5,2) DEFAULT NULL,
  `default_member_discount_percent` decimal(5,2) DEFAULT NULL,
  `default_wholesale_discount_percent` decimal(5,2) DEFAULT NULL,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`trade_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `customer_code` varchar(30) DEFAULT NULL,
  `first_name` varchar(75) NOT NULL,
  `last_name` varchar(75) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `mobile` varchar(30) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `business_style` varchar(150) DEFAULT NULL,
  `credit_limit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_company_code_unique` (`company_id`,`customer_code`),
  KEY `company_id` (`company_id`),
  KEY `phone` (`mobile`),
  KEY `email` (`email`),
  CONSTRAINT `customers_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `store_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `reorder_level` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id_store_id` (`product_id`,`store_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `inventory_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inventory_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=218 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory_transactions`
--

DROP TABLE IF EXISTS `inventory_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `inventory_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `store_id` bigint(20) unsigned NOT NULL,
  `type` enum('purchase','sale','return','adjustment','transfer_in','transfer_out') NOT NULL,
  `quantity` decimal(15,4) NOT NULL,
  `balance_after` decimal(15,4) NOT NULL,
  `reference_type` varchar(60) DEFAULT NULL,
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_transactions_user_id_foreign` (`user_id`),
  KEY `inventory_id` (`inventory_id`),
  KEY `product_id` (`product_id`),
  KEY `store_id` (`store_id`),
  KEY `reference_type_reference_id` (`reference_type`,`reference_id`),
  KEY `idx_invtx_store_type_created` (`store_id`,`type`,`created_at`),
  CONSTRAINT `inventory_transactions_inventory_id_foreign` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inventory_transactions_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_transactions_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_transactions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_sequences`
--

DROP TABLE IF EXISTS `invoice_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoice_sequences` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `store_id` bigint(20) unsigned NOT NULL,
  `type` enum('sale','purchase_order','return') NOT NULL,
  `prefix` varchar(20) DEFAULT NULL,
  `last_number` bigint(20) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_store_id_type` (`company_id`,`store_id`,`type`),
  KEY `company_id` (`company_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `invoice_sequences_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoice_sequences_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_series`
--

DROP TABLE IF EXISTS `invoice_series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoice_series` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `store_id` bigint(20) unsigned NOT NULL,
  `invoice_type` varchar(60) NOT NULL,
  `series_code` varchar(30) NOT NULL,
  `prefix` varchar(20) DEFAULT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `starting_number` bigint(20) unsigned NOT NULL,
  `current_number` bigint(20) unsigned NOT NULL,
  `maximum_number` bigint(20) unsigned NOT NULL,
  `number_length` tinyint(3) unsigned NOT NULL,
  `warning_threshold` int(10) unsigned NOT NULL DEFAULT 10000,
  `critical_threshold` int(10) unsigned NOT NULL DEFAULT 1000,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `status` enum('active','inactive','exhausted') NOT NULL DEFAULT 'inactive',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_store_id_invoice_type_series_code` (`company_id`,`store_id`,`invoice_type`,`series_code`),
  KEY `invoice_series_created_by_foreign` (`created_by`),
  KEY `invoice_series_updated_by_foreign` (`updated_by`),
  KEY `company_id` (`company_id`),
  KEY `store_id` (`store_id`),
  KEY `status` (`status`),
  CONSTRAINT `invoice_series_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoice_series_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE SET NULL,
  CONSTRAINT `invoice_series_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_series_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `loyalty_cards`
--

DROP TABLE IF EXISTS `loyalty_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loyalty_cards` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned NOT NULL,
  `card_number` varchar(40) NOT NULL,
  `status` enum('active','inactive','blocked','lost') NOT NULL DEFAULT 'inactive',
  `points` bigint(20) NOT NULL DEFAULT 0,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `issued_at` datetime DEFAULT NULL,
  `activated_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `card_number` (`card_number`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `loyalty_cards_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `loyalty_point_transactions`
--

DROP TABLE IF EXISTS `loyalty_point_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loyalty_point_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned NOT NULL,
  `loyalty_card_id` bigint(20) unsigned NOT NULL,
  `points_delta` bigint(20) NOT NULL,
  `balance_after` bigint(20) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `loyalty_point_transactions_created_by_foreign` (`created_by`),
  KEY `customer_id` (`customer_id`),
  KEY `loyalty_card_id` (`loyalty_card_id`),
  CONSTRAINT `loyalty_point_transactions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE SET NULL,
  CONSTRAINT `loyalty_point_transactions_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `loyalty_point_transactions_loyalty_card_id_foreign` FOREIGN KEY (`loyalty_card_id`) REFERENCES `loyalty_cards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `version` varchar(255) NOT NULL,
  `class` varchar(255) NOT NULL,
  `group` varchar(255) NOT NULL,
  `namespace` varchar(255) NOT NULL,
  `time` int(11) NOT NULL,
  `batch` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_methods` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(60) NOT NULL,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_code` (`company_id`,`code`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `payment_methods_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint(20) unsigned NOT NULL,
  `method` varchar(60) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `paid_at` datetime NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sale_id` (`sale_id`),
  KEY `method` (`method`),
  CONSTRAINT `payments_sale_id_foreign` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_discount_eligibility`
--

DROP TABLE IF EXISTS `product_discount_eligibility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_discount_eligibility` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `discount_type` varchar(30) NOT NULL,
  `eligible` tinyint(1) unsigned DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id_discount_type` (`product_id`,`discount_type`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_discount_eligibility_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `category_id` bigint(20) unsigned DEFAULT NULL,
  `unit_id` bigint(20) unsigned DEFAULT NULL,
  `tax_rate_id` bigint(20) unsigned DEFAULT NULL,
  `sku` varchar(60) NOT NULL,
  `barcode` varchar(60) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `minimum_stock` decimal(15,4) DEFAULT 0.0000,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `track_inventory` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_sku` (`company_id`,`sku`),
  UNIQUE KEY `company_id_barcode` (`company_id`,`barcode`),
  KEY `company_id` (`company_id`),
  KEY `category_id` (`category_id`),
  KEY `unit_id` (`unit_id`),
  KEY `tax_rate_id` (`tax_rate_id`),
  KEY `name` (`name`),
  KEY `idx_products_company_active` (`company_id`,`is_active`),
  CONSTRAINT `products_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE SET NULL,
  CONSTRAINT `products_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `products_tax_rate_id_foreign` FOREIGN KEY (`tax_rate_id`) REFERENCES `tax_rates` (`id`) ON DELETE CASCADE ON UPDATE SET NULL,
  CONSTRAINT `products_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=243 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_order_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `purchase_order_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `tax_rate_id` bigint(20) unsigned DEFAULT NULL,
  `quantity` decimal(15,4) NOT NULL,
  `unit_cost` decimal(15,2) NOT NULL,
  `tax_rate` decimal(7,4) NOT NULL DEFAULT 0.0000,
  `line_total` decimal(15,2) NOT NULL,
  `received_quantity` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_order_id` (`purchase_order_id`),
  KEY `product_id` (`product_id`),
  KEY `poi_tax_rate_id_fk` (`tax_rate_id`),
  CONSTRAINT `poi_tax_rate_id_fk` FOREIGN KEY (`tax_rate_id`) REFERENCES `tax_rates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_purchase_order_id_foreign` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `store_id` bigint(20) unsigned NOT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `po_number` varchar(40) NOT NULL,
  `status` enum('draft','approved','received','cancelled') NOT NULL DEFAULT 'draft',
  `order_date` date DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `expected_date` date DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_po_number` (`company_id`,`po_number`),
  KEY `purchase_orders_user_id_foreign` (`user_id`),
  KEY `company_id` (`company_id`),
  KEY `store_id` (`store_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `status` (`status`),
  KEY `po_approved_by_fk` (`approved_by`),
  CONSTRAINT `po_approved_by_fk` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_orders_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `registers`
--

DROP TABLE IF EXISTS `registers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `registers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `store_id` bigint(20) unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(30) NOT NULL,
  `opening_float_mode` varchar(20) NOT NULL DEFAULT 'manual',
  `default_opening_float` decimal(15,2) DEFAULT NULL,
  `grand_total` decimal(18,2) NOT NULL DEFAULT 0.00,
  `z_counter` int(10) unsigned NOT NULL DEFAULT 0,
  `reset_counter` int(10) unsigned NOT NULL DEFAULT 0,
  `is_training_mode` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `store_id_code` (`store_id`,`code`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `registers_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `return_items`
--

DROP TABLE IF EXISTS `return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `return_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_id` bigint(20) unsigned NOT NULL,
  `sale_item_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(15,4) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `refund_amount` decimal(15,2) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `return_id` (`return_id`),
  KEY `sale_item_id` (`sale_item_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `return_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `return_items_return_id_foreign` FOREIGN KEY (`return_id`) REFERENCES `returns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `return_items_sale_item_id_foreign` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `returns`
--

DROP TABLE IF EXISTS `returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `returns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint(20) unsigned NOT NULL,
  `store_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `return_number` varchar(40) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
  `total_refund` decimal(15,2) NOT NULL DEFAULT 0.00,
  `return_date` datetime NOT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_number` (`return_number`),
  KEY `sale_id` (`sale_id`),
  KEY `store_id` (`store_id`),
  KEY `user_id` (`user_id`),
  KEY `customer_id` (`customer_id`),
  KEY `returns_approved_by_fk` (`approved_by`),
  CONSTRAINT `returns_approved_by_fk` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `returns_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE SET NULL,
  CONSTRAINT `returns_sale_id_foreign` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `returns_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `returns_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `revoked_tokens`
--

DROP TABLE IF EXISTS `revoked_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `revoked_tokens` (
  `jti` varchar(36) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime NOT NULL,
  PRIMARY KEY (`jti`),
  KEY `user_id` (`user_id`),
  KEY `expires_at` (`expires_at`),
  CONSTRAINT `revoked_tokens_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint(20) unsigned NOT NULL,
  `permission_id` bigint(20) unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_id_permission_id` (`role_id`,`permission_id`),
  KEY `role_permissions_permission_id_foreign` (`permission_id`),
  CONSTRAINT `role_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=651 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_name` (`company_id`,`name`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `roles_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sale_items`
--

DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sale_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `product_name` varchar(150) DEFAULT NULL,
  `product_sku` varchar(60) DEFAULT NULL,
  `tax_rate_id` bigint(20) unsigned DEFAULT NULL,
  `tax_type` varchar(20) DEFAULT NULL,
  `quantity` decimal(15,4) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_type` varchar(30) DEFAULT NULL,
  `tax_rate` decimal(7,4) NOT NULL DEFAULT 0.0000,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sale_id` (`sale_id`),
  KEY `product_id` (`product_id`),
  KEY `sale_items_tax_rate_id_fk` (`tax_rate_id`),
  KEY `idx_sale_items_report_covering` (`sale_id`,`product_id`,`quantity`,`line_total`),
  CONSTRAINT `sale_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sale_items_sale_id_foreign` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sale_items_tax_rate_id_fk` FOREIGN KEY (`tax_rate_id`) REFERENCES `tax_rates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `company_name` varchar(150) DEFAULT NULL,
  `company_tin` varchar(50) DEFAULT NULL,
  `store_id` bigint(20) unsigned NOT NULL,
  `store_name` varchar(150) DEFAULT NULL,
  `store_address` varchar(255) DEFAULT NULL,
  `store_receipt_footer_note` text DEFAULT NULL,
  `store_vat_reg_tin` varchar(30) DEFAULT NULL,
  `store_pos_serial_no` varchar(50) DEFAULT NULL,
  `store_min_no` varchar(50) DEFAULT NULL,
  `show_bir_details` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `register_id` bigint(20) unsigned NOT NULL,
  `cash_session_id` bigint(20) unsigned DEFAULT NULL,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `customer_name` varchar(150) DEFAULT NULL,
  `customer_address` varchar(255) DEFAULT NULL,
  `customer_tin` varchar(50) DEFAULT NULL,
  `customer_business_style` varchar(150) DEFAULT NULL,
  `loyalty_card_id` bigint(20) unsigned DEFAULT NULL,
  `loyalty_card_number` varchar(40) DEFAULT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `cashier_name` varchar(150) DEFAULT NULL,
  `bagger_id` bigint(20) unsigned DEFAULT NULL,
  `bagger_name` varchar(150) DEFAULT NULL,
  `invoice_number` varchar(40) NOT NULL,
  `transaction_no` varchar(40) DEFAULT NULL,
  `print_count` int(10) unsigned NOT NULL DEFAULT 0,
  `status` enum('completed','voided','held') NOT NULL DEFAULT 'completed',
  `is_training` tinyint(1) NOT NULL DEFAULT 0,
  `sale_date` datetime NOT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_holder_name` varchar(150) DEFAULT NULL,
  `discount_id_number` varchar(60) DEFAULT NULL,
  `tax_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(15,2) NOT NULL DEFAULT 0.00,
  `change_due` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_invoice_number` (`company_id`,`invoice_number`),
  KEY `company_id` (`company_id`),
  KEY `store_id` (`store_id`),
  KEY `register_id` (`register_id`),
  KEY `cash_session_id` (`cash_session_id`),
  KEY `customer_id` (`customer_id`),
  KEY `user_id` (`user_id`),
  KEY `sale_date` (`sale_date`),
  KEY `sales_bagger_id_fk` (`bagger_id`),
  KEY `sales_loyalty_card_id_fk` (`loyalty_card_id`),
  KEY `idx_sales_company_status_date` (`company_id`,`status`,`sale_date`),
  KEY `idx_sales_store_status_date` (`store_id`,`status`,`sale_date`),
  KEY `idx_sales_report_covering` (`company_id`,`status`,`sale_date`,`subtotal`,`discount_total`,`tax_total`,`total`),
  CONSTRAINT `sales_bagger_id_fk` FOREIGN KEY (`bagger_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_cash_session_id_foreign` FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions` (`id`) ON DELETE CASCADE ON UPDATE SET NULL,
  CONSTRAINT `sales_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sales_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE SET NULL,
  CONSTRAINT `sales_loyalty_card_id_fk` FOREIGN KEY (`loyalty_card_id`) REFERENCES `loyalty_cards` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_register_id_foreign` FOREIGN KEY (`register_id`) REFERENCES `registers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `store_product_prices`
--

DROP TABLE IF EXISTS `store_product_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `store_product_prices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `store_id` bigint(20) unsigned NOT NULL,
  `cost_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id_store_id` (`product_id`,`store_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `store_product_prices_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `store_product_prices_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=438 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stores`
--

DROP TABLE IF EXISTS `stores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stores` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `code` varchar(30) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `receipt_footer_note` text DEFAULT NULL,
  `vat_reg_tin` varchar(30) DEFAULT NULL,
  `pos_serial_no` varchar(50) DEFAULT NULL,
  `min_no` varchar(50) DEFAULT NULL,
  `ptu_number` varchar(60) DEFAULT NULL,
  `ptu_date_issued` date DEFAULT NULL,
  `ptu_valid_until` date DEFAULT NULL,
  `show_bir_details` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_code` (`company_id`,`code`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `stores_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `suppliers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `contact_name` varchar(150) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `suppliers_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_rates`
--

DROP TABLE IF EXISTS `tax_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_rates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `tax_system` varchar(10) NOT NULL DEFAULT 'vat',
  `rate` decimal(7,4) NOT NULL,
  `is_default` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_name` (`company_id`,`name`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `tax_rates_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transaction_counters`
--

DROP TABLE IF EXISTS `transaction_counters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transaction_counters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `register_id` bigint(20) unsigned NOT NULL,
  `scope_key` varchar(40) NOT NULL,
  `next_number` int(10) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `register_id_scope_key` (`register_id`,`scope_key`),
  CONSTRAINT `transaction_counters_register_id_foreign` FOREIGN KEY (`register_id`) REFERENCES `registers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `units`
--

DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `units` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `abbreviation` varchar(10) NOT NULL,
  `decimal_places` tinyint(3) unsigned DEFAULT 2,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `abbreviation` (`abbreviation`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_stores`
--

DROP TABLE IF EXISTS `user_stores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_stores` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `store_id` bigint(20) unsigned NOT NULL,
  `is_default` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id_store_id` (`user_id`,`store_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `user_stores_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_stores_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=233 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `username` varchar(60) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `failed_login_attempts` int(10) unsigned DEFAULT 0,
  `locked_until` datetime DEFAULT NULL,
  `password_changed_at` datetime DEFAULT NULL,
  `session_valid_from` datetime DEFAULT NULL COMMENT 'Tokens issued before this are rejected — set on login for roles held to one session at a time.',
  `phone` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `company_id` (`company_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=368 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `z_readings`
--

DROP TABLE IF EXISTS `z_readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `z_readings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `store_id` bigint(20) unsigned NOT NULL,
  `register_id` bigint(20) unsigned NOT NULL,
  `z_counter` int(10) unsigned NOT NULL,
  `reset_counter` int(10) unsigned NOT NULL DEFAULT 0,
  `business_date` date NOT NULL,
  `covers_from` datetime NOT NULL,
  `covers_to` datetime NOT NULL,
  `min_no` varchar(60) DEFAULT NULL,
  `pos_serial_no` varchar(60) DEFAULT NULL,
  `ptu_number` varchar(60) DEFAULT NULL,
  `beginning_invoice_number` varchar(40) DEFAULT NULL,
  `ending_invoice_number` varchar(40) DEFAULT NULL,
  `beginning_grand_total` decimal(18,2) NOT NULL DEFAULT 0.00,
  `ending_grand_total` decimal(18,2) NOT NULL DEFAULT 0.00,
  `transaction_count` int(10) unsigned NOT NULL DEFAULT 0,
  `gross_sales` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `net_sales` decimal(15,2) NOT NULL DEFAULT 0.00,
  `vatable_sales` decimal(15,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `vat_exempt_sales` decimal(15,2) NOT NULL DEFAULT 0.00,
  `zero_rated_sales` decimal(15,2) NOT NULL DEFAULT 0.00,
  `non_vat_sales` decimal(15,2) NOT NULL DEFAULT 0.00,
  `sc_discount_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `pwd_discount_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `bnpc_discount_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `other_discount_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `void_count` int(10) unsigned NOT NULL DEFAULT 0,
  `void_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `return_count` int(10) unsigned NOT NULL DEFAULT 0,
  `return_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `generated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `register_id_z_counter` (`register_id`,`z_counter`),
  KEY `z_readings_store_id_foreign` (`store_id`),
  KEY `z_readings_generated_by_foreign` (`generated_by`),
  KEY `company_id` (`company_id`),
  KEY `register_id_business_date` (`register_id`,`business_date`),
  CONSTRAINT `z_readings_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `z_readings_generated_by_foreign` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE SET NULL,
  CONSTRAINT `z_readings_register_id_foreign` FOREIGN KEY (`register_id`) REFERENCES `registers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `z_readings_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'pos_system'
--

--
-- Dumping routines for database 'pos_system'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-17  0:42:12

-- ---------------------------------------------------------------
-- Reference and catalog data
-- ---------------------------------------------------------------
-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: pos_system
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (10,1,NULL,'Beverages','Soft drinks, juices, water, and other drinks',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(11,1,NULL,'Snacks & Chips','Chips, crackers, and packaged snacks',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(12,1,NULL,'Grocery & Canned Goods','Rice, canned goods, condiments, and pantry staples',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(13,1,NULL,'Personal Care','Toiletries, hygiene, and personal care products',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(14,1,NULL,'Household Supplies','Cleaning supplies and household essentials',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(15,1,NULL,'Frozen & Chilled','Frozen goods, dairy, and chilled items',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(16,1,NULL,'Bakery','Bread, pastries, and baked goods',1,'2026-08-24 01:01:32','2026-09-15 16:32:01'),(17,1,NULL,'School & Office Supplies','Stationery and office essentials',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(18,1,NULL,'Tobacco & Alcohol','Cigarettes, beer, and alcoholic beverages',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(19,1,NULL,'Others','Miscellaneous items not covered by other categories',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(25,1,NULL,'Cat 1',NULL,1,'2026-09-12 10:37:45','2026-09-12 10:37:45'),(26,1,NULL,'Cat 2',NULL,1,'2026-09-12 10:38:10','2026-09-12 10:38:10');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `category_discount_eligibility`
--

LOCK TABLES `category_discount_eligibility` WRITE;
/*!40000 ALTER TABLE `category_discount_eligibility` DISABLE KEYS */;
/*!40000 ALTER TABLE `category_discount_eligibility` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (1,'Default Company',NULL,NULL,0,NULL,1,NULL,NULL,NULL,'PHP','vat',0,'per_session',NULL,0,'UTC',0,0,1,1,NULL,NULL,NULL,NULL,NULL,1,'2026-08-16 16:41:35','2026-09-14 13:40:42');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2026-08-15-000001','App\\Database\\Migrations\\CreateCompanies','default','App',1786898482,1),(2,'2026-08-15-000002','App\\Database\\Migrations\\CreateStores','default','App',1786898482,1),(3,'2026-08-15-000003','App\\Database\\Migrations\\CreateRoles','default','App',1786898482,1),(4,'2026-08-15-000004','App\\Database\\Migrations\\CreatePermissions','default','App',1786898482,1),(5,'2026-08-15-000005','App\\Database\\Migrations\\CreateRolePermissions','default','App',1786898482,1),(6,'2026-08-15-000006','App\\Database\\Migrations\\CreateUsers','default','App',1786898482,1),(7,'2026-08-15-000007','App\\Database\\Migrations\\CreateUserStores','default','App',1786898482,1),(8,'2026-08-15-000008','App\\Database\\Migrations\\CreateRegisters','default','App',1786898482,1),(9,'2026-08-15-000009','App\\Database\\Migrations\\CreateCashSessions','default','App',1786898482,1),(10,'2026-08-15-000010','App\\Database\\Migrations\\CreateUnits','default','App',1786898482,1),(11,'2026-08-15-000011','App\\Database\\Migrations\\CreateCategories','default','App',1786898482,1),(12,'2026-08-15-000012','App\\Database\\Migrations\\CreateTaxRates','default','App',1786898482,1),(13,'2026-08-15-000013','App\\Database\\Migrations\\CreateProducts','default','App',1786898482,1),(14,'2026-08-15-000014','App\\Database\\Migrations\\CreateProductPrices','default','App',1786898482,1),(15,'2026-08-15-000015','App\\Database\\Migrations\\CreateInventory','default','App',1786898482,1),(16,'2026-08-15-000016','App\\Database\\Migrations\\CreateInventoryTransactions','default','App',1786898482,1),(17,'2026-08-15-000017','App\\Database\\Migrations\\CreateCustomers','default','App',1786898482,1),(18,'2026-08-15-000018','App\\Database\\Migrations\\CreateLoyaltyCards','default','App',1786898482,1),(19,'2026-08-15-000019','App\\Database\\Migrations\\CreateSuppliers','default','App',1786898482,1),(20,'2026-08-15-000020','App\\Database\\Migrations\\CreatePurchaseOrders','default','App',1786898482,1),(21,'2026-08-15-000021','App\\Database\\Migrations\\CreatePurchaseOrderItems','default','App',1786898482,1),(22,'2026-08-15-000022','App\\Database\\Migrations\\CreateSales','default','App',1786898482,1),(23,'2026-08-15-000023','App\\Database\\Migrations\\CreateSaleItems','default','App',1786898482,1),(24,'2026-08-15-000024','App\\Database\\Migrations\\CreatePayments','default','App',1786898482,1),(25,'2026-08-15-000025','App\\Database\\Migrations\\CreateReturns','default','App',1786898482,1),(26,'2026-08-15-000026','App\\Database\\Migrations\\CreateReturnItems','default','App',1786898482,1),(27,'2026-08-15-000027','App\\Database\\Migrations\\CreateInvoiceSequences','default','App',1786898482,1),(28,'2026-08-15-000028','App\\Database\\Migrations\\AddLoginSecurityToUsers','default','App',1786898482,1),(29,'2026-08-15-000029','App\\Database\\Migrations\\CreateRevokedTokens','default','App',1786898482,1),(30,'2026-08-15-000030','App\\Database\\Migrations\\UpdateCompanyFields','default','App',1786898482,1),(31,'2026-08-15-000031','App\\Database\\Migrations\\EnforceCompanyTradeNameNotNull','default','App',1786898482,1),(32,'2026-08-16-000032','App\\Database\\Migrations\\AddPasswordChangedAtToUsers','default','App',1786898482,1),(33,'2026-08-16-000033','App\\Database\\Migrations\\AddPrecisionToUnits','default','App',1786898482,1),(34,'2026-08-16-000034','App\\Database\\Migrations\\AddSellingPriceAndMinStockToProducts','default','App',1786898482,1),(35,'2026-08-16-000035','App\\Database\\Migrations\\AddTaxRateIdToLineItems','default','App',1786898483,1),(36,'2026-08-16-000036','App\\Database\\Migrations\\SplitTransferTransactionType','default','App',1786898483,1),(37,'2026-08-16-000037','App\\Database\\Migrations\\UpdateCustomerFields','default','App',1786898483,1),(38,'2026-08-16-000038','App\\Database\\Migrations\\UpdateLoyaltyCardFields','default','App',1786898483,1),(39,'2026-08-16-000039','App\\Database\\Migrations\\EnforceCustomerNameFieldsNotNull','default','App',1786898483,1),(40,'2026-08-16-000040','App\\Database\\Migrations\\AddApprovalToPurchaseOrders','default','App',1786898483,1),(41,'2026-08-16-000041','App\\Database\\Migrations\\AddBaggerIdToSales','default','App',1786898483,1),(42,'2026-08-16-000042','App\\Database\\Migrations\\UpdatePaymentMethods','default','App',1786898483,1),(43,'2026-08-16-000043','App\\Database\\Migrations\\CreateCashMovements','default','App',1786898483,1),(44,'2026-08-16-000044','App\\Database\\Migrations\\AddInvoiceSnapshotFields','default','App',1786898483,1),(45,'2026-08-16-000045','App\\Database\\Migrations\\AddApprovalToReturns','default','App',1786898483,1),(46,'2026-08-16-000046','App\\Database\\Migrations\\AddPerformanceIndexes','default','App',1786898483,1),(47,'2026-08-16-000047','App\\Database\\Migrations\\MakeSalesReportIndexCovering','default','App',1786898483,1),(48,'2026-08-16-000048','App\\Database\\Migrations\\MakeSaleItemsJoinIndexCovering','default','App',1786898483,1),(49,'2026-08-18-000049','App\\Database\\Migrations\\DropUnusedProductPrices','default','App',1787055928,2),(50,'2026-08-18-000050','App\\Database\\Migrations\\CreateStoreProductPrices','default','App',1787055928,2),(51,'2026-08-18-000051','App\\Database\\Migrations\\DropProductPriceColumns','default','App',1787055928,2),(52,'2026-08-23-000052','App\\Database\\Migrations\\CreateLoyaltyPointTransactions','default','App',1787420901,3),(54,'2026-08-25-000053','App\\Database\\Migrations\\AddImagePathToProducts','default','App',1787727557,4),(55,'2026-08-27-000054','App\\Database\\Migrations\\AddLoyaltyPointsRateToCompanies','default','App',1787858638,5),(56,'2026-08-28-000055','App\\Database\\Migrations\\CreateAuditLogs','default','App',1787945267,6),(57,'2026-08-30-000056','App\\Database\\Migrations\\CreatePaymentMethods','default','App',1788099865,7),(58,'2026-08-30-000057','App\\Database\\Migrations\\SeedPaymentMethodsAndWidenPaymentsMethod','default','App',1788099865,7),(59,'2026-08-30-000058','App\\Database\\Migrations\\GrantPaymentMethodPermissionsToExistingRoles','default','App',1788099926,8),(60,'2026-08-31-000059','App\\Database\\Migrations\\MakeSaleItemsProductIdNullable','default','App',1788110247,9),(61,'2026-08-31-000060','App\\Database\\Migrations\\GrantCategoriesViewToExistingCashierRole','default','App',1788110247,9),(62,'2026-09-01-000061','App\\Database\\Migrations\\AddRequireVoidApprovalToCompanies','default','App',1788290078,10),(63,'2026-09-01-000062','App\\Database\\Migrations\\SplitVoidApprovalSettings','default','App',1788297876,11),(64,'2026-09-02-000063','App\\Database\\Migrations\\AddSessionValidFromToUsers','default','App',1788339179,12),(65,'2026-09-02-000064','App\\Database\\Migrations\\AddReceiptHeaderNoteToStores','default','App',1788363316,13),(66,'2026-09-02-000065','App\\Database\\Migrations\\AddBirPosFieldsToStores','default','App',1788365698,14),(67,'2026-09-02-000066','App\\Database\\Migrations\\AddShowBirDetailsToStores','default','App',1788366054,15),(68,'2026-09-02-000067','App\\Database\\Migrations\\AddShowBirDetailsToSales','default','App',1788367132,16),(69,'2026-09-02-000068','App\\Database\\Migrations\\RenameReceiptHeaderNoteToFooter','default','App',1788370013,17),(70,'2026-09-07-000069','App\\Database\\Migrations\\AddDiscountTypeToSaleItems','default','App',1788711204,18),(71,'2026-09-07-000070','App\\Database\\Migrations\\AddDiscountHolderToSales','default','App',1788711204,18),(72,'2026-09-07-000071','App\\Database\\Migrations\\AddRequireManualDiscountApprovalToCompanies','default','App',1788711204,18),(73,'2026-09-07-000072','App\\Database\\Migrations\\AddSalesDiscountPermission','default','App',1788711204,18),(74,'2026-09-07-000073','App\\Database\\Migrations\\AddDiscountDefaultsToCompanies','default','App',1788713073,19),(75,'2026-09-08-000074','App\\Database\\Migrations\\CreateDiscountEligibilityTables','default','App',1788714790,20),(77,'2026-09-09-000075','App\\Database\\Migrations\\AddTaxSystemToCompanies','default','App',1788960395,21),(78,'2026-09-09-000076','App\\Database\\Migrations\\AddTaxSystemToTaxRates','default','App',1789031958,22),(79,'2026-09-11-000077','App\\Database\\Migrations\\AddOpeningFloatToRegisters','default','App',1789077440,23),(80,'2026-09-12-000078','App\\Database\\Migrations\\AddPosLockIdleMinutesToCompanies','default','App',1789142917,24),(81,'2026-09-13-000079','App\\Database\\Migrations\\CreateInvoiceSeries','default','App',1789232699,25),(82,'2026-09-13-000080','App\\Database\\Migrations\\BackfillInvoiceSeriesFromSequences','default','App',1789232699,25),(83,'2026-09-13-000081','App\\Database\\Migrations\\GrantInvoiceSeriesPermissionsToExistingRoles','default','App',1789232699,25),(84,'2026-09-13-000082','App\\Database\\Migrations\\AddTransactionNoToSalesAndCashSessions','default','App',1789312725,26),(85,'2026-09-13-000083','App\\Database\\Migrations\\AddTransactionNumberSettingsToCompanies','default','App',1789315017,27),(86,'2026-09-13-000084','App\\Database\\Migrations\\CreateTransactionCounters','default','App',1789315017,27),(87,'2026-09-13-000085','App\\Database\\Migrations\\ReworkTransactionNoOnSales','default','App',1789315017,27),(88,'2026-09-14-000086','App\\Database\\Migrations\\AddBirAccreditationFields','default','App',1789318866,28),(89,'2026-09-14-000087','App\\Database\\Migrations\\CreateZReadings','default','App',1789318866,28),(90,'2026-09-14-000088','App\\Database\\Migrations\\GrantReadingPermissionsToExistingRoles','default','App',1789319198,29),(91,'2026-09-14-000089','App\\Database\\Migrations\\AddBirRegisteredToCompanies','default','App',1789390677,30);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES (14,1,'Cash','cash',1,'2026-09-14 13:40:42','2026-09-14 13:40:42');
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'View Products','products.view','Can view product records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(2,'Create Products','products.create','Can create new products','2026-08-16 16:41:35','2026-08-16 16:41:35'),(3,'Update Products','products.update','Can edit existing products','2026-08-16 16:41:35','2026-08-16 16:41:35'),(4,'Delete Products','products.delete','Can delete products','2026-08-16 16:41:35','2026-08-16 16:41:35'),(5,'View Inventory','inventory.view','Can view stock levels','2026-08-16 16:41:35','2026-08-16 16:41:35'),(6,'Adjust Inventory','inventory.adjust','Can make manual stock adjustments','2026-08-16 16:41:35','2026-08-16 16:41:35'),(7,'Transfer Inventory','inventory.transfer','Can transfer stock between stores','2026-08-16 16:41:35','2026-08-16 16:41:35'),(8,'Create Sales','sales.create','Can ring up new sales','2026-08-16 16:41:35','2026-08-16 16:41:35'),(9,'View Sales','sales.view','Can view sales history','2026-08-16 16:41:35','2026-08-16 16:41:35'),(10,'Void Sales','sales.void','Can void a sale','2026-08-16 16:41:35','2026-08-16 16:41:35'),(11,'Refund Sales','sales.refund','Can process a refund','2026-08-16 16:41:35','2026-08-16 16:41:35'),(12,'View Customers','customers.view','Can view customer records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(13,'Create Customers','customers.create','Can create new customers','2026-08-16 16:41:35','2026-08-16 16:41:35'),(14,'Update Customers','customers.update','Can edit existing customers','2026-08-16 16:41:35','2026-08-16 16:41:35'),(15,'View Loyalty','loyalty.view','Can view loyalty card balances and points','2026-08-16 16:41:35','2026-08-16 16:41:35'),(16,'Manage Loyalty','loyalty.manage','Can issue cards and adjust points/balance','2026-08-16 16:41:35','2026-08-16 16:41:35'),(17,'View Reports','reports.view','Can view sales and inventory reports','2026-08-16 16:41:35','2026-08-16 16:41:35'),(18,'View Users','users.view','Can view user accounts','2026-08-16 16:41:35','2026-08-16 16:41:35'),(19,'Create Users','users.create','Can create new user accounts','2026-08-16 16:41:35','2026-08-16 16:41:35'),(20,'Update Users','users.update','Can edit existing user accounts','2026-08-16 16:41:35','2026-08-16 16:41:35'),(21,'View Stores','stores.view','Can view store records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(22,'Manage Stores','stores.manage','Can create and edit stores','2026-08-16 16:41:35','2026-08-16 16:41:35'),(23,'View Companies','companies.view','Can view company records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(24,'Manage Companies','companies.manage','Can create and edit companies','2026-08-16 16:41:35','2026-08-16 16:41:35'),(25,'View Roles','roles.view','Can view roles and their permissions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(26,'Manage Roles','roles.manage','Can create/edit roles and assign permissions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(27,'View Categories','categories.view','Can view product categories','2026-08-16 16:41:35','2026-08-16 16:41:35'),(28,'Manage Categories','categories.manage','Can create and edit categories','2026-08-16 16:41:35','2026-08-16 16:41:35'),(29,'View Units','units.view','Can view units of measure','2026-08-16 16:41:35','2026-08-16 16:41:35'),(30,'Manage Units','units.manage','Can create and edit units of measure','2026-08-16 16:41:35','2026-08-16 16:41:35'),(31,'View Taxes','taxes.view','Can view tax rate configuration','2026-08-16 16:41:35','2026-08-16 16:41:35'),(32,'Manage Taxes','taxes.manage','Can create and edit tax rates','2026-08-16 16:41:35','2026-08-16 16:41:35'),(33,'View Suppliers','suppliers.view','Can view supplier records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(34,'Manage Suppliers','suppliers.manage','Can create and edit suppliers','2026-08-16 16:41:35','2026-08-16 16:41:35'),(35,'View Purchases','purchases.view','Can view purchase orders','2026-08-16 16:41:35','2026-08-16 16:41:35'),(36,'Create Purchases','purchases.create','Can create purchase orders','2026-08-16 16:41:35','2026-08-16 16:41:35'),(37,'Manage Purchases','purchases.manage','Can edit and receive purchase orders','2026-08-16 16:41:35','2026-08-16 16:41:35'),(38,'View POS Terminals','registers.view','Can view POS terminals','2026-08-16 16:41:35','2026-08-31 14:23:03'),(39,'Manage POS Terminals','registers.manage','Can create and edit POS terminals','2026-08-16 16:41:35','2026-08-31 14:23:03'),(40,'View Cash Sessions','cash-sessions.view','Can view cash drawer sessions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(41,'Manage Cash Sessions','cash-sessions.manage','Can open and close cash drawer sessions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(42,'View Payments','payments.view','Can view sale payments','2026-08-16 16:41:35','2026-08-16 16:41:35'),(43,'View Returns','returns.view','Can view sales returns','2026-08-16 16:41:35','2026-08-16 16:41:35'),(44,'Create Returns','returns.create','Can request a sales return','2026-08-16 16:41:35','2026-08-16 16:41:35'),(45,'Approve Returns','returns.approve','Can approve a pending return, issuing the refund and restocking inventory','2026-08-16 16:41:35','2026-08-16 16:41:35'),(46,'View Dashboard','dashboard.view','Can view the dashboard\'s daily snapshot','2026-08-22 16:01:35','2026-08-22 16:01:35'),(47,'View Audit Trail','audit.view','Can view the audit trail of who did what, and when','2026-08-28 19:27:52','2026-08-28 19:27:52'),(48,'View Payment Methods','payment-methods.view','Can view the payment methods offered at checkout','2026-08-30 14:24:37','2026-08-30 14:24:37'),(49,'Manage Payment Methods','payment-methods.manage','Can add, rename, and activate/deactivate payment methods','2026-08-30 14:24:37','2026-08-30 14:24:37'),(50,'Approve Discounts','sales.discount','Can approve a manual/discretionary discount that falls outside the standard discount types','2026-09-06 16:13:24','2026-09-06 16:13:24'),(51,'View Invoice Series','invoice-series.view','Can view sales invoice numbering series and their configuration','2026-09-12 17:04:59','2026-09-12 17:04:59'),(52,'Manage Invoice Series','invoice-series.manage','Can create, edit, activate, and deactivate sales invoice numbering series','2026-09-12 17:04:59','2026-09-12 17:04:59'),(53,'View X/Z Readings','readings.view','Can take an X-reading and view issued Z-readings','2026-09-13 17:06:38','2026-09-13 17:06:38'),(54,'Generate Z-Readings','readings.manage','Can close the period and issue a Z-reading','2026-09-13 17:06:38','2026-09-13 17:06:38');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `product_discount_eligibility`
--

LOCK TABLES `product_discount_eligibility` WRITE;
/*!40000 ALTER TABLE `product_discount_eligibility` DISABLE KEYS */;
INSERT INTO `product_discount_eligibility` VALUES (4,237,'senior_citizen',1,'2026-09-07 20:24:04','2026-09-07 20:24:04'),(5,179,'senior_citizen',1,'2026-09-07 20:26:53','2026-09-07 20:26:53');
/*!40000 ALTER TABLE `product_discount_eligibility` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (6,1,10,1,NULL,'BEV-0001','4800000000011','Coca-Cola 1.5L','Soft drink, 1.5 liter bottle','uploads/products/6_f6d1c7b55f6a3c87.png',20.0000,1,1,'2026-08-24 03:27:00','2026-08-31 10:17:30'),(8,1,10,1,NULL,'BEV-0003','4800000000035','Nescafe 3-in-1 Coffee Sachet','Instant coffee mix, single sachet',NULL,50.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(9,1,10,1,NULL,'BEV-0004','4800000000042','Bottled Water 500ml','Purified drinking water 500','uploads/products/9_c127099dfb89c0cc.png',50.0000,1,1,'2026-08-24 03:27:00','2026-08-30 09:39:06'),(10,1,10,1,NULL,'BEV-0005','4800000000059','C2 Green Tea 500ml','Ready-to-drink green tea',NULL,20.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(11,1,11,1,NULL,'SNK-0001','4800000000066','Piattos Cheese 85g','Potato chips, cheese flavor',NULL,20.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(13,1,11,1,NULL,'SNK-0003','4800000000080','Skyflakes Crackers','Soda crackers, pack',NULL,30.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(14,1,12,1,NULL,'GRO-0001','4800000000097','Jasmine Rice 5kg','Well-milled jasmine rice, 5kg bag','uploads/products/14_3a1db7c239d0a527.png',10.0000,1,1,'2026-08-24 03:27:00','2026-08-31 10:17:30'),(15,1,12,1,NULL,'GRO-0002','4800000000103','Century Tuna Flakes in Oil 155g','Canned tuna flakes in oil',NULL,30.0000,1,1,'2026-08-24 03:27:00','2026-08-30 09:50:26'),(16,1,12,1,NULL,'GRO-0003','4800000000110','Datu Puti Soy Sauce 1L','Soy sauce, 1 liter bottle',NULL,15.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(18,1,13,1,NULL,'PC-0001','4800000000134','Safeguard Soap 90g','Antibacterial bar soap','uploads/products/18_df2be17ee4286e28.png',30.0000,1,1,'2026-08-24 03:27:00','2026-08-31 10:17:30'),(19,1,13,1,NULL,'PC-0002','4800000000141','Colgate Toothpaste 150g','Fluoride toothpaste',NULL,30.0000,1,1,'2026-08-24 03:27:00','2026-08-28 16:52:07'),(20,1,13,1,NULL,'PC-0003','4800000000158','Palmolive Shampoo Sachet','Shampoo, single-use sachet',NULL,50.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(22,1,14,1,NULL,'HH-0002','4800000000172','Joy Dishwashing Liquid 250ml','Dishwashing liquid, lemon scent',NULL,15.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(23,1,15,1,NULL,'FRZ-0001','4800000000189','Purefoods Tender Juicy Hotdog 1kg','Frozen hotdog, 1kg pack',NULL,10.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(24,1,15,1,NULL,'FRZ-0002','4800000000196','CDO Corned Beef 150g','Canned corned beef','uploads/products/24_a40886f113759a5d.png',20.0000,1,1,'2026-08-24 03:27:00','2026-08-28 18:32:59'),(25,1,16,1,NULL,'BAK-0001','4800000000202','Pandesal (Pack of 10)','Freshly baked bread rolls','uploads/products/25_24ba20a7e3cd34a0.png',15.0000,1,1,'2026-08-24 03:27:00','2026-08-31 10:17:30'),(26,1,16,1,NULL,'BAK-0002','4800000000219','Gardenia Wheat Bread','Sliced wheat bread loaf','uploads/products/26_c6110ccfa2fdc2aa.png',10.0000,1,1,'2026-08-24 03:27:00','2026-08-31 10:17:30'),(27,1,17,1,NULL,'SCH-0001','4800000000226','Ballpen Black','Ballpoint pen, black ink',NULL,50.0000,0,1,'2026-08-24 03:27:00','2026-08-27 18:53:17'),(28,1,17,1,NULL,'SCH-0002','4800000000233','Spiral Notebook 80 Leaves','Spiral-bound notebook',NULL,20.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(29,1,18,1,NULL,'TOB-0001','4800000000240','Red Horse Beer 1L','Strong beer, 1 liter bottle',NULL,15.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(30,1,18,1,NULL,'TOB-0002','4800000000257','Marlboro Red Pack','Cigarettes, pack of 20',NULL,20.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(66,1,NULL,NULL,NULL,'SCH-0001a','4800000000042aa','sdf',NULL,NULL,0.0000,1,1,'2026-08-29 15:15:29','2026-08-29 15:15:29'),(108,1,10,1,NULL,'ABC-001','1234567890123','Sample Product',NULL,NULL,5.0000,1,1,'2026-08-29 17:16:06','2026-08-29 17:16:06'),(116,1,10,1,NULL,'11111','11001111','aa',NULL,NULL,5.0000,1,1,'2026-08-29 17:31:25','2026-08-29 17:31:25'),(117,1,16,1,NULL,'22222','220022222','aa',NULL,NULL,5.0000,1,1,'2026-08-29 17:31:25','2026-08-29 17:31:25'),(121,1,16,1,NULL,'BEV-00042','4.8E+12','aa',NULL,NULL,6.0000,1,1,'2026-08-29 17:31:57','2026-08-29 17:31:57'),(133,1,10,1,NULL,'BEV-0006','4800000001001','Sprite 1.5L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(134,1,10,1,NULL,'BEV-0007','4800000001002','Royal Tru-Orange 1.5L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(135,1,10,1,NULL,'BEV-0008','4800000001003','Nescafe Classic 3-in-1 Twin Pack',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(136,1,10,1,NULL,'BEV-0009','4800000001004','Milo Champion 33g Sachet',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(137,1,10,1,NULL,'BEV-0010','4800000001005','Kopiko Brown Coffee 3-in-1',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(138,1,10,1,NULL,'BEV-0011','4800000001006','Great Taste White Coffee',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(139,1,10,1,NULL,'BEV-0012','4800000001007','Tang Orange Powdered Juice 25g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(140,1,10,1,NULL,'BEV-0013','4800000001008','Zesto Orange Juice 250ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(141,1,10,1,NULL,'BEV-0014','4800000001009','Wilkins Distilled Water 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(142,1,10,1,NULL,'BEV-0015','4800000001010','San Miguel Pale Pilsen 330ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(143,1,10,1,NULL,'BEV-0016','4800000001011','Sting Energy Drink 500ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(144,1,10,1,NULL,'BEV-0017','4800000001012','Gatorade Blue 500ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(145,1,10,1,NULL,'BEV-0018','4800000001013','Nature\'s Spring Water 500ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(146,1,10,1,NULL,'BEV-0019','4800000001014','Yakult 5s',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(147,1,11,1,NULL,'SNK-0004','4800000001015','Chippy BBQ 110g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(148,1,11,1,NULL,'SNK-0005','4800000001016','Nova Multigrain Chips',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(149,1,11,1,NULL,'SNK-0006','4800000001017','Clover Chips Barbecue',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(150,1,11,1,NULL,'SNK-0007','4800000001018','Boy Bawang Cornick',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(151,1,11,1,NULL,'SNK-0008','4800000001019','Oishi Prawn Crackers',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(152,1,11,1,NULL,'SNK-0009','4800000001020','Ricoa Curly Tops',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(153,1,11,1,NULL,'SNK-0010','4800000001021','Jack n Jill Roller Coaster',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(154,1,11,1,NULL,'SNK-0011','4800000001022','Rebisco Crackers Sandwich',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(155,1,11,1,NULL,'SNK-0012','4800000001023','Fita Crackers',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(156,1,11,1,NULL,'SNK-0013','4800000001024','Chiz Curls',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(157,1,11,1,NULL,'SNK-0014','4800000001025','Nagaraya Garlic Peanuts',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(158,1,11,1,NULL,'SNK-0015','4800000001026','Cheese Ring',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(159,1,12,1,NULL,'GRO-0004','4800000001027','Argentina Corned Beef 150g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(160,1,12,1,NULL,'GRO-0005','4800000001028','555 Sardines in Tomato Sauce 155g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(161,1,12,1,NULL,'GRO-0006','4800000001029','Ligo Sardines Spanish Style',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(162,1,12,1,NULL,'GRO-0007','4800000001030','Del Monte Pineapple Juice 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(163,1,12,1,NULL,'GRO-0008','4800000001031','Del Monte Tomato Sauce 200g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(164,1,12,1,NULL,'GRO-0009','4800000001032','UFC Banana Ketchup 320g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(165,1,12,1,NULL,'GRO-0010','4800000001033','Silver Swan Soy Sauce 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(166,1,12,1,NULL,'GRO-0011','4800000001034','Datu Puti Vinegar 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(167,1,12,1,NULL,'GRO-0012','4800000001035','Knorr Sinigang Mix 44g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(168,1,12,1,NULL,'GRO-0013','4800000001036','Maggi Magic Sarap 8g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(169,1,12,1,NULL,'GRO-0014','4800000001037','Lucky Me Pancit Canton',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(170,1,12,1,NULL,'GRO-0015','4800000001038','Nissin Cup Noodles Beef',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(171,1,12,1,NULL,'GRO-0016','4800000001039','Quaker Oats 400g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(172,1,12,1,NULL,'GRO-0017','4800000001040','Jasmine Rice 25kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(173,1,12,1,NULL,'GRO-0018','4800000001041','Sinandomeng Rice 5kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(174,1,12,1,NULL,'GRO-0019','4800000001042','White Sugar 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(175,1,12,1,NULL,'GRO-0020','4800000001043','Iodized Salt 500g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(176,1,12,1,NULL,'GRO-0021','4800000001044','Baguio Beans 250g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(177,1,12,1,NULL,'GRO-0022','4800000001045','Cooking Oil (Palm) 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(178,1,12,1,NULL,'GRO-0023','4800000001046','Minola Coconut Oil 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(179,1,12,1,NULL,'GRO-0024','4800000001047','All Purpose Flour 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-07 20:26:03'),(180,1,12,1,NULL,'GRO-0025','4800000001048','Star Margarine 250g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(181,1,12,1,NULL,'GRO-0026','4800000001049','San Miguel Purefoods Ham 200g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(182,1,13,1,NULL,'PC-0004','4800000001050','Head & Shoulders Shampoo Sachet',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(183,1,13,1,NULL,'PC-0005','4800000001051','Rejoice Shampoo 340ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(184,1,13,1,NULL,'PC-0006','4800000001052','Dove Soap 90g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(185,1,13,1,NULL,'PC-0007','4800000001053','Safeguard Soap 135g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(186,1,13,1,NULL,'PC-0008','4800000001054','Close Up Toothpaste 160g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(187,1,13,1,NULL,'PC-0009','4800000001055','Sensodyne Toothpaste 100g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(188,1,13,1,NULL,'PC-0010','4800000001056','Nivea Lotion 100ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(189,1,13,1,NULL,'PC-0011','4800000001057','Belo Whitening Lotion 100ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(190,1,13,1,NULL,'PC-0012','4800000001058','Modess Sanitary Napkin',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(191,1,13,1,NULL,'PC-0013','4800000001059','Whisper Pantyliner',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(192,1,13,1,NULL,'PC-0014','4800000001060','Gillette Disposable Razor',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(193,1,13,1,NULL,'PC-0015','4800000001061','Johnson\'s Baby Powder 100g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(194,1,13,1,NULL,'PC-0016','4800000001062','Cetaphil Gentle Skin Cleanser 125ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(195,1,13,1,NULL,'PC-0017','4800000001063','Eskinol Facial Wash 135ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(196,1,14,1,NULL,'HH-0003','4800000001064','Tide Powder Detergent 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(197,1,14,1,NULL,'HH-0004','4800000001065','Ariel Powder Detergent 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(198,1,14,1,NULL,'HH-0005','4800000001066','Surf Powder Detergent 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(199,1,14,1,NULL,'HH-0006','4800000001067','Downy Fabric Conditioner 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(200,1,14,1,NULL,'HH-0007','4800000001068','Zonrox Bleach 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(201,1,14,1,NULL,'HH-0008','4800000001069','Domex Toilet Cleaner 500ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(202,1,14,1,NULL,'HH-0009','4800000001070','Mr. Muscle All Purpose Cleaner',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(203,1,14,1,NULL,'HH-0010','4800000001071','Baygon Insecticide Spray',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(204,1,14,1,NULL,'HH-0011','4800000001072','Trash Bag Large (10s)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(205,1,14,1,NULL,'HH-0012','4800000001073','Kleenex Facial Tissue',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(206,1,14,1,NULL,'HH-0013','4800000001074','Scotch Brite Sponge',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(207,1,15,1,NULL,'FRZ-0003','4800000001075','Magnolia Chicken Whole 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(208,1,15,1,NULL,'FRZ-0004','4800000001076','Purefoods Chicken Franks',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(209,1,15,1,NULL,'FRZ-0005','4800000001077','Swift Hotdog Classic 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(210,1,15,1,NULL,'FRZ-0006','4800000001078','Purefoods Bacon 250g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(211,1,15,1,NULL,'FRZ-0007','4800000001079','Selecta Ice Cream 1.5L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(212,1,15,1,NULL,'FRZ-0008','4800000001080','Nestle Cream 250ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(213,1,15,1,NULL,'FRZ-0009','4800000001081','Magnolia Fresh Milk 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(214,1,15,1,NULL,'FRZ-0010','4800000001082','Eden Cheese 165g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(215,1,15,1,NULL,'FRZ-0011','4800000001083','Anchor Butter 200g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(216,1,16,1,NULL,'BAK-0003','4800000001084','Spanish Bread (Pack of 6)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(217,1,16,1,NULL,'BAK-0004','4800000001085','Ensaymada (Pack of 4)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(218,1,16,1,NULL,'BAK-0005','4800000001086','Loaf Bread Sliced',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(219,1,16,1,NULL,'BAK-0006','4800000001087','Cheese Roll (Pack of 6)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(220,1,16,1,NULL,'BAK-0007','4800000001088','Monay Bread (Pack of 6)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(221,1,17,1,NULL,'SCH-0003','4800000001089','Yellow Pad Paper',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(222,1,17,1,NULL,'SCH-0004','4800000001090','Bond Paper A4 (10s)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(223,1,17,1,NULL,'SCH-0005','4800000001091','Mongol Pencil #2',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(224,1,17,1,NULL,'SCH-0006','4800000001092','Crayola Crayons 8s',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(225,1,17,1,NULL,'SCH-0007','4800000001093','Scotch Tape 1 inch',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(226,1,17,1,NULL,'SCH-0008','4800000001094','Elmer\'s Glue Stick',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(227,1,17,1,NULL,'SCH-0009','4800000001095','Scissors 6 inch',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(228,1,17,1,NULL,'SCH-0010','4800000001096','Ruler 12 inch Plastic',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(229,1,17,1,NULL,'SCH-0011','4800000001097','Correction Tape',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(230,1,18,1,NULL,'TOB-0003','4800000001098','Fortune Red Pack',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(231,1,18,1,NULL,'TOB-0004','4800000001099','Winston Red Pack',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(232,1,18,1,NULL,'TOB-0005','4800000001100','Tanduay Rhum 350ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(234,1,16,NULL,NULL,'123456789','1122335546','Tst',NULL,NULL,0.0000,1,1,'2026-09-07 17:13:34','2026-09-07 17:13:34'),(235,1,15,NULL,NULL,'12344','11222233','aad',NULL,NULL,0.0000,1,1,'2026-09-07 18:13:25','2026-09-07 18:13:25'),(237,1,11,NULL,NULL,'111114','2222','33',NULL,NULL,0.0000,1,1,'2026-09-07 19:34:19','2026-09-07 19:34:19');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `registers`
--

LOCK TABLES `registers` WRITE;
/*!40000 ALTER TABLE `registers` DISABLE KEYS */;
INSERT INTO `registers` VALUES (14,19,'Register 1','101_reg1','manual',NULL,0.00,0,0,0,1,'2026-09-15 15:56:59','2026-09-15 15:56:59'),(15,19,'Register 2','101_reg2','fixed',5000.00,0.00,0,0,0,1,'2026-09-15 15:56:59','2026-09-15 15:56:59');
/*!40000 ALTER TABLE `registers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (46,2,1,'2026-08-16 16:41:35'),(47,2,2,'2026-08-16 16:41:35'),(48,2,3,'2026-08-16 16:41:35'),(49,2,4,'2026-08-16 16:41:35'),(50,2,5,'2026-08-16 16:41:35'),(51,2,6,'2026-08-16 16:41:35'),(52,2,7,'2026-08-16 16:41:35'),(53,2,8,'2026-08-16 16:41:35'),(54,2,9,'2026-08-16 16:41:35'),(55,2,10,'2026-08-16 16:41:35'),(56,2,11,'2026-08-16 16:41:35'),(57,2,12,'2026-08-16 16:41:35'),(58,2,13,'2026-08-16 16:41:35'),(59,2,14,'2026-08-16 16:41:35'),(60,2,15,'2026-08-16 16:41:35'),(61,2,16,'2026-08-16 16:41:35'),(62,2,17,'2026-08-16 16:41:35'),(63,2,18,'2026-08-16 16:41:35'),(64,2,19,'2026-08-16 16:41:35'),(65,2,20,'2026-08-16 16:41:35'),(66,2,21,'2026-08-16 16:41:35'),(67,2,22,'2026-08-16 16:41:35'),(68,2,23,'2026-08-16 16:41:35'),(69,2,24,'2026-08-16 16:41:35'),(70,2,25,'2026-08-16 16:41:35'),(71,2,26,'2026-08-16 16:41:35'),(72,2,27,'2026-08-16 16:41:35'),(73,2,28,'2026-08-16 16:41:35'),(74,2,29,'2026-08-16 16:41:35'),(75,2,30,'2026-08-16 16:41:35'),(76,2,31,'2026-08-16 16:41:35'),(77,2,32,'2026-08-16 16:41:35'),(78,2,33,'2026-08-16 16:41:35'),(79,2,34,'2026-08-16 16:41:35'),(80,2,35,'2026-08-16 16:41:35'),(81,2,36,'2026-08-16 16:41:35'),(82,2,37,'2026-08-16 16:41:35'),(83,2,38,'2026-08-16 16:41:35'),(84,2,39,'2026-08-16 16:41:35'),(85,2,40,'2026-08-16 16:41:35'),(86,2,41,'2026-08-16 16:41:35'),(87,2,42,'2026-08-16 16:41:35'),(88,2,43,'2026-08-16 16:41:35'),(89,2,44,'2026-08-16 16:41:35'),(90,2,45,'2026-08-16 16:41:35'),(91,3,1,'2026-08-16 16:41:35'),(92,3,5,'2026-08-16 16:41:35'),(93,3,6,'2026-08-16 16:41:35'),(94,3,7,'2026-08-16 16:41:35'),(95,3,8,'2026-08-16 16:41:35'),(96,3,9,'2026-08-16 16:41:35'),(97,3,10,'2026-08-16 16:41:35'),(98,3,11,'2026-08-16 16:41:35'),(99,3,12,'2026-08-16 16:41:35'),(100,3,13,'2026-08-16 16:41:35'),(101,3,14,'2026-08-16 16:41:35'),(102,3,15,'2026-08-16 16:41:35'),(103,3,16,'2026-08-16 16:41:35'),(104,3,17,'2026-08-16 16:41:35'),(105,3,18,'2026-08-16 16:41:35'),(106,3,21,'2026-08-16 16:41:35'),(107,3,22,'2026-08-16 16:41:35'),(108,3,27,'2026-08-16 16:41:35'),(109,3,28,'2026-08-16 16:41:35'),(110,3,29,'2026-08-16 16:41:35'),(111,3,31,'2026-08-16 16:41:35'),(112,3,33,'2026-08-16 16:41:35'),(113,3,34,'2026-08-16 16:41:35'),(114,3,35,'2026-08-16 16:41:35'),(115,3,36,'2026-08-16 16:41:35'),(116,3,37,'2026-08-16 16:41:35'),(117,3,38,'2026-08-16 16:41:35'),(118,3,39,'2026-08-16 16:41:35'),(119,3,40,'2026-08-16 16:41:35'),(120,3,41,'2026-08-16 16:41:35'),(121,3,42,'2026-08-16 16:41:35'),(122,3,43,'2026-08-16 16:41:35'),(123,3,44,'2026-08-16 16:41:35'),(124,3,45,'2026-08-16 16:41:35'),(143,5,1,'2026-08-16 16:41:35'),(144,5,5,'2026-08-16 16:41:35'),(238,8,1,'2026-08-19 21:33:36'),(239,8,5,'2026-08-19 21:33:36'),(240,8,8,'2026-08-19 21:33:36'),(241,8,9,'2026-08-19 21:33:36'),(242,8,10,'2026-08-19 21:33:36'),(243,8,12,'2026-08-19 21:33:36'),(244,8,13,'2026-08-19 21:33:36'),(245,8,15,'2026-08-19 21:33:36'),(246,8,16,'2026-08-19 21:33:36'),(247,8,27,'2026-08-19 21:33:36'),(248,8,29,'2026-08-19 21:33:36'),(249,8,31,'2026-08-19 21:33:36'),(250,8,21,'2026-08-19 21:33:36'),(251,8,38,'2026-08-19 21:33:36'),(252,8,40,'2026-08-19 21:33:36'),(253,8,41,'2026-08-19 21:33:36'),(254,8,42,'2026-08-19 21:33:36'),(255,8,43,'2026-08-19 21:33:36'),(256,8,44,'2026-08-19 21:33:36'),(257,8,45,'2026-08-19 21:33:36'),(351,2,46,'2026-08-22 16:01:35'),(392,3,46,'2026-08-22 16:01:35'),(497,2,47,'2026-08-28 19:27:53'),(535,2,48,'2026-08-30 14:24:38'),(536,2,49,'2026-08-30 14:24:38'),(539,3,48,'2026-08-30 14:25:26'),(540,3,49,'2026-08-30 14:25:26'),(541,8,48,'2026-08-30 14:25:26'),(543,6,1,'2026-08-30 15:22:58'),(544,6,18,'2026-08-30 15:22:58'),(545,6,19,'2026-08-30 15:22:58'),(546,6,20,'2026-08-30 15:22:58'),(547,6,21,'2026-08-30 15:22:58'),(548,6,25,'2026-08-30 15:22:58'),(549,6,27,'2026-08-30 15:22:58'),(550,6,29,'2026-08-30 15:22:58'),(551,6,31,'2026-08-30 15:22:58'),(552,6,38,'2026-08-30 15:22:58'),(553,6,39,'2026-08-30 15:22:58'),(554,6,46,'2026-08-30 15:22:58'),(555,6,48,'2026-08-30 15:22:58'),(556,4,1,'2026-08-30 15:25:06'),(557,4,5,'2026-08-30 15:25:06'),(558,4,8,'2026-08-30 15:25:06'),(559,4,9,'2026-08-30 15:25:06'),(560,4,12,'2026-08-30 15:25:06'),(561,4,13,'2026-08-30 15:25:06'),(562,4,14,'2026-08-30 15:25:06'),(563,4,15,'2026-08-30 15:25:06'),(564,4,16,'2026-08-30 15:25:06'),(565,4,21,'2026-08-30 15:25:06'),(566,4,29,'2026-08-30 15:25:06'),(567,4,31,'2026-08-30 15:25:06'),(568,4,38,'2026-08-30 15:25:06'),(569,4,40,'2026-08-30 15:25:06'),(570,4,41,'2026-08-30 15:25:06'),(571,4,42,'2026-08-30 15:25:06'),(572,4,43,'2026-08-30 15:25:06'),(573,4,44,'2026-08-30 15:25:06'),(574,4,48,'2026-08-30 15:25:06'),(575,4,27,'2026-08-30 17:17:27'),(577,2,50,'2026-09-06 16:13:24'),(578,3,50,'2026-09-06 16:13:24'),(579,6,50,'2026-09-06 16:13:24'),(580,8,50,'2026-09-06 16:13:24'),(581,6,51,'2026-09-12 17:04:59'),(582,6,52,'2026-09-12 17:04:59'),(583,3,51,'2026-09-12 17:04:59'),(584,3,52,'2026-09-12 17:04:59'),(585,2,52,'2026-09-13 01:20:03'),(586,2,51,'2026-09-13 01:20:03'),(588,1,1,'2026-09-12 17:43:48'),(589,1,2,'2026-09-12 17:43:48'),(590,1,3,'2026-09-12 17:43:48'),(591,1,4,'2026-09-12 17:43:48'),(592,1,5,'2026-09-12 17:43:48'),(593,1,6,'2026-09-12 17:43:48'),(594,1,7,'2026-09-12 17:43:48'),(595,1,8,'2026-09-12 17:43:48'),(596,1,9,'2026-09-12 17:43:48'),(597,1,10,'2026-09-12 17:43:48'),(598,1,11,'2026-09-12 17:43:48'),(599,1,12,'2026-09-12 17:43:48'),(600,1,13,'2026-09-12 17:43:48'),(601,1,14,'2026-09-12 17:43:48'),(602,1,15,'2026-09-12 17:43:48'),(603,1,16,'2026-09-12 17:43:48'),(604,1,17,'2026-09-12 17:43:48'),(605,1,18,'2026-09-12 17:43:48'),(606,1,19,'2026-09-12 17:43:48'),(607,1,20,'2026-09-12 17:43:48'),(608,1,21,'2026-09-12 17:43:48'),(609,1,22,'2026-09-12 17:43:48'),(610,1,23,'2026-09-12 17:43:48'),(611,1,24,'2026-09-12 17:43:48'),(612,1,25,'2026-09-12 17:43:48'),(613,1,26,'2026-09-12 17:43:48'),(614,1,27,'2026-09-12 17:43:48'),(615,1,28,'2026-09-12 17:43:48'),(616,1,29,'2026-09-12 17:43:48'),(617,1,30,'2026-09-12 17:43:48'),(618,1,31,'2026-09-12 17:43:48'),(619,1,32,'2026-09-12 17:43:48'),(620,1,33,'2026-09-12 17:43:48'),(621,1,34,'2026-09-12 17:43:48'),(622,1,35,'2026-09-12 17:43:48'),(623,1,36,'2026-09-12 17:43:48'),(624,1,37,'2026-09-12 17:43:48'),(625,1,38,'2026-09-12 17:43:48'),(626,1,39,'2026-09-12 17:43:48'),(627,1,40,'2026-09-12 17:43:48'),(628,1,41,'2026-09-12 17:43:48'),(629,1,42,'2026-09-12 17:43:48'),(630,1,43,'2026-09-12 17:43:48'),(631,1,44,'2026-09-12 17:43:48'),(632,1,45,'2026-09-12 17:43:48'),(633,1,46,'2026-09-12 17:43:48'),(634,1,47,'2026-09-12 17:43:48'),(635,1,48,'2026-09-12 17:43:48'),(636,1,49,'2026-09-12 17:43:48'),(637,1,50,'2026-09-12 17:43:48'),(638,1,51,'2026-09-12 17:43:48'),(639,1,52,'2026-09-12 17:43:48'),(640,6,53,'2026-09-13 17:06:38'),(641,6,54,'2026-09-13 17:06:38'),(642,3,53,'2026-09-13 17:06:38'),(643,3,54,'2026-09-13 17:06:38'),(644,8,53,'2026-09-13 17:06:38'),(645,8,54,'2026-09-13 17:06:38'),(646,4,53,'2026-09-13 17:06:38'),(647,1,54,'2026-09-14 01:22:04'),(648,1,53,'2026-09-14 01:22:04'),(649,2,54,'2026-09-14 01:22:04'),(650,2,53,'2026-09-14 01:22:04');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,1,'Super Admin','Full access across the entire system',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(2,1,'Company Admin','Full access within their company',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(3,1,'Store Manager','Manages day-to-day store operations',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(4,1,'Cashier','Rings up sales at the POS terminal',1,'2026-08-16 16:41:35','2026-08-31 14:24:31'),(5,1,'Bagger','Assists with packing and stock visibility only',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(6,1,'Store Admin','Full access, typically scoped to specific stores via Store Access',1,'2026-08-19 19:46:00','2026-08-19 19:46:00'),(8,1,'Cashier Supervisor','Supervises cashiers — can void sales and approve returns',1,'2026-08-19 21:33:36','2026-08-19 21:33:36');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `stores`
--

LOCK TABLES `stores` WRITE;
/*!40000 ALTER TABLE `stores` DISABLE KEYS */;
INSERT INTO `stores` VALUES (19,1,'Ermita Branch - Grocery & Bakery','101','8th Floor, Ayala Tower One, Makati City',NULL,'123-456-789-001','SN2024EX00101','MIN-2024-0001-0101','PTU-2026-0001-0101',NULL,NULL,1,NULL,NULL,1,'2026-09-15 15:56:59','2026-09-15 15:56:59'),(20,1,'Head Office','000','6750 Ayala Avenue, Makati',NULL,'123-456-789-000',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,1,'2026-09-15 15:56:59','2026-09-15 15:56:59'),(21,1,'Cebu Branch','102','Lahug, Cebu City',NULL,'123-456-789-002','SN2024EX00102','MIN-2024-0002-0102',NULL,NULL,NULL,1,NULL,NULL,1,'2026-09-15 15:56:59','2026-09-15 15:56:59');
/*!40000 ALTER TABLE `stores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tax_rates`
--

LOCK TABLES `tax_rates` WRITE;
/*!40000 ALTER TABLE `tax_rates` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_rates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `units`
--

LOCK TABLES `units` WRITE;
/*!40000 ALTER TABLE `units` DISABLE KEYS */;
INSERT INTO `units` VALUES (1,'Pieces','PCS',0,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(2,'Kilogram','KG',3,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(3,'Gram','G',0,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(4,'Liter','L',3,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(5,'Milliliter','ML',0,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(6,'Meter','M',3,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(7,'Box','BOX',0,'2026-08-16 16:41:35','2026-08-16 16:41:35');
/*!40000 ALTER TABLE `units` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-17  0:42:12
