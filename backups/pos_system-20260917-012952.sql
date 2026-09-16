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
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (6,1,4,'Admininstrator','create','Product',56,'test','{\"id\":\"56\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"s33\",\"barcode\":\"234555\",\"name\":\"test\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-28 21:30:35\",\"updated_at\":\"2026-08-28 21:30:35\"}','::1','2026-08-28 21:30:35'),(7,1,4,'Admininstrator','update','Product',9,'Bottled Water 500ml','{\"description\":{\"old\":\"Purified drinking water\",\"new\":\"Purified drinking water 500\"}}','::1','2026-08-28 21:31:44'),(12,1,4,'Admininstrator','logout','User',4,NULL,NULL,'::1','2026-08-28 21:35:45'),(13,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'::1','2026-08-28 21:35:59'),(14,1,4,'Admininstrator','login-failed','User',4,'Admininstrator','{\"reason\":\"Incorrect password\"}','::1','2026-08-28 21:42:52'),(16,1,5,'Store Admin 101','logout','User',5,NULL,NULL,'::1','2026-08-28 22:54:57'),(17,1,5,'Store Admin 101','login','User',5,'Store Admin 101',NULL,'::1','2026-08-28 23:02:56'),(18,1,21,'Store Admin 102','login','User',21,'Store Admin 102',NULL,'::1','2026-08-28 23:06:26'),(19,1,21,'Store Admin 102','logout','User',21,NULL,NULL,'::1','2026-08-28 23:12:46'),(20,1,21,'Store Admin 102','login','User',21,'Store Admin 102',NULL,'::1','2026-08-28 23:13:18'),(21,1,5,'Store Admin 101','logout','User',5,NULL,NULL,'::1','2026-08-28 23:13:31'),(22,1,5,'Store Admin 101','login','User',5,'Store Admin 101',NULL,'::1','2026-08-28 23:13:44'),(23,1,4,'Admininstrator','delete','Product',55,'ere','{\"id\":\"55\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"aa33\",\"barcode\":\"234234\",\"name\":\"ere\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-28 19:14:12\",\"updated_at\":\"2026-08-28 19:14:12\"}','::1','2026-08-29 08:35:58'),(24,1,4,'Admininstrator','delete','Product',54,'test','{\"id\":\"54\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"112233\",\"barcode\":\"343342\",\"name\":\"test\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-28 19:14:05\",\"updated_at\":\"2026-08-28 19:14:05\"}','::1','2026-08-29 08:36:11'),(25,1,4,'Admininstrator','delete','Product',56,'test','{\"id\":\"56\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"s33\",\"barcode\":\"234555\",\"name\":\"test\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-28 21:30:35\",\"updated_at\":\"2026-08-28 21:30:35\"}','::1','2026-08-29 08:36:16'),(29,1,4,'Admininstrator','delete','Product',53,'test product 2','{\"id\":\"53\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"BEV-00043\",\"barcode\":\"48000000000423\",\"name\":\"test product 2\",\"description\":\"tes\",\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-28 19:11:00\",\"updated_at\":\"2026-08-28 19:11:00\"}','::1','2026-08-29 08:41:56'),(30,1,4,'Admininstrator','delete','Product',50,'test product','{\"id\":\"50\",\"company_id\":\"1\",\"category_id\":\"10\",\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"SKU: BEV-0004\",\"barcode\":null,\"name\":\"test product\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"100.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-28 19:10:08\",\"updated_at\":\"2026-08-28 19:10:08\"}','::1','2026-08-29 08:42:04'),(33,1,4,'Admininstrator','logout','User',4,NULL,NULL,'::1','2026-08-29 08:43:56'),(34,1,5,'Store Admin 101','login-failed','User',5,'Store Admin 101','{\"reason\":\"Incorrect password\"}','::1','2026-08-29 08:44:15'),(35,1,5,'Store Admin 101','login','User',5,'Store Admin 101',NULL,'::1','2026-08-29 08:44:21'),(55,1,4,'Admininstrator','create','Product',58,'test product 1','{\"id\":\"58\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"11111\",\"barcode\":\"110001111\",\"name\":\"test product 1\",\"description\":\"test product\",\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 10:07:26\",\"updated_at\":\"2026-08-29 10:07:26\"}','::1','2026-08-29 10:07:26'),(56,1,4,'Admininstrator','create','Product',59,'test product 2','{\"id\":\"59\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"2222\",\"barcode\":\"222202222\",\"name\":\"test product 2\",\"description\":\"product 2\",\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 10:24:55\",\"updated_at\":\"2026-08-29 10:24:55\"}','::1','2026-08-29 10:24:55'),(57,1,5,'Store Admin 101','logout','User',5,NULL,NULL,'::1','2026-08-29 10:45:24'),(58,1,21,'Store Admin 102','login','User',21,'Store Admin 102',NULL,'::1','2026-08-29 10:45:40'),(62,1,4,'Admininstrator','update','Product Price',58,'test product 1','{\"prices\":{\"old\":null,\"new\":[{\"store_id\":1,\"cost_price\":\"0\",\"selling_price\":\"0\"},{\"store_id\":3,\"cost_price\":\"10\",\"selling_price\":\"20\"},{\"store_id\":8,\"cost_price\":\"30\",\"selling_price\":\"40\"},{\"store_id\":15,\"cost_price\":\"50\",\"selling_price\":\"60\"}]}}','::1','2026-08-29 10:57:40'),(63,1,4,'Admininstrator','update','Product Price',58,'test product 1','{\"prices\":{\"old\":null,\"new\":[{\"store_id\":1,\"cost_price\":\"0.00\",\"selling_price\":\"0.00\"},{\"store_id\":3,\"cost_price\":\"100.00\",\"selling_price\":\"200.00\"},{\"store_id\":8,\"cost_price\":\"300.00\",\"selling_price\":\"400.00\"},{\"store_id\":15,\"cost_price\":\"50.00\",\"selling_price\":\"60.00\"}]}}','::1','2026-08-29 10:59:01'),(64,1,4,'Admininstrator','login-failed','User',4,'Admininstrator','{\"reason\":\"Incorrect password\"}','::1','2026-08-29 15:06:44'),(65,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'::1','2026-08-29 15:07:49'),(66,1,5,'Store Admin 101','login','User',5,'Store Admin 101',NULL,'::1','2026-08-29 15:08:02'),(67,1,21,'Store Admin 102','login','User',21,'Store Admin 102',NULL,'::1','2026-08-29 15:10:20'),(68,1,4,'Admininstrator','create','Product',60,'test product 4','{\"id\":\"60\",\"company_id\":\"1\",\"category_id\":\"16\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"4444\",\"barcode\":\"44004444\",\"name\":\"test product 4\",\"description\":\"product\",\"image_path\":null,\"minimum_stock\":\"200.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 15:14:07\",\"updated_at\":\"2026-08-29 15:14:07\"}','::1','2026-08-29 15:14:07'),(69,1,4,'Admininstrator','create','Product',61,'test Product 5','{\"id\":\"61\",\"company_id\":\"1\",\"category_id\":\"15\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"55555\",\"barcode\":\"5500055\",\"name\":\"test Product 5\",\"description\":\"product 5\",\"image_path\":null,\"minimum_stock\":\"500.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 15:14:55\",\"updated_at\":\"2026-08-29 15:14:55\"}','::1','2026-08-29 15:14:55'),(70,1,4,'Admininstrator','create','Product',66,'sdf','{\"id\":\"66\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"SCH-0001a\",\"barcode\":\"4800000000042aa\",\"name\":\"sdf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 15:15:29\",\"updated_at\":\"2026-08-29 15:15:29\"}','::1','2026-08-29 15:15:29'),(72,1,4,'Admininstrator','update','Product Price',60,'test product 4','{\"prices\":{\"old\":null,\"new\":[{\"store_id\":1,\"cost_price\":\"0\",\"selling_price\":\"0\"},{\"store_id\":3,\"cost_price\":\"100\",\"selling_price\":\"200\"},{\"store_id\":8,\"cost_price\":\"300\",\"selling_price\":\"400\"},{\"store_id\":15,\"cost_price\":\"0\",\"selling_price\":\"0\"}]}}','::1','2026-08-29 15:25:01'),(81,1,4,'Admininstrator','delete','Product',58,'test product 1','{\"id\":\"58\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"11111\",\"barcode\":\"110001111\",\"name\":\"test product 1\",\"description\":\"test product\",\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 10:07:26\",\"updated_at\":\"2026-08-29 10:07:26\"}','::1','2026-08-29 16:05:01'),(82,1,4,'Admininstrator','delete','Product',59,'test product 2','{\"id\":\"59\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"2222\",\"barcode\":\"222202222\",\"name\":\"test product 2\",\"description\":\"product 2\",\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 10:24:55\",\"updated_at\":\"2026-08-29 10:24:55\"}','::1','2026-08-29 16:05:05'),(83,1,4,'Admininstrator','delete','Product',60,'test product 4','{\"id\":\"60\",\"company_id\":\"1\",\"category_id\":\"16\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"4444\",\"barcode\":\"44004444\",\"name\":\"test product 4\",\"description\":\"product\",\"image_path\":\"uploads\\/products\\/60_3d552fc90d95cedf.jpg\",\"minimum_stock\":\"200.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 15:14:07\",\"updated_at\":\"2026-08-29 15:14:08\"}','::1','2026-08-29 16:05:07'),(84,1,4,'Admininstrator','delete','Product',61,'test Product 5','{\"id\":\"61\",\"company_id\":\"1\",\"category_id\":\"15\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"55555\",\"barcode\":\"5500055\",\"name\":\"test Product 5\",\"description\":\"product 5\",\"image_path\":\"uploads\\/products\\/61_b483bcd7fd4cd4e8.jpg\",\"minimum_stock\":\"500.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 15:14:55\",\"updated_at\":\"2026-08-29 15:14:55\"}','::1','2026-08-29 16:05:10'),(85,1,4,'Admininstrator','create','Product',69,'test product 1','{\"id\":\"69\",\"company_id\":\"1\",\"category_id\":\"16\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"11111\",\"barcode\":\"11110001111\",\"name\":\"test product 1\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"200.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:11:58\",\"updated_at\":\"2026-08-29 16:11:58\"}','::1','2026-08-29 16:11:58'),(86,1,4,'Admininstrator','create','Product',70,'test product 2','{\"id\":\"70\",\"company_id\":\"1\",\"category_id\":\"10\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"22222\",\"barcode\":\"22220002222\",\"name\":\"test product 2\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"100.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:11:58\",\"updated_at\":\"2026-08-29 16:11:58\"}','::1','2026-08-29 16:11:58'),(87,1,4,'Admininstrator','create','Product',71,'test product 3','{\"id\":\"71\",\"company_id\":\"1\",\"category_id\":\"14\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"33333\",\"barcode\":\"33330003333\",\"name\":\"test product 3\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"300.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:11:58\",\"updated_at\":\"2026-08-29 16:11:58\"}','::1','2026-08-29 16:11:58'),(88,1,4,'Admininstrator','create','Product',72,'test product 4','{\"id\":\"72\",\"company_id\":\"1\",\"category_id\":\"12\",\"unit_id\":\"5\",\"tax_rate_id\":\"1\",\"sku\":\"44444\",\"barcode\":\"44440004444\",\"name\":\"test product 4\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"400.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:11:58\",\"updated_at\":\"2026-08-29 16:11:58\"}','::1','2026-08-29 16:11:58'),(89,1,4,'Admininstrator','create','Product',74,'sdf','{\"id\":\"74\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"aa\",\"barcode\":null,\"name\":\"sdf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:23:16\",\"updated_at\":\"2026-08-29 16:23:16\"}','::1','2026-08-29 16:23:16'),(90,1,4,'Admininstrator','create','Product',75,'ss','{\"id\":\"75\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"df\",\"barcode\":null,\"name\":\"ss\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:23:16\",\"updated_at\":\"2026-08-29 16:23:16\"}','::1','2026-08-29 16:23:16'),(91,1,4,'Admininstrator','create','Product',76,'sss','{\"id\":\"76\",\"company_id\":\"1\",\"category_id\":\"16\",\"unit_id\":\"3\",\"tax_rate_id\":\"2\",\"sku\":\"111112\",\"barcode\":\"sss\",\"name\":\"sss\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"11.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:23:26\",\"updated_at\":\"2026-08-29 16:23:26\"}','::1','2026-08-29 16:23:26'),(92,1,4,'Admininstrator','create','Product',81,'sdf','{\"id\":\"81\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"aaad\",\"barcode\":\"dd\",\"name\":\"sdf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:24:24\",\"updated_at\":\"2026-08-29 16:24:24\"}','::1','2026-08-29 16:24:24'),(93,1,4,'Admininstrator','create','Product',83,'sdfs','{\"id\":\"83\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"1111123\",\"barcode\":\"110001111\",\"name\":\"sdfs\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:24:34\",\"updated_at\":\"2026-08-29 16:24:34\"}','::1','2026-08-29 16:24:34'),(101,1,4,'Admininstrator','create','Product',94,'asf','{\"id\":\"94\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"11111aa\",\"barcode\":\"11110001111a\",\"name\":\"asf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:58:22\",\"updated_at\":\"2026-08-29 16:58:22\"}','::1','2026-08-29 16:58:22'),(102,1,4,'Admininstrator','create','Product',96,'aa','{\"id\":\"96\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"2222222\",\"barcode\":\"33330003333a\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:58:26\",\"updated_at\":\"2026-08-29 16:58:26\"}','::1','2026-08-29 16:58:26'),(103,1,4,'Admininstrator','create','Product',98,'ss','{\"id\":\"98\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"6666\",\"barcode\":\"6345444\",\"name\":\"ss\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:00:32\",\"updated_at\":\"2026-08-29 17:00:32\"}','::1','2026-08-29 17:00:32'),(104,1,4,'Admininstrator','create','Product',99,'aa','{\"id\":\"99\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"7877\",\"barcode\":\"sf\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:00:32\",\"updated_at\":\"2026-08-29 17:00:32\"}','::1','2026-08-29 17:00:32'),(105,1,4,'Admininstrator','create','Product',100,'dfg','{\"id\":\"100\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"44444s\",\"barcode\":\"224444\",\"name\":\"dfg\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:00:43\",\"updated_at\":\"2026-08-29 17:00:43\"}','::1','2026-08-29 17:00:43'),(106,1,4,'Admininstrator','create','Product',101,'adf','{\"id\":\"101\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"5555\",\"barcode\":\"55555555\",\"name\":\"adf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:02:05\",\"updated_at\":\"2026-08-29 17:02:05\"}','::1','2026-08-29 17:02:05'),(107,1,4,'Admininstrator','create','Product',103,'aaa','{\"id\":\"103\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"7777\",\"barcode\":\"7777777\",\"name\":\"aaa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:02:05\",\"updated_at\":\"2026-08-29 17:02:05\"}','::1','2026-08-29 17:02:05'),(108,1,4,'Admininstrator','create','Product',104,'sdfsa','{\"id\":\"104\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"6666adf\",\"barcode\":\"6666666\",\"name\":\"sdfsa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:02:20\",\"updated_at\":\"2026-08-29 17:02:20\"}','::1','2026-08-29 17:02:20'),(109,1,4,'Admininstrator','create','Product',105,'dsd','{\"id\":\"105\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"77777\",\"barcode\":\"777000777\",\"name\":\"dsd\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:04:58\",\"updated_at\":\"2026-08-29 17:04:58\"}','::1','2026-08-29 17:04:58'),(110,1,4,'Admininstrator','create','Product',106,'aa','{\"id\":\"106\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"88888\",\"barcode\":\"888000888\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:04:58\",\"updated_at\":\"2026-08-29 17:04:58\"}','::1','2026-08-29 17:04:58'),(111,1,4,'Admininstrator','create','Product',107,'qq','{\"id\":\"107\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"99999\",\"barcode\":\"99900099\",\"name\":\"qq\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:04:58\",\"updated_at\":\"2026-08-29 17:04:58\"}','::1','2026-08-29 17:04:58'),(112,1,4,'Admininstrator','delete','Product',96,'aa','{\"id\":\"96\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"2222222\",\"barcode\":\"33330003333a\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:58:26\",\"updated_at\":\"2026-08-29 16:58:26\"}','::1','2026-08-29 17:06:05'),(113,1,4,'Admininstrator','delete','Product',99,'aa','{\"id\":\"99\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"7877\",\"barcode\":\"sf\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:00:32\",\"updated_at\":\"2026-08-29 17:00:32\"}','::1','2026-08-29 17:06:09'),(114,1,4,'Admininstrator','delete','Product',106,'aa','{\"id\":\"106\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"88888\",\"barcode\":\"888000888\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:04:58\",\"updated_at\":\"2026-08-29 17:04:58\"}','::1','2026-08-29 17:06:12'),(115,1,4,'Admininstrator','delete','Product',103,'aaa','{\"id\":\"103\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"7777\",\"barcode\":\"7777777\",\"name\":\"aaa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:02:05\",\"updated_at\":\"2026-08-29 17:02:05\"}','::1','2026-08-29 17:07:01'),(116,1,4,'Admininstrator','delete','Product',101,'adf','{\"id\":\"101\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"5555\",\"barcode\":\"55555555\",\"name\":\"adf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:02:05\",\"updated_at\":\"2026-08-29 17:02:05\"}','::1','2026-08-29 17:07:05'),(117,1,4,'Admininstrator','delete','Product',94,'asf','{\"id\":\"94\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"11111aa\",\"barcode\":\"11110001111a\",\"name\":\"asf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:58:22\",\"updated_at\":\"2026-08-29 16:58:22\"}','::1','2026-08-29 17:07:08'),(118,1,4,'Admininstrator','delete','Product',100,'dfg','{\"id\":\"100\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"44444s\",\"barcode\":\"224444\",\"name\":\"dfg\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:00:43\",\"updated_at\":\"2026-08-29 17:00:43\"}','::1','2026-08-29 17:07:13'),(119,1,4,'Admininstrator','delete','Product',105,'dsd','{\"id\":\"105\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"77777\",\"barcode\":\"777000777\",\"name\":\"dsd\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:04:58\",\"updated_at\":\"2026-08-29 17:04:58\"}','::1','2026-08-29 17:07:20'),(120,1,4,'Admininstrator','delete','Product',107,'qq','{\"id\":\"107\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"99999\",\"barcode\":\"99900099\",\"name\":\"qq\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:04:58\",\"updated_at\":\"2026-08-29 17:04:58\"}','::1','2026-08-29 17:08:05'),(121,1,4,'Admininstrator','create','Product',108,'Sample Product','{\"id\":\"108\",\"company_id\":\"1\",\"category_id\":\"10\",\"unit_id\":\"1\",\"tax_rate_id\":null,\"sku\":\"ABC-001\",\"barcode\":\"1234567890123\",\"name\":\"Sample Product\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"5.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:16:06\",\"updated_at\":\"2026-08-29 17:16:06\"}','::1','2026-08-29 17:16:06'),(122,1,4,'Admininstrator','delete','Product',74,'sdf','{\"id\":\"74\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"aa\",\"barcode\":null,\"name\":\"sdf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:23:16\",\"updated_at\":\"2026-08-29 16:23:16\"}','::1','2026-08-29 17:18:18'),(123,1,4,'Admininstrator','delete','Product',81,'sdf','{\"id\":\"81\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"aaad\",\"barcode\":\"dd\",\"name\":\"sdf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:24:24\",\"updated_at\":\"2026-08-29 16:24:24\"}','::1','2026-08-29 17:18:24'),(124,1,4,'Admininstrator','delete','Product',17,'Silver Swan Vinegar 1L','{\"id\":\"17\",\"company_id\":\"1\",\"category_id\":\"12\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"GRO-0004\",\"barcode\":\"4800000000127\",\"name\":\"Silver Swan Vinegar 1L\",\"description\":\"Cane vinegar, 1 liter bottle\",\"image_path\":null,\"minimum_stock\":\"15.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-24 03:27:00\",\"updated_at\":\"2026-08-24 03:27:00\"}','::1','2026-08-29 17:18:27'),(125,1,4,'Admininstrator','delete','Product',7,'Sprite 1.5L','{\"id\":\"7\",\"company_id\":\"1\",\"category_id\":\"10\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"BEV-0002\",\"barcode\":\"4800000000028\",\"name\":\"Sprite 1.5L\",\"description\":\"Soft drink, 1.5 liter bottle\",\"image_path\":null,\"minimum_stock\":\"20.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-24 03:27:00\",\"updated_at\":\"2026-08-24 03:27:00\"}','::1','2026-08-29 17:18:30'),(126,1,4,'Admininstrator','delete','Product',98,'ss','{\"id\":\"98\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"6666\",\"barcode\":\"6345444\",\"name\":\"ss\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:00:32\",\"updated_at\":\"2026-08-29 17:00:32\"}','::1','2026-08-29 17:18:33'),(127,1,4,'Admininstrator','delete','Product',76,'sss','{\"id\":\"76\",\"company_id\":\"1\",\"category_id\":\"16\",\"unit_id\":\"3\",\"tax_rate_id\":\"2\",\"sku\":\"111112\",\"barcode\":\"sss\",\"name\":\"sss\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"11.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:23:26\",\"updated_at\":\"2026-08-29 16:23:26\"}','::1','2026-08-29 17:18:40'),(128,1,4,'Admininstrator','delete','Product',69,'test product 1','{\"id\":\"69\",\"company_id\":\"1\",\"category_id\":\"16\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"11111\",\"barcode\":\"11110001111\",\"name\":\"test product 1\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"200.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:11:58\",\"updated_at\":\"2026-08-29 16:11:58\"}','::1','2026-08-29 17:18:44'),(129,1,4,'Admininstrator','delete','Product',70,'test product 2','{\"id\":\"70\",\"company_id\":\"1\",\"category_id\":\"10\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"22222\",\"barcode\":\"22220002222\",\"name\":\"test product 2\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"100.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:11:58\",\"updated_at\":\"2026-08-29 16:11:58\"}','::1','2026-08-29 17:18:46'),(130,1,4,'Admininstrator','delete','Product',71,'test product 3','{\"id\":\"71\",\"company_id\":\"1\",\"category_id\":\"14\",\"unit_id\":\"1\",\"tax_rate_id\":\"1\",\"sku\":\"33333\",\"barcode\":\"33330003333\",\"name\":\"test product 3\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"300.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:11:58\",\"updated_at\":\"2026-08-29 16:11:58\"}','::1','2026-08-29 17:18:49'),(131,1,4,'Admininstrator','delete','Product',72,'test product 4','{\"id\":\"72\",\"company_id\":\"1\",\"category_id\":\"12\",\"unit_id\":\"5\",\"tax_rate_id\":\"1\",\"sku\":\"44444\",\"barcode\":\"44440004444\",\"name\":\"test product 4\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"400.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:11:58\",\"updated_at\":\"2026-08-29 16:11:58\"}','::1','2026-08-29 17:18:56'),(132,1,4,'Admininstrator','create','Product',110,'sdf','{\"id\":\"110\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"22222\",\"barcode\":\"sdf\",\"name\":\"sdf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:19:36\",\"updated_at\":\"2026-08-29 17:19:36\"}','::1','2026-08-29 17:19:36'),(133,1,4,'Admininstrator','create','Product',111,'aa','{\"id\":\"111\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"sdf\",\"barcode\":\"asdf\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:19:36\",\"updated_at\":\"2026-08-29 17:19:36\"}','::1','2026-08-29 17:19:36'),(134,1,4,'Admininstrator','create','Product',115,'adfaa22','{\"id\":\"115\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"111111\",\"barcode\":\"480000000009aa7\",\"name\":\"adfaa22\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:19:54\",\"updated_at\":\"2026-08-29 17:19:54\"}','::1','2026-08-29 17:19:54'),(135,1,4,'Admininstrator','delete','Product',115,'adfaa22','{\"id\":\"115\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"111111\",\"barcode\":\"480000000009aa7\",\"name\":\"adfaa22\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:19:54\",\"updated_at\":\"2026-08-29 17:19:54\"}','::1','2026-08-29 17:20:31'),(136,1,4,'Admininstrator','delete','Product',111,'aa','{\"id\":\"111\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"sdf\",\"barcode\":\"asdf\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:19:36\",\"updated_at\":\"2026-08-29 17:19:36\"}','::1','2026-08-29 17:20:34'),(137,1,4,'Admininstrator','delete','Product',110,'sdf','{\"id\":\"110\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"22222\",\"barcode\":\"sdf\",\"name\":\"sdf\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:19:36\",\"updated_at\":\"2026-08-29 17:19:36\"}','::1','2026-08-29 17:20:43'),(138,1,4,'Admininstrator','delete','Product',104,'sdfsa','{\"id\":\"104\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"6666adf\",\"barcode\":\"6666666\",\"name\":\"sdfsa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:02:20\",\"updated_at\":\"2026-08-29 17:02:20\"}','::1','2026-08-29 17:20:47'),(139,1,4,'Admininstrator','delete','Product',75,'ss','{\"id\":\"75\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"df\",\"barcode\":null,\"name\":\"ss\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:23:16\",\"updated_at\":\"2026-08-29 16:23:16\"}','::1','2026-08-29 17:20:51'),(140,1,4,'Admininstrator','delete','Product',83,'sdfs','{\"id\":\"83\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"1111123\",\"barcode\":\"110001111\",\"name\":\"sdfs\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 16:24:34\",\"updated_at\":\"2026-08-29 16:24:34\"}','::1','2026-08-29 17:22:08'),(142,1,4,'Admininstrator','create','Product',116,'aa','{\"id\":\"116\",\"company_id\":\"1\",\"category_id\":\"10\",\"unit_id\":\"1\",\"tax_rate_id\":null,\"sku\":\"11111\",\"barcode\":\"11001111\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"5.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:31:25\",\"updated_at\":\"2026-08-29 17:31:25\"}','::1','2026-08-29 17:31:25'),(143,1,4,'Admininstrator','create','Product',117,'aa','{\"id\":\"117\",\"company_id\":\"1\",\"category_id\":\"16\",\"unit_id\":\"1\",\"tax_rate_id\":null,\"sku\":\"22222\",\"barcode\":\"220022222\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"5.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:31:25\",\"updated_at\":\"2026-08-29 17:31:25\"}','::1','2026-08-29 17:31:25'),(144,1,4,'Admininstrator','create','Product',121,'aa','{\"id\":\"121\",\"company_id\":\"1\",\"category_id\":\"16\",\"unit_id\":\"1\",\"tax_rate_id\":null,\"sku\":\"BEV-00042\",\"barcode\":\"4.8E+12\",\"name\":\"aa\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"6.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 17:31:57\",\"updated_at\":\"2026-08-29 17:31:57\"}','::1','2026-08-29 17:31:57'),(145,1,4,'Admininstrator','update','Product Price',116,'11111','{\"store_ids\":{\"old\":null,\"new\":[3]},\"cost_price\":{\"old\":null,\"new\":\"100\"},\"selling_price\":{\"old\":null,\"new\":\"200\"}}','::1','2026-08-29 17:37:46'),(146,1,4,'Admininstrator','update','Product Price',117,'22222','{\"store_ids\":{\"old\":null,\"new\":[3]},\"cost_price\":{\"old\":null,\"new\":\"300\"},\"selling_price\":{\"old\":null,\"new\":\"400\"}}','::1','2026-08-29 17:37:46'),(147,1,4,'Admininstrator','update','Product Price',116,'11111','{\"store_ids\":{\"old\":null,\"new\":[3]},\"cost_price\":{\"old\":null,\"new\":\"100\"},\"selling_price\":{\"old\":null,\"new\":\"200\"}}','::1','2026-08-29 17:38:11'),(148,1,4,'Admininstrator','update','Product Price',117,'22222','{\"store_ids\":{\"old\":null,\"new\":[3]},\"cost_price\":{\"old\":null,\"new\":\"300\"},\"selling_price\":{\"old\":null,\"new\":\"400\"}}','::1','2026-08-29 17:38:11'),(149,1,4,'Admininstrator','update','Product Price',116,'11111','{\"store_ids\":{\"old\":null,\"new\":[8]},\"cost_price\":{\"old\":null,\"new\":\"500\"},\"selling_price\":{\"old\":null,\"new\":\"600\"}}','::1','2026-08-29 17:39:33'),(150,1,4,'Admininstrator','update','Product Price',117,'22222','{\"store_ids\":{\"old\":null,\"new\":[8]},\"cost_price\":{\"old\":null,\"new\":\"700\"},\"selling_price\":{\"old\":null,\"new\":\"800\"}}','::1','2026-08-29 17:39:33'),(151,1,4,'Admininstrator','update','Product Price',116,'11111','{\"store_ids\":{\"old\":null,\"new\":[1,3,8,15]},\"cost_price\":{\"old\":null,\"new\":\"111\"},\"selling_price\":{\"old\":null,\"new\":\"222\"}}','::1','2026-08-29 17:40:36'),(152,1,4,'Admininstrator','update','Product Price',117,'22222','{\"store_ids\":{\"old\":null,\"new\":[1,3,8,15]},\"cost_price\":{\"old\":null,\"new\":\"333\"},\"selling_price\":{\"old\":null,\"new\":\"444\"}}','::1','2026-08-29 17:40:36'),(155,1,4,'Admininstrator','update','Product Price',121,'BEV-00042','{\"store_ids\":{\"old\":null,\"new\":[8]},\"cost_price\":{\"old\":null,\"new\":\"111\"},\"selling_price\":{\"old\":null,\"new\":\"222\"}}','::1','2026-08-29 17:54:24'),(156,1,4,'Admininstrator','update','Product Price',117,'22222','{\"store_ids\":{\"old\":null,\"new\":[8]},\"cost_price\":{\"old\":null,\"new\":\"333\"},\"selling_price\":{\"old\":null,\"new\":\"444\"}}','::1','2026-08-29 17:54:24'),(157,1,4,'Admininstrator','update','Product Price',25,NULL,'{\"store_ids\":{\"old\":null,\"new\":[8]},\"cost_price\":{\"old\":null,\"new\":\"777\"},\"selling_price\":{\"old\":null,\"new\":\"888\"}}','::1','2026-08-29 17:55:24'),(158,1,4,'Admininstrator','update','Product Price',26,NULL,'{\"store_ids\":{\"old\":null,\"new\":[8]},\"cost_price\":{\"old\":null,\"new\":\"555\"},\"selling_price\":{\"old\":null,\"new\":\"666\"}}','::1','2026-08-29 17:55:24'),(159,1,4,'Admininstrator','update','Product Price',117,NULL,'{\"store_ids\":{\"old\":null,\"new\":[8]},\"cost_price\":{\"old\":null,\"new\":\"111\"},\"selling_price\":{\"old\":null,\"new\":\"222\"}}','::1','2026-08-29 17:55:24'),(160,1,4,'Admininstrator','update','Product Price',121,NULL,'{\"store_ids\":{\"old\":null,\"new\":[8]},\"cost_price\":{\"old\":null,\"new\":\"333\"},\"selling_price\":{\"old\":null,\"new\":\"444\"}}','::1','2026-08-29 17:55:24'),(161,1,4,'Admininstrator','update','Product Price',25,NULL,'{\"store_ids\":{\"old\":null,\"new\":[1,3,8,15]},\"cost_price\":{\"old\":null,\"new\":\"777\"},\"selling_price\":{\"old\":null,\"new\":\"888\"}}','::1','2026-08-29 17:55:55'),(162,1,4,'Admininstrator','update','Product Price',26,NULL,'{\"store_ids\":{\"old\":null,\"new\":[1,3,8,15]},\"cost_price\":{\"old\":null,\"new\":\"555\"},\"selling_price\":{\"old\":null,\"new\":\"666\"}}','::1','2026-08-29 17:55:55'),(163,1,4,'Admininstrator','update','Product Price',117,NULL,'{\"store_ids\":{\"old\":null,\"new\":[1,3,8,15]},\"cost_price\":{\"old\":null,\"new\":\"111.00\"},\"selling_price\":{\"old\":null,\"new\":\"222\"}}','::1','2026-08-29 17:55:55'),(164,1,4,'Admininstrator','update','Product Price',121,NULL,'{\"store_ids\":{\"old\":null,\"new\":[1,3,8,15]},\"cost_price\":{\"old\":null,\"new\":\"333\"},\"selling_price\":{\"old\":null,\"new\":\"444\"}}','::1','2026-08-29 17:55:55'),(165,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-29 18:21:06'),(166,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-29 18:21:20'),(167,1,147,'QA Regression Tester','create','Product',122,'QA Untracked Product','{\"id\":\"122\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"PWQA-trackoff-1788027684176-czjgi\",\"barcode\":null,\"name\":\"QA Untracked Product\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"0\",\"created_at\":\"2026-08-29 18:21:25\",\"updated_at\":\"2026-08-29 18:21:25\"}','::1','2026-08-29 18:21:25'),(168,1,147,'QA Regression Tester','create','Product',123,'QA Duplicate Barcode A','{\"id\":\"123\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"PWQA-dupa-1788027692159-ui760\",\"barcode\":\"PWQA-dupbarcode-1788027692159-ot1xj\",\"name\":\"QA Duplicate Barcode A\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 18:21:33\",\"updated_at\":\"2026-08-29 18:21:33\"}','::1','2026-08-29 18:21:33'),(169,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-29 18:22:16'),(170,1,147,'QA Regression Tester','create','Product',125,'QA Untracked Product','{\"id\":\"125\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"PWQA-trackoff-1788027740369-dofnw\",\"barcode\":null,\"name\":\"QA Untracked Product\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"0\",\"created_at\":\"2026-08-29 18:22:21\",\"updated_at\":\"2026-08-29 18:22:21\"}','::1','2026-08-29 18:22:21'),(171,1,147,'QA Regression Tester','create','Product',126,'QA Duplicate Barcode A','{\"id\":\"126\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":null,\"sku\":\"PWQA-dupa-1788027749954-j99ci\",\"barcode\":\"PWQA-dupbarcode-1788027749954-ddjh4\",\"name\":\"QA Duplicate Barcode A\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 18:22:31\",\"updated_at\":\"2026-08-29 18:22:31\"}','::1','2026-08-29 18:22:31'),(172,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-29 18:22:59'),(173,1,147,'QA Regression Tester','create','Product',128,'QA Untracked Product','{\"id\":\"128\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"PWQA-trackoff-1788027782930-lig8i\",\"barcode\":null,\"name\":\"QA Untracked Product\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"0\",\"created_at\":\"2026-08-29 18:23:04\",\"updated_at\":\"2026-08-29 18:23:04\"}','::1','2026-08-29 18:23:04'),(174,1,147,'QA Regression Tester','create','Product',129,'QA Duplicate Barcode A','{\"id\":\"129\",\"company_id\":\"1\",\"category_id\":null,\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"PWQA-dupa-1788027792716-a41kc\",\"barcode\":\"PWQA-dupbarcode-1788027792716-s2n1m\",\"name\":\"QA Duplicate Barcode A\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-08-29 18:23:14\",\"updated_at\":\"2026-08-29 18:23:14\"}','::1','2026-08-29 18:23:14'),(175,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 09:42:34'),(176,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 09:42:39'),(177,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 09:42:49'),(178,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 09:43:41'),(179,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 09:44:17'),(180,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 09:49:30'),(181,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 09:50:07'),(182,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 14:08:42'),(183,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 14:37:18'),(184,1,147,'QA Regression Tester','create','Payment Method',7,'QA Test Wallet','{\"id\":\"7\",\"company_id\":\"1\",\"name\":\"QA Test Wallet\",\"code\":\"qa_test_wallet\",\"is_active\":\"1\",\"created_at\":\"2026-08-30 14:37:23\",\"updated_at\":\"2026-08-30 14:37:23\"}','::1','2026-08-30 14:37:23'),(185,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 14:37:36'),(186,1,147,'QA Regression Tester','create','Payment Method',8,'QA Test Wallet','{\"id\":\"8\",\"company_id\":\"1\",\"name\":\"QA Test Wallet\",\"code\":\"qa_test_wallet_2\",\"is_active\":\"1\",\"created_at\":\"2026-08-30 14:37:40\",\"updated_at\":\"2026-08-30 14:37:40\"}','::1','2026-08-30 14:37:40'),(187,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 14:39:17'),(188,1,147,'QA Regression Tester','create','Payment Method',9,'QA Wallet 1788100756163','{\"id\":\"9\",\"company_id\":\"1\",\"name\":\"QA Wallet 1788100756163\",\"code\":\"qa_wallet_1788100756163\",\"is_active\":\"1\",\"created_at\":\"2026-08-30 14:39:22\",\"updated_at\":\"2026-08-30 14:39:22\"}','::1','2026-08-30 14:39:22'),(190,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 14:48:29'),(191,1,147,'QA Regression Tester','create','Payment Method',10,'QA Label Wallet 1788101306989','{\"id\":\"10\",\"company_id\":\"1\",\"name\":\"QA Label Wallet 1788101306989\",\"code\":\"qa_label_wallet_1788101306989\",\"is_active\":\"1\",\"created_at\":\"2026-08-30 14:48:33\",\"updated_at\":\"2026-08-30 14:48:33\"}','::1','2026-08-30 14:48:33'),(193,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 14:50:03'),(194,1,147,'QA Regression Tester','create','Payment Method',11,'QA Label Wallet 1788101401330','{\"id\":\"11\",\"company_id\":\"1\",\"name\":\"QA Label Wallet 1788101401330\",\"code\":\"qa_label_wallet_1788101401330\",\"is_active\":\"1\",\"created_at\":\"2026-08-30 14:50:06\",\"updated_at\":\"2026-08-30 14:50:06\"}','::1','2026-08-30 14:50:06'),(196,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 14:50:33'),(197,1,147,'QA Regression Tester','create','Payment Method',12,'QA Label Wallet 1788101432249','{\"id\":\"12\",\"company_id\":\"1\",\"name\":\"QA Label Wallet 1788101432249\",\"code\":\"qa_label_wallet_1788101432249\",\"is_active\":\"1\",\"created_at\":\"2026-08-30 14:50:37\",\"updated_at\":\"2026-08-30 14:50:37\"}','::1','2026-08-30 14:50:37'),(199,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 14:50:51'),(200,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 14:52:30'),(201,1,147,'QA Regression Tester','create','Payment Method',13,'QA Label Wallet 1788101548877','{\"id\":\"13\",\"company_id\":\"1\",\"name\":\"QA Label Wallet 1788101548877\",\"code\":\"qa_label_wallet_1788101548877\",\"is_active\":\"1\",\"created_at\":\"2026-08-30 14:52:34\",\"updated_at\":\"2026-08-30 14:52:34\"}','::1','2026-08-30 14:52:34'),(204,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-30 14:52:48'),(205,1,4,'Admininstrator','logout','User',4,NULL,NULL,'::1','2026-08-30 14:59:47'),(206,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'::1','2026-08-30 14:59:56'),(207,1,4,'Admininstrator','update','Payment Method',5,'Bank Transfer','{\"is_active\":{\"old\":\"1\",\"new\":\"0\"}}','::1','2026-08-30 15:08:50'),(208,1,4,'Admininstrator','update','Payment Method',5,'Bank Transfer','{\"is_active\":{\"old\":\"0\",\"new\":\"1\"}}','::1','2026-08-30 15:08:53'),(209,1,21,'Store Admin 102','logout','User',21,NULL,NULL,'::1','2026-08-30 15:12:41'),(210,1,5,'Store Admin 101','login','User',5,'Store Admin 101',NULL,'::1','2026-08-30 15:13:14'),(211,1,5,'Store Admin 101','logout','User',5,NULL,NULL,'::1','2026-08-30 15:18:21'),(212,1,5,'Store Admin 101','login','User',5,'Store Admin 101',NULL,'::1','2026-08-30 15:18:30'),(213,1,5,'Store Admin 101','logout','User',5,NULL,NULL,'::1','2026-08-30 15:21:31'),(214,1,5,'Store Admin 101','login-failed','User',5,'Store Admin 101','{\"reason\":\"Incorrect password\"}','::1','2026-08-30 15:22:05'),(215,1,5,'Store Admin 101','login','User',5,'Store Admin 101',NULL,'::1','2026-08-30 15:22:07'),(216,1,5,'Store Admin 101','logout','User',5,NULL,NULL,'::1','2026-08-30 15:23:11'),(217,1,5,'Store Admin 101','login','User',5,'Store Admin 101',NULL,'::1','2026-08-30 15:23:18'),(218,1,5,'Store Admin 101','logout','User',5,NULL,NULL,'::1','2026-08-30 15:25:22'),(219,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','::1','2026-08-30 15:25:29'),(220,1,4,'Admininstrator','reset-password','User',58,'Cashier1 101',NULL,'::1','2026-08-30 15:25:38'),(221,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'::1','2026-08-30 15:25:44'),(222,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'::1','2026-08-30 15:26:43'),(223,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'::1','2026-08-30 15:26:49'),(224,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'::1','2026-08-30 16:13:36'),(225,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'::1','2026-08-30 16:13:45'),(226,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'::1','2026-08-30 16:35:30'),(230,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'::1','2026-08-30 16:45:06'),(243,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','::1','2026-08-31 06:43:03'),(245,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','::1','2026-08-31 06:45:08'),(246,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'::1','2026-08-31 06:45:18'),(305,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-08-31 10:17:07'),(313,1,4,'Admininstrator','logout','User',4,NULL,NULL,'::1','2026-08-31 12:37:51'),(314,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'::1','2026-08-31 12:38:00'),(350,1,5,'Store Admin 101','logout','User',5,NULL,NULL,'::1','2026-08-31 15:10:53'),(351,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'::1','2026-08-31 15:24:57'),(353,1,4,'Admininstrator','create','User',198,'Bagger 1 101','{\"id\":\"198\",\"company_id\":\"1\",\"role_id\":\"5\",\"name\":\"Bagger 1 101\",\"email\":\"bagger1_101@yahoo.com\",\"username\":\"bagger1_101\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-08-31 17:09:44\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-08-31 17:09:44\",\"updated_at\":\"2026-08-31 17:09:44\"}','::1','2026-08-31 17:09:44'),(354,1,4,'Admininstrator','update','User',198,'Bagger 1 101','{\"store_ids\":{\"old\":[],\"new\":[3]}}','::1','2026-08-31 17:13:01'),(360,1,4,'Admininstrator','login-failed','User',4,'Admininstrator','{\"reason\":\"Incorrect password\"}','::1','2026-08-31 18:24:59'),(362,1,4,'Admininstrator','update','Store',3,'Store 101','{\"name\":{\"old\":\"Store 1\",\"new\":\"Store 101\"}}','::1','2026-08-31 19:47:08'),(363,1,5,'Store Admin 101','logout','User',5,NULL,NULL,'::1','2026-09-01 08:45:43'),(364,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'::1','2026-09-01 08:45:53'),(404,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'::1','2026-09-01 14:34:47'),(405,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'::1','2026-09-01 14:34:58'),(406,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'::1','2026-09-01 14:40:20'),(407,1,4,'Admininstrator','logout','User',4,NULL,NULL,'::1','2026-09-01 14:45:43'),(408,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'::1','2026-09-01 14:45:58'),(412,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'::1','2026-09-01 16:27:14'),(413,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'::1','2026-09-01 16:27:26'),(415,1,4,'Admininstrator','create','User',222,'Cashier1 102','{\"id\":\"222\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"Cashier1 102\",\"email\":\"cashier1_102@yahoo.com\",\"username\":\"cashier2_102\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-01 18:26:55\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-01 18:26:55\",\"updated_at\":\"2026-09-01 18:26:55\"}','::1','2026-09-01 18:26:55'),(416,1,222,'Cashier1 102','login','User',222,'Cashier1 102',NULL,'::1','2026-09-01 18:27:06'),(432,1,4,'Admininstrator','update','Company',1,NULL,'{\"require_void_approval\":{\"old\":\"1\",\"new\":\"0\"}}','::1','2026-09-01 19:20:22'),(433,1,4,'Admininstrator','update','Company',1,NULL,'{\"require_void_approval\":{\"old\":\"0\",\"new\":\"1\"}}','::1','2026-09-01 19:20:37'),(434,1,4,'Admininstrator','update','Company',1,NULL,'{\"require_void_approval\":{\"old\":\"1\",\"new\":\"0\"}}','::1','2026-09-01 20:17:26'),(439,1,58,'Cashier1 101','item-void','Cart Item',NULL,'Red Horse Beer 1L','{\"item\":\"Red Horse Beer 1L\",\"quantity\":1,\"amount\":75,\"reason\":\"Customer changed mind\"}','::1','2026-09-01 21:33:39'),(440,1,58,'Cashier1 101','item-void','Cart Item',NULL,'aa','{\"item\":\"aa\",\"quantity\":2,\"amount\":444,\"reason\":\"Customer changed mind\"}','::1','2026-09-01 21:33:58'),(441,1,58,'Cashier1 101','item-void','Cart Item',NULL,'aa','{\"item\":\"aa\",\"quantity\":1,\"amount\":444,\"reason\":\"Customer changed mind\"}','::1','2026-09-01 21:34:02'),(442,1,4,'Admininstrator','update','Company',1,NULL,'{\"require_item_void_approval\":{\"old\":\"0\",\"new\":\"1\"}}','::1','2026-09-01 21:36:02'),(443,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (1 item)','{\"item_count\":1,\"amount\":16.2,\"reason\":\"Price dispute\"}','::1','2026-09-01 21:36:23'),(444,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-02 07:51:00'),(445,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-02 07:58:11'),(486,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (11 items)','{\"item_count\":11,\"amount\":3508.4,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-02 08:45:28'),(487,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.59','2026-09-02 08:46:32'),(488,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.59','2026-09-02 08:46:38'),(489,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-02 08:47:23'),(490,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-02 08:47:35'),(510,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.59','2026-09-02 09:10:06'),(511,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.59','2026-09-02 09:10:13'),(512,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-02 09:10:24'),(513,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-02 09:10:39'),(522,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-02 10:08:23'),(525,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-02 10:13:59'),(526,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-02 10:20:50'),(538,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'127.0.0.1','2026-09-02 15:24:22'),(549,1,4,'Admininstrator','update','Store',3,'Store 101','{\"vat_reg_tin\":{\"old\":null,\"new\":\"111-222-333-44\"},\"pos_serial_no\":{\"old\":null,\"new\":\"SDF34SDF\"},\"min_no\":{\"old\":null,\"new\":\"342342343\"}}','127.0.0.1','2026-09-02 16:31:49'),(554,1,4,'Admininstrator','login-failed','User',4,'Admininstrator','{\"reason\":\"Incorrect password\"}','127.0.0.1','2026-09-02 16:49:05'),(559,1,4,'Admininstrator','logout','User',4,NULL,NULL,'127.0.0.1','2026-09-02 17:19:15'),(560,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'127.0.0.1','2026-09-02 17:19:30'),(561,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'127.0.0.1','2026-09-02 17:20:39'),(562,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'127.0.0.1','2026-09-02 17:20:56'),(563,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'127.0.0.1','2026-09-02 17:25:22'),(566,1,4,'Admininstrator','update','Store',3,'Store 101','{\"address\":{\"old\":\"Ground Floor, SM City Fairview, Quirino Highway, Novaliches, Quezon City, 1121 Metro Manila\",\"new\":null},\"receipt_footer_note\":{\"old\":\"Fairview Branch - Grocery & Bakery\\nThis invoice\\/receipt shall be valid for five (5) years from the date of the permit to use.\",\"new\":\"THIS SERVES AS YOUR OFFICIAL RECEIPT\\nTHANK YOU FOR SHOPPING, COME AGAIN HAVE A NICE DAY.\"},\"phone\":{\"old\":\"(02) 8123-4567\",\"new\":null},\"email\":{\"old\":\"store101@defaultcompany.com.ph\",\"new\":null}}','127.0.0.1','2026-09-02 17:32:17'),(567,1,4,'Admininstrator','update','Store',8,'Store 2','{\"address\":{\"old\":\"2nd Floor, Robinsons Place Manila, Pedro Gil corner Adriatico St, Ermita, Manila, 1000 Metro Manila\",\"new\":null},\"receipt_footer_note\":{\"old\":\"Ermita Branch - Grocery & Bakery\\nThis invoice\\/receipt shall be valid for five (5) years from the date of the permit to use.\",\"new\":\"This invoice\\/receipt shall be valid for five (5) years from the date of the permit to use.\"},\"phone\":{\"old\":\"(02) 8234-5678\",\"new\":null},\"email\":{\"old\":\"store102@defaultcompany.com.ph\",\"new\":null}}','127.0.0.1','2026-09-02 17:44:45'),(568,1,4,'Admininstrator','update','Store',3,'Ermita Branch - Grocery & Bakery','{\"name\":{\"old\":\"Store 101\",\"new\":\"Ermita Branch - Grocery & Bakery\"}}','127.0.0.1','2026-09-02 17:45:03'),(574,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','127.0.0.1','2026-09-03 16:23:09'),(575,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'127.0.0.1','2026-09-03 16:28:26'),(579,1,4,'Admininstrator','logout','User',4,NULL,NULL,'127.0.0.1','2026-09-03 17:49:53'),(580,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'127.0.0.1','2026-09-03 17:50:01'),(581,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'127.0.0.1','2026-09-03 18:07:51'),(582,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'127.0.0.1','2026-09-03 19:45:17'),(583,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'127.0.0.1','2026-09-03 20:11:01'),(584,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'127.0.0.1','2026-09-03 21:33:30'),(585,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 13:24:47'),(587,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (13 items)','{\"item_count\":13,\"amount\":1604,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-04 13:26:02'),(597,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-04 13:38:36'),(599,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 13:39:04'),(601,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (9 items)','{\"item_count\":9,\"amount\":827.2,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-04 13:40:05'),(617,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-04 14:03:52'),(618,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','192.168.100.225','2026-09-04 14:04:22'),(619,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 14:04:38'),(620,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-04 14:40:18'),(621,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-04 15:17:16'),(622,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','192.168.100.59','2026-09-04 15:17:53'),(623,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-04 15:17:56'),(625,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 17:00:41'),(626,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-04 17:01:48'),(634,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-04 17:15:26'),(635,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (9 items)','{\"item_count\":9,\"amount\":1755,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-04 17:15:34'),(636,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','192.168.100.225','2026-09-04 17:16:39'),(637,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','192.168.100.225','2026-09-04 17:16:43'),(638,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 17:16:48'),(639,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (18 items)','{\"item_count\":18,\"amount\":3769.5,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-04 17:17:02'),(645,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-04 17:38:00'),(650,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 17:52:32'),(651,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-04 17:56:26'),(652,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 17:56:49'),(653,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-04 17:57:27'),(658,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','192.168.100.225','2026-09-04 18:04:46'),(659,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 18:05:01'),(660,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-04 18:06:28'),(661,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 18:08:35'),(667,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-04 18:25:50'),(668,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 18:26:14'),(689,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-04 19:03:42'),(693,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 19:15:22'),(696,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-04 19:31:16'),(697,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-04 19:31:42'),(700,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'127.0.0.1','2026-09-04 20:25:10'),(702,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-05 15:16:15'),(703,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-05 15:17:48'),(732,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (2 items)','{\"item_count\":2,\"amount\":1644,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-05 16:30:51'),(733,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.225','2026-09-05 16:34:34'),(734,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.225','2026-09-05 16:34:58'),(735,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-05 16:35:13'),(736,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (5 items)','{\"item_count\":5,\"amount\":3463,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-05 16:36:26'),(737,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-05 16:44:41'),(745,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.59','2026-09-06 16:08:45'),(746,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-06 16:08:56'),(747,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-06 16:16:33'),(748,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-06 16:16:44'),(749,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.59','2026-09-06 16:20:02'),(750,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-06 16:20:17'),(769,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-06 16:40:42'),(770,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-06 16:40:53'),(771,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-06 16:41:38'),(772,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-06 16:41:47'),(773,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.59','2026-09-06 16:44:53'),(774,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-06 16:45:01'),(780,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-06 17:00:54'),(781,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-06 17:01:05'),(782,1,4,'Admininstrator','update','Company',1,NULL,'{\"require_manual_discount_approval\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.59','2026-09-06 17:20:23'),(783,1,4,'Admininstrator','update','Company',1,NULL,'{\"require_manual_discount_approval\":{\"old\":\"0\",\"new\":\"1\"}}','192.168.100.59','2026-09-06 17:20:25'),(784,1,4,'Admininstrator','update','Company',1,NULL,'{\"require_manual_discount_approval\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.59','2026-09-06 17:20:26'),(787,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-06 17:27:58'),(789,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-06 17:28:10'),(792,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.59','2026-09-06 18:03:10'),(793,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-06 18:03:21'),(794,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-06 18:05:45'),(795,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-06 18:05:54'),(796,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-07 07:21:09'),(798,1,4,'Admininstrator','update','Company',1,NULL,'{\"require_manual_discount_approval\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.59','2026-09-07 07:43:16'),(799,1,4,'Admininstrator','update','Company',1,NULL,'{\"require_manual_discount_approval\":{\"old\":\"0\",\"new\":\"1\"}}','192.168.100.59','2026-09-07 07:43:18'),(806,1,4,'Admininstrator','update','Company',1,NULL,'{\"default_regular_discount_percent\":{\"old\":null,\"new\":\"10.00\"}}','192.168.100.59','2026-09-07 07:57:49'),(807,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.225','2026-09-07 08:01:22'),(808,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.225','2026-09-07 08:01:36'),(809,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-07 08:01:52'),(819,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-07 08:31:40'),(837,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','192.168.100.225','2026-09-07 09:51:30'),(838,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-07 09:51:37'),(839,1,4,'Admininstrator','update','Company',1,NULL,'{\"require_cancel_approval\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.59','2026-09-07 10:58:45'),(840,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-07 10:59:02'),(843,1,4,'Admininstrator','create','Product',234,'Tst','{\"id\":\"234\",\"company_id\":\"1\",\"category_id\":\"16\",\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"123456789\",\"barcode\":\"1122335546\",\"name\":\"Tst\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-09-07 17:13:34\",\"updated_at\":\"2026-09-07 17:13:34\"}','192.168.100.59','2026-09-07 17:13:34'),(844,1,4,'Admininstrator','create','Product',235,'aad','{\"id\":\"235\",\"company_id\":\"1\",\"category_id\":\"15\",\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"12344\",\"barcode\":\"11222233\",\"name\":\"aad\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-09-07 18:13:25\",\"updated_at\":\"2026-09-07 18:13:25\"}','192.168.100.59','2026-09-07 18:13:25'),(845,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:28:52'),(846,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:29:02'),(847,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:29:10'),(848,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:29:16'),(849,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:29:23'),(850,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:29:29'),(851,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:29:34'),(852,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:29:40'),(853,1,147,'QA Regression Tester','create','User',295,'PWQA Cart Icon Test','{\"id\":\"295\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Cart Icon Test\",\"email\":\"pwqa.carticon@pos-system.local\",\"username\":\"pwqa_carticon\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 18:29:40\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-07 18:29:40\",\"updated_at\":\"2026-09-07 18:29:40\"}','127.0.0.1','2026-09-07 18:29:40'),(855,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:31:13'),(858,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:31:54'),(864,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:34:15'),(865,1,147,'QA Regression Tester','delete','User',295,'PWQA Cart Icon Test','{\"id\":\"295\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Cart Icon Test\",\"email\":\"pwqa.carticon@pos-system.local\",\"username\":\"pwqa_carticon\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 18:29:40\",\"session_valid_from\":\"2026-09-07 18:33:41\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-07 18:33:41\",\"created_at\":\"2026-09-07 18:29:40\",\"updated_at\":\"2026-09-07 18:33:41\"}','127.0.0.1','2026-09-07 18:34:16'),(866,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:34:24'),(867,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (2 items)','{\"item_count\":2,\"amount\":637.34,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-07 18:38:52'),(868,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (5 items)','{\"item_count\":5,\"amount\":655,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-07 18:39:04'),(869,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:58:50'),(870,1,147,'QA Regression Tester','create','User',296,'PWQA Live Discount Test','{\"id\":\"296\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Live Discount Test\",\"email\":\"pwqa.livediscount@pos-system.local\",\"username\":\"pwqa_livediscount\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 18:58:50\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-07 18:58:50\",\"updated_at\":\"2026-09-07 18:58:50\"}','127.0.0.1','2026-09-07 18:58:50'),(872,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 18:59:35'),(873,1,147,'QA Regression Tester','delete','User',296,'PWQA Live Discount Test','{\"id\":\"296\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Live Discount Test\",\"email\":\"pwqa.livediscount@pos-system.local\",\"username\":\"pwqa_livediscount\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 18:58:50\",\"session_valid_from\":\"2026-09-07 18:59:10\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-07 18:59:10\",\"created_at\":\"2026-09-07 18:58:50\",\"updated_at\":\"2026-09-07 18:59:10\"}','127.0.0.1','2026-09-07 18:59:35'),(874,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (9 items)','{\"item_count\":9,\"amount\":1018.53,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-07 19:00:34'),(875,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 19:20:11'),(876,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 19:22:24'),(877,1,4,'Admininstrator','create','Product',237,'33','{\"id\":\"237\",\"company_id\":\"1\",\"category_id\":\"11\",\"unit_id\":null,\"tax_rate_id\":\"1\",\"sku\":\"111114\",\"barcode\":\"2222\",\"name\":\"33\",\"description\":null,\"image_path\":null,\"minimum_stock\":\"0.0000\",\"is_active\":\"1\",\"track_inventory\":\"1\",\"created_at\":\"2026-09-07 19:34:19\",\"updated_at\":\"2026-09-07 19:34:19\"}','192.168.100.59','2026-09-07 19:34:19'),(878,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (9 items)','{\"item_count\":9,\"amount\":518.3,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-07 19:44:20'),(879,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 19:46:56'),(880,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 19:47:02'),(881,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 19:47:09'),(882,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 19:47:21'),(883,1,147,'QA Regression Tester','create','User',297,'PWQA Eligibility Flip Test','{\"id\":\"297\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Eligibility Flip Test\",\"email\":\"pwqa.eligflip@pos-system.local\",\"username\":\"pwqa_eligflip\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 19:47:22\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-07 19:47:22\",\"updated_at\":\"2026-09-07 19:47:22\"}','127.0.0.1','2026-09-07 19:47:22'),(885,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:48:16'),(886,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:48:41'),(887,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:49:14'),(888,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:49:38'),(889,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:50:11'),(890,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:50:45'),(891,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:51:30'),(892,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:52:23'),(893,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:53:07'),(894,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:54:07'),(895,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:55:02'),(896,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:56:05'),(897,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-07 19:56:28'),(899,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 19:57:33'),(900,1,147,'QA Regression Tester','delete','User',297,'PWQA Eligibility Flip Test','{\"id\":\"297\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Eligibility Flip Test\",\"email\":\"pwqa.eligflip@pos-system.local\",\"username\":\"pwqa_eligflip\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 19:47:22\",\"session_valid_from\":\"2026-09-07 19:57:09\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-07 19:57:09\",\"created_at\":\"2026-09-07 19:47:22\",\"updated_at\":\"2026-09-07 19:57:09\"}','127.0.0.1','2026-09-07 19:57:34'),(901,1,4,'Admininstrator','update','Product Price',237,'33','{\"prices\":{\"old\":null,\"new\":[{\"store_id\":3,\"cost_price\":\"11\",\"selling_price\":\"22\"},{\"store_id\":1,\"cost_price\":\"0\",\"selling_price\":\"0\"},{\"store_id\":8,\"cost_price\":\"0\",\"selling_price\":\"0\"},{\"store_id\":15,\"cost_price\":\"0\",\"selling_price\":\"0\"}]}}','192.168.100.59','2026-09-07 20:24:36'),(902,1,4,'Admininstrator','update','Product',179,'All Purpose Flour 1kg','{\"tax_rate_id\":{\"old\":\"1\",\"new\":\"2\"}}','192.168.100.59','2026-09-07 20:26:03'),(903,1,58,'Cashier1 101','item-void','Cart Item',NULL,'All Purpose Flour 1kg','{\"item\":\"All Purpose Flour 1kg\",\"quantity\":1,\"amount\":55,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-07 20:26:39'),(904,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 20:35:32'),(905,1,147,'QA Regression Tester','create','User',298,'PWQA Footer Test','{\"id\":\"298\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Footer Test\",\"email\":\"pwqa.footer@pos-system.local\",\"username\":\"pwqa_footer\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 20:35:33\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-07 20:35:33\",\"updated_at\":\"2026-09-07 20:35:33\"}','127.0.0.1','2026-09-07 20:35:33'),(907,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 20:36:40'),(908,1,147,'QA Regression Tester','delete','User',298,'PWQA Footer Test','{\"id\":\"298\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Footer Test\",\"email\":\"pwqa.footer@pos-system.local\",\"username\":\"pwqa_footer\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 20:35:33\",\"session_valid_from\":\"2026-09-07 20:35:56\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-07 20:35:56\",\"created_at\":\"2026-09-07 20:35:33\",\"updated_at\":\"2026-09-07 20:35:56\"}','127.0.0.1','2026-09-07 20:36:40'),(909,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 20:59:12'),(910,1,147,'QA Regression Tester','create','User',299,'PWQA Buttons Test','{\"id\":\"299\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Buttons Test\",\"email\":\"pwqa.buttons@pos-system.local\",\"username\":\"pwqa_buttons\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 20:59:12\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-07 20:59:12\",\"updated_at\":\"2026-09-07 20:59:12\"}','127.0.0.1','2026-09-07 20:59:12'),(915,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 21:02:38'),(916,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (7 items)','{\"item_count\":7,\"amount\":417.71,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-07 21:02:43'),(919,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 21:03:58'),(920,1,147,'QA Regression Tester','delete','User',299,'PWQA Buttons Test','{\"id\":\"299\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Buttons Test\",\"email\":\"pwqa.buttons@pos-system.local\",\"username\":\"pwqa_buttons\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 20:59:12\",\"session_valid_from\":\"2026-09-07 21:03:30\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-07 21:03:30\",\"created_at\":\"2026-09-07 20:59:12\",\"updated_at\":\"2026-09-07 21:03:30\"}','127.0.0.1','2026-09-07 21:03:58'),(921,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 21:43:29'),(922,1,147,'QA Regression Tester','create','User',300,'PWQA F1 Test','{\"id\":\"300\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA F1 Test\",\"email\":\"pwqa.f1@pos-system.local\",\"username\":\"pwqa_f1\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 21:43:29\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-07 21:43:29\",\"updated_at\":\"2026-09-07 21:43:29\"}','127.0.0.1','2026-09-07 21:43:29'),(924,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 21:44:29'),(925,1,147,'QA Regression Tester','delete','User',300,'PWQA F1 Test','{\"id\":\"300\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA F1 Test\",\"email\":\"pwqa.f1@pos-system.local\",\"username\":\"pwqa_f1\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 21:43:29\",\"session_valid_from\":\"2026-09-07 21:43:54\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-07 21:43:54\",\"created_at\":\"2026-09-07 21:43:29\",\"updated_at\":\"2026-09-07 21:43:54\"}','127.0.0.1','2026-09-07 21:44:29'),(926,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 21:49:16'),(927,1,147,'QA Regression Tester','create','User',301,'PWQA Help Test','{\"id\":\"301\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Help Test\",\"email\":\"pwqa.help@pos-system.local\",\"username\":\"pwqa_help\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 21:49:17\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-07 21:49:17\",\"updated_at\":\"2026-09-07 21:49:17\"}','127.0.0.1','2026-09-07 21:49:17'),(934,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 21:52:01'),(935,1,147,'QA Regression Tester','delete','User',301,'PWQA Help Test','{\"id\":\"301\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Help Test\",\"email\":\"pwqa.help@pos-system.local\",\"username\":\"pwqa_help\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 21:49:17\",\"session_valid_from\":\"2026-09-07 21:51:45\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-07 21:51:45\",\"created_at\":\"2026-09-07 21:49:17\",\"updated_at\":\"2026-09-07 21:51:45\"}','127.0.0.1','2026-09-07 21:52:01'),(936,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-07 21:57:00'),(937,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-07 21:57:08'),(938,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.59','2026-09-07 21:57:37'),(939,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-07 21:57:45'),(940,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 22:02:41'),(941,1,147,'QA Regression Tester','create','User',302,'PWQA Detail Test','{\"id\":\"302\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Detail Test\",\"email\":\"pwqa.detail@pos-system.local\",\"username\":\"pwqa_detail\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 22:02:42\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-07 22:02:41\",\"updated_at\":\"2026-09-07 22:02:41\"}','127.0.0.1','2026-09-07 22:02:42'),(943,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 22:03:48'),(944,1,147,'QA Regression Tester','delete','User',302,'PWQA Detail Test','{\"id\":\"302\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Detail Test\",\"email\":\"pwqa.detail@pos-system.local\",\"username\":\"pwqa_detail\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 22:02:42\",\"session_valid_from\":\"2026-09-07 22:03:08\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-07 22:03:08\",\"created_at\":\"2026-09-07 22:02:41\",\"updated_at\":\"2026-09-07 22:03:08\"}','127.0.0.1','2026-09-07 22:03:48'),(945,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-07 22:04:23'),(946,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-07 22:07:40'),(947,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 22:09:22'),(948,1,147,'QA Regression Tester','create','User',303,'PWQA Header Test','{\"id\":\"303\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Header Test\",\"email\":\"pwqa.header@pos-system.local\",\"username\":\"pwqa_header\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 22:09:23\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-07 22:09:23\",\"updated_at\":\"2026-09-07 22:09:23\"}','127.0.0.1','2026-09-07 22:09:23'),(950,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-07 22:10:03'),(951,1,147,'QA Regression Tester','delete','User',303,'PWQA Header Test','{\"id\":\"303\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Header Test\",\"email\":\"pwqa.header@pos-system.local\",\"username\":\"pwqa_header\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-07 22:09:23\",\"session_valid_from\":\"2026-09-07 22:09:43\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-07 22:09:43\",\"created_at\":\"2026-09-07 22:09:23\",\"updated_at\":\"2026-09-07 22:09:43\"}','127.0.0.1','2026-09-07 22:10:03'),(952,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-08 07:52:27'),(953,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-08 07:54:33'),(954,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 08:01:08'),(955,1,147,'QA Regression Tester','create','User',304,'PWQA Tax Test','{\"id\":\"304\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Tax Test\",\"email\":\"pwqa.tax@pos-system.local\",\"username\":\"pwqa_tax\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 08:01:08\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 08:01:08\",\"updated_at\":\"2026-09-08 08:01:08\"}','127.0.0.1','2026-09-08 08:01:08'),(957,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 08:01:59'),(958,1,147,'QA Regression Tester','delete','User',304,'PWQA Tax Test','{\"id\":\"304\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Tax Test\",\"email\":\"pwqa.tax@pos-system.local\",\"username\":\"pwqa_tax\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 08:01:08\",\"session_valid_from\":\"2026-09-08 08:01:33\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 08:01:33\",\"created_at\":\"2026-09-08 08:01:08\",\"updated_at\":\"2026-09-08 08:01:33\"}','127.0.0.1','2026-09-08 08:01:59'),(959,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 08:17:52'),(960,1,147,'QA Regression Tester','create','User',305,'PWQA FS Test','{\"id\":\"305\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA FS Test\",\"email\":\"pwqa.fs@pos-system.local\",\"username\":\"pwqa_fs\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 08:17:53\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 08:17:52\",\"updated_at\":\"2026-09-08 08:17:52\"}','127.0.0.1','2026-09-08 08:17:53'),(964,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 08:19:08'),(965,1,147,'QA Regression Tester','delete','User',305,'PWQA FS Test','{\"id\":\"305\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA FS Test\",\"email\":\"pwqa.fs@pos-system.local\",\"username\":\"pwqa_fs\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 08:17:53\",\"session_valid_from\":\"2026-09-08 08:18:55\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 08:18:55\",\"created_at\":\"2026-09-08 08:17:52\",\"updated_at\":\"2026-09-08 08:18:55\"}','127.0.0.1','2026-09-08 08:19:08'),(966,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-08 08:19:53'),(967,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-08 08:20:13'),(968,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-08 08:20:34'),(969,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-08 08:20:42'),(970,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-08 08:21:31'),(971,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-08 08:22:43'),(972,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-08 08:22:57'),(973,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-08 08:26:38'),(974,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 08:40:29'),(975,1,147,'QA Regression Tester','create','User',306,'PWQA Touch FS','{\"id\":\"306\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Touch FS\",\"email\":\"pwqa.touchfs@pos-system.local\",\"username\":\"pwqa_touchfs\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 08:40:29\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 08:40:29\",\"updated_at\":\"2026-09-08 08:40:29\"}','127.0.0.1','2026-09-08 08:40:29'),(977,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 08:41:06'),(978,1,147,'QA Regression Tester','delete','User',306,'PWQA Touch FS','{\"id\":\"306\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Touch FS\",\"email\":\"pwqa.touchfs@pos-system.local\",\"username\":\"pwqa_touchfs\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 08:40:29\",\"session_valid_from\":\"2026-09-08 08:40:53\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 08:40:53\",\"created_at\":\"2026-09-08 08:40:29\",\"updated_at\":\"2026-09-08 08:40:53\"}','127.0.0.1','2026-09-08 08:41:06'),(979,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-08 08:43:13'),(980,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-08 08:43:26'),(981,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 08:54:00'),(982,1,147,'QA Regression Tester','create','User',307,'PWQA Revert FS','{\"id\":\"307\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Revert FS\",\"email\":\"pwqa.revertfs@pos-system.local\",\"username\":\"pwqa_revertfs\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 08:54:00\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 08:54:00\",\"updated_at\":\"2026-09-08 08:54:00\"}','127.0.0.1','2026-09-08 08:54:00'),(985,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 08:54:42'),(986,1,147,'QA Regression Tester','delete','User',307,'PWQA Revert FS','{\"id\":\"307\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Revert FS\",\"email\":\"pwqa.revertfs@pos-system.local\",\"username\":\"pwqa_revertfs\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 08:54:00\",\"session_valid_from\":\"2026-09-08 08:54:30\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 08:54:30\",\"created_at\":\"2026-09-08 08:54:00\",\"updated_at\":\"2026-09-08 08:54:30\"}','127.0.0.1','2026-09-08 08:54:42'),(987,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'::1','2026-09-08 17:02:31'),(988,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-08 17:12:18'),(989,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-08 17:28:33'),(990,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-08 17:47:19'),(991,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 17:50:30'),(992,1,147,'QA Regression Tester','create','User',308,'PWQA TwoLine','{\"id\":\"308\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA TwoLine\",\"email\":\"pwqa.twoline@pos-system.local\",\"username\":\"pwqa_twoline\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 17:50:31\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 17:50:31\",\"updated_at\":\"2026-09-08 17:50:31\"}','127.0.0.1','2026-09-08 17:50:31'),(994,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 17:51:24'),(995,1,147,'QA Regression Tester','delete','User',308,'PWQA TwoLine','{\"id\":\"308\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA TwoLine\",\"email\":\"pwqa.twoline@pos-system.local\",\"username\":\"pwqa_twoline\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 17:50:31\",\"session_valid_from\":\"2026-09-08 17:50:54\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 17:50:54\",\"created_at\":\"2026-09-08 17:50:31\",\"updated_at\":\"2026-09-08 17:50:54\"}','127.0.0.1','2026-09-08 17:51:24'),(996,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 17:59:52'),(997,1,147,'QA Regression Tester','create','User',309,'PWQA Hold Test','{\"id\":\"309\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Hold Test\",\"email\":\"pwqa.hold@pos-system.local\",\"username\":\"pwqa_hold\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 17:59:53\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 17:59:53\",\"updated_at\":\"2026-09-08 17:59:53\"}','127.0.0.1','2026-09-08 17:59:53'),(999,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:00:43'),(1000,1,147,'QA Regression Tester','delete','User',309,'PWQA Hold Test','{\"id\":\"309\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Hold Test\",\"email\":\"pwqa.hold@pos-system.local\",\"username\":\"pwqa_hold\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 17:59:53\",\"session_valid_from\":\"2026-09-08 18:00:15\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 18:00:15\",\"created_at\":\"2026-09-08 17:59:53\",\"updated_at\":\"2026-09-08 18:00:15\"}','127.0.0.1','2026-09-08 18:00:43'),(1001,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (1 item)','{\"item_count\":1,\"amount\":45,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-08 18:17:14'),(1002,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-08 18:17:47'),(1003,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (4 items)','{\"item_count\":4,\"amount\":127,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-08 18:19:16'),(1004,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:21:14'),(1005,1,147,'QA Regression Tester','create','User',310,'PWQA AscOrder','{\"id\":\"310\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA AscOrder\",\"email\":\"pwqa.ascorder@pos-system.local\",\"username\":\"pwqa_ascorder\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:21:15\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 18:21:15\",\"updated_at\":\"2026-09-08 18:21:15\"}','127.0.0.1','2026-09-08 18:21:15'),(1007,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:21:58'),(1008,1,147,'QA Regression Tester','delete','User',310,'PWQA AscOrder','{\"id\":\"310\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA AscOrder\",\"email\":\"pwqa.ascorder@pos-system.local\",\"username\":\"pwqa_ascorder\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:21:15\",\"session_valid_from\":\"2026-09-08 18:21:36\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 18:21:36\",\"created_at\":\"2026-09-08 18:21:15\",\"updated_at\":\"2026-09-08 18:21:36\"}','127.0.0.1','2026-09-08 18:21:58'),(1009,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:25:04'),(1010,1,147,'QA Regression Tester','create','User',311,'PWQA Vertical','{\"id\":\"311\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Vertical\",\"email\":\"pwqa.vertical@pos-system.local\",\"username\":\"pwqa_vertical\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:25:04\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 18:25:04\",\"updated_at\":\"2026-09-08 18:25:04\"}','127.0.0.1','2026-09-08 18:25:04'),(1013,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:26:19'),(1014,1,147,'QA Regression Tester','delete','User',311,'PWQA Vertical','{\"id\":\"311\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Vertical\",\"email\":\"pwqa.vertical@pos-system.local\",\"username\":\"pwqa_vertical\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:25:04\",\"session_valid_from\":\"2026-09-08 18:25:50\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 18:25:50\",\"created_at\":\"2026-09-08 18:25:04\",\"updated_at\":\"2026-09-08 18:25:50\"}','127.0.0.1','2026-09-08 18:26:19'),(1015,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:30:07'),(1016,1,147,'QA Regression Tester','create','User',312,'PWQA Responsive','{\"id\":\"312\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Responsive\",\"email\":\"pwqa.responsive@pos-system.local\",\"username\":\"pwqa_responsive\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:30:08\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 18:30:08\",\"updated_at\":\"2026-09-08 18:30:08\"}','127.0.0.1','2026-09-08 18:30:08'),(1019,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-08 18:30:54'),(1020,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:31:09'),(1021,1,147,'QA Regression Tester','delete','User',312,'PWQA Responsive','{\"id\":\"312\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Responsive\",\"email\":\"pwqa.responsive@pos-system.local\",\"username\":\"pwqa_responsive\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:30:08\",\"session_valid_from\":\"2026-09-08 18:30:37\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 18:30:37\",\"created_at\":\"2026-09-08 18:30:08\",\"updated_at\":\"2026-09-08 18:30:37\"}','127.0.0.1','2026-09-08 18:31:10'),(1022,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (1 item)','{\"item_count\":1,\"amount\":55,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-08 18:31:22'),(1023,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-08 18:37:27'),(1024,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:38:19'),(1025,1,147,'QA Regression Tester','create','User',313,'PWQA Rail','{\"id\":\"313\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Rail\",\"email\":\"pwqa.rail@pos-system.local\",\"username\":\"pwqa_rail\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:38:20\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 18:38:19\",\"updated_at\":\"2026-09-08 18:38:19\"}','127.0.0.1','2026-09-08 18:38:20'),(1028,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:39:43'),(1029,1,147,'QA Regression Tester','delete','User',313,'PWQA Rail','{\"id\":\"313\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Rail\",\"email\":\"pwqa.rail@pos-system.local\",\"username\":\"pwqa_rail\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:38:20\",\"session_valid_from\":\"2026-09-08 18:38:52\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 18:38:52\",\"created_at\":\"2026-09-08 18:38:19\",\"updated_at\":\"2026-09-08 18:38:52\"}','127.0.0.1','2026-09-08 18:39:43'),(1030,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-08 18:44:16'),(1031,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:44:20'),(1032,1,147,'QA Regression Tester','create','User',314,'PWQA Short','{\"id\":\"314\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Short\",\"email\":\"pwqa.short@pos-system.local\",\"username\":\"pwqa_short\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:44:21\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 18:44:20\",\"updated_at\":\"2026-09-08 18:44:20\"}','127.0.0.1','2026-09-08 18:44:21'),(1034,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (1 item)','{\"item_count\":1,\"amount\":175,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-08 18:44:55'),(1037,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:45:36'),(1038,1,147,'QA Regression Tester','delete','User',314,'PWQA Short','{\"id\":\"314\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Short\",\"email\":\"pwqa.short@pos-system.local\",\"username\":\"pwqa_short\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:44:21\",\"session_valid_from\":\"2026-09-08 18:45:10\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 18:45:10\",\"created_at\":\"2026-09-08 18:44:20\",\"updated_at\":\"2026-09-08 18:45:10\"}','127.0.0.1','2026-09-08 18:45:36'),(1039,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:50:13'),(1040,1,147,'QA Regression Tester','create','User',315,'PWQA TwoLineContent','{\"id\":\"315\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA TwoLineContent\",\"email\":\"pwqa.twolinec@pos-system.local\",\"username\":\"pwqa_twolinec\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:50:13\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 18:50:13\",\"updated_at\":\"2026-09-08 18:50:13\"}','127.0.0.1','2026-09-08 18:50:13'),(1043,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:51:15'),(1044,1,147,'QA Regression Tester','delete','User',315,'PWQA TwoLineContent','{\"id\":\"315\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA TwoLineContent\",\"email\":\"pwqa.twolinec@pos-system.local\",\"username\":\"pwqa_twolinec\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:50:13\",\"session_valid_from\":\"2026-09-08 18:50:48\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 18:50:48\",\"created_at\":\"2026-09-08 18:50:13\",\"updated_at\":\"2026-09-08 18:50:48\"}','127.0.0.1','2026-09-08 18:51:15'),(1045,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:55:17'),(1046,1,147,'QA Regression Tester','create','User',316,'PWQA NoIcon','{\"id\":\"316\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA NoIcon\",\"email\":\"pwqa.noicon@pos-system.local\",\"username\":\"pwqa_noicon\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:55:18\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 18:55:17\",\"updated_at\":\"2026-09-08 18:55:17\"}','127.0.0.1','2026-09-08 18:55:18'),(1048,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 18:56:22'),(1049,1,147,'QA Regression Tester','delete','User',316,'PWQA NoIcon','{\"id\":\"316\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA NoIcon\",\"email\":\"pwqa.noicon@pos-system.local\",\"username\":\"pwqa_noicon\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 18:55:18\",\"session_valid_from\":\"2026-09-08 18:55:41\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 18:55:41\",\"created_at\":\"2026-09-08 18:55:17\",\"updated_at\":\"2026-09-08 18:55:41\"}','127.0.0.1','2026-09-08 18:56:23'),(1050,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 19:02:15'),(1051,1,147,'QA Regression Tester','create','User',317,'PWQA BottomRow','{\"id\":\"317\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA BottomRow\",\"email\":\"pwqa.bottomrow@pos-system.local\",\"username\":\"pwqa_bottomrow\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 19:02:15\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 19:02:15\",\"updated_at\":\"2026-09-08 19:02:15\"}','127.0.0.1','2026-09-08 19:02:15'),(1054,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 19:03:25'),(1055,1,147,'QA Regression Tester','delete','User',317,'PWQA BottomRow','{\"id\":\"317\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA BottomRow\",\"email\":\"pwqa.bottomrow@pos-system.local\",\"username\":\"pwqa_bottomrow\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 19:02:15\",\"session_valid_from\":\"2026-09-08 19:02:52\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 19:02:52\",\"created_at\":\"2026-09-08 19:02:15\",\"updated_at\":\"2026-09-08 19:02:52\"}','127.0.0.1','2026-09-08 19:03:26'),(1056,1,58,'Cashier1 101','item-void','Cart Item',NULL,'CDO Corned Beef 150g','{\"item\":\"CDO Corned Beef 150g\",\"quantity\":1,\"amount\":62,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-08 19:12:29'),(1057,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 22:26:56'),(1058,1,147,'QA Regression Tester','create','User',318,'PWQA Pills','{\"id\":\"318\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Pills\",\"email\":\"pwqa.pills@pos-system.local\",\"username\":\"pwqa_pills\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 22:26:56\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 22:26:56\",\"updated_at\":\"2026-09-08 22:26:56\"}','127.0.0.1','2026-09-08 22:26:56'),(1061,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 22:27:46'),(1062,1,147,'QA Regression Tester','delete','User',318,'PWQA Pills','{\"id\":\"318\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Pills\",\"email\":\"pwqa.pills@pos-system.local\",\"username\":\"pwqa_pills\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 22:26:56\",\"session_valid_from\":\"2026-09-08 22:27:31\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 22:27:31\",\"created_at\":\"2026-09-08 22:26:56\",\"updated_at\":\"2026-09-08 22:27:31\"}','127.0.0.1','2026-09-08 22:27:46'),(1063,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 22:35:16'),(1064,1,147,'QA Regression Tester','create','User',319,'PWQA Zoom','{\"id\":\"319\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Zoom\",\"email\":\"pwqa.zoom@pos-system.local\",\"username\":\"pwqa_zoom\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 22:35:16\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 22:35:16\",\"updated_at\":\"2026-09-08 22:35:16\"}','127.0.0.1','2026-09-08 22:35:16'),(1067,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 22:38:20'),(1068,1,147,'QA Regression Tester','delete','User',319,'PWQA Zoom','{\"id\":\"319\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Zoom\",\"email\":\"pwqa.zoom@pos-system.local\",\"username\":\"pwqa_zoom\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 22:35:16\",\"session_valid_from\":\"2026-09-08 22:38:00\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 22:38:00\",\"created_at\":\"2026-09-08 22:35:16\",\"updated_at\":\"2026-09-08 22:38:00\"}','127.0.0.1','2026-09-08 22:38:20'),(1069,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 22:47:17'),(1070,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 22:47:52'),(1071,1,147,'QA Regression Tester','create','User',320,'PWQA Cash','{\"id\":\"320\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Cash\",\"email\":\"pwqa.cash@pos-system.local\",\"username\":\"pwqa_cash\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 22:47:52\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 22:47:52\",\"updated_at\":\"2026-09-08 22:47:52\"}','127.0.0.1','2026-09-08 22:47:52'),(1072,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-08 22:48:21'),(1073,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-08 22:49:33'),(1075,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-08 22:51:08'),(1076,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-08 22:51:54'),(1077,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 22:52:24'),(1078,1,147,'QA Regression Tester','delete','User',320,'PWQA Cash','{\"id\":\"320\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Cash\",\"email\":\"pwqa.cash@pos-system.local\",\"username\":\"pwqa_cash\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 22:47:52\",\"session_valid_from\":\"2026-09-08 22:49:48\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 22:49:48\",\"created_at\":\"2026-09-08 22:47:52\",\"updated_at\":\"2026-09-08 22:49:48\"}','127.0.0.1','2026-09-08 22:52:24'),(1079,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-08 22:53:46'),(1080,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 22:58:13'),(1081,1,147,'QA Regression Tester','create','User',321,'PWQA Btn','{\"id\":\"321\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Btn\",\"email\":\"pwqa.btn@pos-system.local\",\"username\":\"pwqa_btn\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 22:58:14\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 22:58:14\",\"updated_at\":\"2026-09-08 22:58:14\"}','127.0.0.1','2026-09-08 22:58:14'),(1084,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 22:59:35'),(1088,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 23:01:25'),(1089,1,147,'QA Regression Tester','delete','User',321,'PWQA Btn','{\"id\":\"321\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Btn\",\"email\":\"pwqa.btn@pos-system.local\",\"username\":\"pwqa_btn\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 22:58:14\",\"session_valid_from\":\"2026-09-08 23:00:43\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 23:00:43\",\"created_at\":\"2026-09-08 22:58:14\",\"updated_at\":\"2026-09-08 23:00:43\"}','127.0.0.1','2026-09-08 23:01:26'),(1090,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 23:05:57'),(1091,1,147,'QA Regression Tester','create','User',322,'PWQA Grid','{\"id\":\"322\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Grid\",\"email\":\"pwqa.grid@pos-system.local\",\"username\":\"pwqa_grid\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 23:05:58\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 23:05:57\",\"updated_at\":\"2026-09-08 23:05:57\"}','127.0.0.1','2026-09-08 23:05:58'),(1098,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 23:10:09'),(1099,1,147,'QA Regression Tester','delete','User',322,'PWQA Grid','{\"id\":\"322\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Grid\",\"email\":\"pwqa.grid@pos-system.local\",\"username\":\"pwqa_grid\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 23:05:58\",\"session_valid_from\":\"2026-09-08 23:09:39\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 23:09:39\",\"created_at\":\"2026-09-08 23:05:57\",\"updated_at\":\"2026-09-08 23:09:39\"}','127.0.0.1','2026-09-08 23:10:09'),(1100,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 23:16:21'),(1101,1,147,'QA Regression Tester','create','User',323,'PWQA Btns','{\"id\":\"323\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Btns\",\"email\":\"pwqa.btns@pos-system.local\",\"username\":\"pwqa_btns\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 23:16:22\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-08 23:16:21\",\"updated_at\":\"2026-09-08 23:16:21\"}','127.0.0.1','2026-09-08 23:16:22'),(1104,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-08 23:18:29'),(1105,1,147,'QA Regression Tester','delete','User',323,'PWQA Btns','{\"id\":\"323\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Btns\",\"email\":\"pwqa.btns@pos-system.local\",\"username\":\"pwqa_btns\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-08 23:16:22\",\"session_valid_from\":\"2026-09-08 23:18:01\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-08 23:18:01\",\"created_at\":\"2026-09-08 23:16:21\",\"updated_at\":\"2026-09-08 23:18:01\"}','127.0.0.1','2026-09-08 23:18:29'),(1106,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-08 23:19:21'),(1107,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.119','2026-09-09 00:53:43'),(1108,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-09 13:12:40'),(1109,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-09 13:14:33'),(1110,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-09 13:21:23'),(1111,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-09 13:26:42'),(1112,1,4,'Admininstrator','update','Company',1,NULL,'{\"tax_system\":{\"old\":\"vat\",\"new\":\"gst\"}}','192.168.100.59','2026-09-09 13:31:04'),(1113,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-09 13:32:24'),(1114,1,147,'QA Regression Tester','create','User',324,'PWQA Reg','{\"id\":\"324\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Reg\",\"email\":\"pwqa.reg@pos-system.local\",\"username\":\"pwqa_reg\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-09 13:32:24\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-09 13:32:24\",\"updated_at\":\"2026-09-09 13:32:24\"}','127.0.0.1','2026-09-09 13:32:25'),(1115,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-09 13:32:48'),(1116,1,147,'QA Regression Tester','update','Company',1,NULL,'{\"currency\":{\"old\":\"USD\",\"new\":\"PHP\"}}','192.168.100.59','2026-09-09 13:32:58'),(1117,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-09 13:33:25'),(1118,1,147,'QA Regression Tester','update','Company',1,NULL,'{\"currency\":{\"old\":\"PHP\",\"new\":\"USD\"},\"tax_system\":{\"old\":\"gst\",\"new\":\"vat\"}}','127.0.0.1','2026-09-09 13:33:25'),(1119,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-09 13:33:36'),(1120,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-09 13:34:00'),(1121,1,147,'QA Regression Tester','update','Company',1,NULL,'{\"currency\":{\"old\":\"USD\",\"new\":\"PHP\"},\"tax_system\":{\"old\":\"vat\",\"new\":\"gst\"}}','192.168.100.59','2026-09-09 13:34:11'),(1122,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-09 13:34:31'),(1123,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-09 13:34:38'),(1127,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-09 13:37:19'),(1128,1,147,'QA Regression Tester','update','Company',1,NULL,'{\"currency\":{\"old\":\"PHP\",\"new\":\"SGD\"}}','127.0.0.1','2026-09-09 13:37:19'),(1130,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-09 13:37:46'),(1131,1,147,'QA Regression Tester','update','Company',1,NULL,'{\"currency\":{\"old\":\"SGD\",\"new\":\"USD\"},\"tax_system\":{\"old\":\"gst\",\"new\":\"vat\"}}','127.0.0.1','2026-09-09 13:37:46'),(1132,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-09 13:37:56'),(1133,1,147,'QA Regression Tester','delete','User',324,'PWQA Reg','{\"id\":\"324\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Reg\",\"email\":\"pwqa.reg@pos-system.local\",\"username\":\"pwqa_reg\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-09 13:32:24\",\"session_valid_from\":\"2026-09-09 13:37:21\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-09 13:37:21\",\"created_at\":\"2026-09-09 13:32:24\",\"updated_at\":\"2026-09-09 13:37:21\"}','127.0.0.1','2026-09-09 13:37:56'),(1134,1,4,'Admininstrator','update','Company',1,NULL,'{\"tax_system\":{\"old\":\"vat\",\"new\":\"gst\"}}','192.168.100.59','2026-09-09 13:41:34'),(1135,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 09:19:42'),(1136,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 09:21:37'),(1137,1,147,'QA Regression Tester','create','User',325,'PWQA Label','{\"id\":\"325\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Label\",\"email\":\"pwqa.label@pos-system.local\",\"username\":\"pwqa_label\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 09:21:38\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-10 09:21:37\",\"updated_at\":\"2026-09-10 09:21:37\"}','127.0.0.1','2026-09-10 09:21:38'),(1139,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 09:22:10'),(1140,1,147,'QA Regression Tester','delete','User',325,'PWQA Label','{\"id\":\"325\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Label\",\"email\":\"pwqa.label@pos-system.local\",\"username\":\"pwqa_label\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 09:21:38\",\"session_valid_from\":\"2026-09-10 09:21:54\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-10 09:21:54\",\"created_at\":\"2026-09-10 09:21:37\",\"updated_at\":\"2026-09-10 09:21:54\"}','127.0.0.1','2026-09-10 09:22:10'),(1141,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 09:28:40'),(1142,1,147,'QA Regression Tester','create','User',326,'PWQA Help','{\"id\":\"326\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Help\",\"email\":\"pwqa.help@pos-system.local\",\"username\":\"pwqa_help\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 09:28:40\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-10 09:28:40\",\"updated_at\":\"2026-09-10 09:28:40\"}','127.0.0.1','2026-09-10 09:28:40'),(1144,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 09:29:12'),(1145,1,147,'QA Regression Tester','delete','User',326,'PWQA Help','{\"id\":\"326\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Help\",\"email\":\"pwqa.help@pos-system.local\",\"username\":\"pwqa_help\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 09:28:40\",\"session_valid_from\":\"2026-09-10 09:28:58\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-10 09:28:58\",\"created_at\":\"2026-09-10 09:28:40\",\"updated_at\":\"2026-09-10 09:28:58\"}','127.0.0.1','2026-09-10 09:29:13'),(1146,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 09:32:07'),(1147,1,147,'QA Regression Tester','create','User',327,'PWQA Sku','{\"id\":\"327\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Sku\",\"email\":\"pwqa.sku@pos-system.local\",\"username\":\"pwqa_sku\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 09:32:07\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-10 09:32:07\",\"updated_at\":\"2026-09-10 09:32:07\"}','127.0.0.1','2026-09-10 09:32:07'),(1148,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 09:32:14'),(1150,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 09:33:01'),(1151,1,147,'QA Regression Tester','delete','User',327,'PWQA Sku','{\"id\":\"327\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Sku\",\"email\":\"pwqa.sku@pos-system.local\",\"username\":\"pwqa_sku\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 09:32:07\",\"session_valid_from\":\"2026-09-10 09:32:33\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-10 09:32:33\",\"created_at\":\"2026-09-10 09:32:07\",\"updated_at\":\"2026-09-10 09:32:33\"}','127.0.0.1','2026-09-10 09:33:01'),(1152,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 09:38:00'),(1153,1,147,'QA Regression Tester','create','User',328,'PWQA Void','{\"id\":\"328\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Void\",\"email\":\"pwqa.void@pos-system.local\",\"username\":\"pwqa_void\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 09:38:00\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-10 09:38:00\",\"updated_at\":\"2026-09-10 09:38:00\"}','127.0.0.1','2026-09-10 09:38:00'),(1157,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 09:39:33'),(1158,1,147,'QA Regression Tester','delete','User',328,'PWQA Void','{\"id\":\"328\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Void\",\"email\":\"pwqa.void@pos-system.local\",\"username\":\"pwqa_void\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 09:38:00\",\"session_valid_from\":\"2026-09-10 09:39:15\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-10 09:39:15\",\"created_at\":\"2026-09-10 09:38:00\",\"updated_at\":\"2026-09-10 09:39:15\"}','127.0.0.1','2026-09-10 09:39:33'),(1159,1,58,'Cashier1 101','item-void','Cart Item',NULL,'Chippy BBQ 110g','{\"item\":\"Chippy BBQ 110g\",\"quantity\":3,\"amount\":105,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-10 12:06:57'),(1160,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (23 items)','{\"item_count\":23,\"amount\":2990.5,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-10 12:09:35'),(1161,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"USD\",\"new\":\"PHP\"},\"tax_system\":{\"old\":\"gst\",\"new\":\"vat\"}}','192.168.100.59','2026-09-10 12:49:27'),(1162,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 13:28:08'),(1163,1,147,'QA Regression Tester','create','User',329,'PWQA Reason','{\"id\":\"329\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Reason\",\"email\":\"pwqa.reason@pos-system.local\",\"username\":\"pwqa_reason\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 13:28:09\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-10 13:28:08\",\"updated_at\":\"2026-09-10 13:28:08\"}','127.0.0.1','2026-09-10 13:28:09'),(1164,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 13:28:15'),(1169,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 13:29:50'),(1170,1,147,'QA Regression Tester','delete','User',329,'PWQA Reason','{\"id\":\"329\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Reason\",\"email\":\"pwqa.reason@pos-system.local\",\"username\":\"pwqa_reason\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 13:28:09\",\"session_valid_from\":\"2026-09-10 13:29:10\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-10 13:29:10\",\"created_at\":\"2026-09-10 13:28:08\",\"updated_at\":\"2026-09-10 13:29:10\"}','127.0.0.1','2026-09-10 13:29:51'),(1171,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 19:39:28'),(1172,1,147,'QA Regression Tester','create','User',330,'PWQA VoidFlow','{\"id\":\"330\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA VoidFlow\",\"email\":\"pwqa.voidflow@pos-system.local\",\"username\":\"pwqa_voidflow\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 19:39:28\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-10 19:39:28\",\"updated_at\":\"2026-09-10 19:39:28\"}','127.0.0.1','2026-09-10 19:39:28'),(1176,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 19:40:15'),(1177,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 19:40:15'),(1178,1,147,'QA Regression Tester','update','Company',1,NULL,'{\"require_item_void_approval\":{\"old\":\"0\",\"new\":\"1\"}}','127.0.0.1','2026-09-10 19:40:15'),(1180,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 19:40:47'),(1181,1,147,'QA Regression Tester','update','Company',1,NULL,'{\"require_item_void_approval\":{\"old\":\"1\",\"new\":\"0\"}}','127.0.0.1','2026-09-10 19:40:47'),(1182,1,147,'QA Regression Tester','delete','User',330,'PWQA VoidFlow','{\"id\":\"330\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA VoidFlow\",\"email\":\"pwqa.voidflow@pos-system.local\",\"username\":\"pwqa_voidflow\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 19:39:28\",\"session_valid_from\":\"2026-09-10 19:40:26\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-10 19:40:26\",\"created_at\":\"2026-09-10 19:39:28\",\"updated_at\":\"2026-09-10 19:40:26\"}','127.0.0.1','2026-09-10 19:40:47'),(1183,1,58,'Cashier1 101','item-void','Cart Item',NULL,'Great Taste White Coffee','{\"item\":\"Great Taste White Coffee\",\"quantity\":2,\"amount\":19,\"reason\":null}','192.168.100.59','2026-09-10 21:43:02'),(1184,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (13 items)','{\"item_count\":13,\"amount\":2883,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-10 21:48:49'),(1185,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 22:06:35'),(1186,1,147,'QA Regression Tester','create','Store',18,'OpeningFloatQA Store','{\"id\":\"18\",\"company_id\":\"1\",\"name\":\"OpeningFloatQA Store\",\"code\":\"OFQA-1\",\"address\":null,\"receipt_footer_note\":null,\"vat_reg_tin\":null,\"pos_serial_no\":null,\"min_no\":null,\"show_bir_details\":\"1\",\"phone\":null,\"email\":null,\"is_active\":\"1\",\"created_at\":\"2026-09-10 22:06:35\",\"updated_at\":\"2026-09-10 22:06:35\"}','127.0.0.1','2026-09-10 22:06:35'),(1187,1,147,'QA Regression Tester','create','Register',13,'QA Register','{\"id\":\"13\",\"store_id\":\"18\",\"name\":\"QA Register\",\"code\":\"QAR-1\",\"opening_float_mode\":\"fixed\",\"default_opening_float\":\"5000.00\",\"is_active\":\"1\",\"created_at\":\"2026-09-10 22:06:35\",\"updated_at\":\"2026-09-10 22:06:35\"}','127.0.0.1','2026-09-10 22:06:35'),(1188,1,147,'QA Regression Tester','create','User',331,'PWQA Float','{\"id\":\"331\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Float\",\"email\":\"pwqa.float@pos-system.local\",\"username\":\"pwqa_float\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 22:06:36\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-10 22:06:35\",\"updated_at\":\"2026-09-10 22:06:35\"}','127.0.0.1','2026-09-10 22:06:36'),(1193,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 22:09:48'),(1194,1,147,'QA Regression Tester','update','Register',13,'QA Register','{\"opening_float_mode\":{\"old\":\"fixed\",\"new\":\"fixed_confirm\"}}','127.0.0.1','2026-09-10 22:09:49'),(1195,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 22:09:55'),(1199,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 22:13:43'),(1200,1,147,'QA Regression Tester','update','Register',13,'QA Register','{\"opening_float_mode\":{\"old\":\"fixed_confirm\",\"new\":\"manual\"},\"default_opening_float\":{\"old\":\"5000.00\",\"new\":null}}','127.0.0.1','2026-09-10 22:13:43'),(1205,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 22:16:12'),(1206,1,147,'QA Regression Tester','update','Register',13,'QA Register','{\"opening_float_mode\":{\"old\":\"manual\",\"new\":\"fixed_confirm\"},\"default_opening_float\":{\"old\":null,\"new\":\"5000.00\"}}','127.0.0.1','2026-09-10 22:16:13'),(1208,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 22:16:54'),(1209,1,147,'QA Regression Tester','update','Register',13,'QA Register','{\"opening_float_mode\":{\"old\":\"fixed_confirm\",\"new\":\"manual\"},\"default_opening_float\":{\"old\":\"5000.00\",\"new\":null}}','127.0.0.1','2026-09-10 22:16:55'),(1211,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 22:17:29'),(1212,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-10 22:17:48'),(1213,1,147,'QA Regression Tester','update','Register',13,'QA Register','{\"opening_float_mode\":{\"old\":\"manual\",\"new\":\"fixed\"},\"default_opening_float\":{\"old\":null,\"new\":\"7500.00\"}}','192.168.100.59','2026-09-10 22:17:59'),(1214,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-10 22:18:31'),(1215,1,147,'QA Regression Tester','delete','User',331,'PWQA Float','{\"id\":\"331\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Float\",\"email\":\"pwqa.float@pos-system.local\",\"username\":\"pwqa_float\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-10 22:06:36\",\"session_valid_from\":\"2026-09-10 22:17:04\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-10 22:17:04\",\"created_at\":\"2026-09-10 22:06:35\",\"updated_at\":\"2026-09-10 22:17:04\"}','127.0.0.1','2026-09-10 22:18:31'),(1216,1,147,'QA Regression Tester','delete','Register',13,'QA Register','{\"id\":\"13\",\"store_id\":\"18\",\"name\":\"QA Register\",\"code\":\"QAR-1\",\"opening_float_mode\":\"fixed\",\"default_opening_float\":\"7500.00\",\"is_active\":\"1\",\"created_at\":\"2026-09-10 22:06:35\",\"updated_at\":\"2026-09-10 22:17:59\"}','127.0.0.1','2026-09-10 22:18:32'),(1217,1,147,'QA Regression Tester','delete','Store',18,'OpeningFloatQA Store','{\"id\":\"18\",\"company_id\":\"1\",\"name\":\"OpeningFloatQA Store\",\"code\":\"OFQA-1\",\"address\":null,\"receipt_footer_note\":null,\"vat_reg_tin\":null,\"pos_serial_no\":null,\"min_no\":null,\"show_bir_details\":\"1\",\"phone\":null,\"email\":null,\"is_active\":\"1\",\"created_at\":\"2026-09-10 22:06:35\",\"updated_at\":\"2026-09-10 22:06:35\"}','127.0.0.1','2026-09-10 22:18:32'),(1218,1,4,'Admininstrator','update','Register',3,'Register 1','{\"opening_float_mode\":{\"old\":\"manual\",\"new\":\"fixed\"},\"default_opening_float\":{\"old\":null,\"new\":\"3000.00\"}}','192.168.100.59','2026-09-10 22:46:19'),(1219,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 15:04:55'),(1220,1,147,'QA Regression Tester','create','User',332,'PWQA F7','{\"id\":\"332\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA F7\",\"email\":\"pwqa.f7@pos-system.local\",\"username\":\"pwqa_f7\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-11 15:04:56\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-11 15:04:55\",\"updated_at\":\"2026-09-11 15:04:55\"}','127.0.0.1','2026-09-11 15:04:56'),(1223,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 15:06:01'),(1224,1,147,'QA Regression Tester','delete','User',332,'PWQA F7','{\"id\":\"332\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA F7\",\"email\":\"pwqa.f7@pos-system.local\",\"username\":\"pwqa_f7\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-11 15:04:56\",\"session_valid_from\":\"2026-09-11 15:05:45\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-11 15:05:45\",\"created_at\":\"2026-09-11 15:04:55\",\"updated_at\":\"2026-09-11 15:05:45\"}','127.0.0.1','2026-09-11 15:06:01'),(1225,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (3 items)','{\"item_count\":3,\"amount\":431,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-11 15:35:38'),(1226,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 15:48:42'),(1227,1,147,'QA Regression Tester','create','User',333,'PWQA Help2','{\"id\":\"333\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Help2\",\"email\":\"pwqa.help2@pos-system.local\",\"username\":\"pwqa_help2\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-11 15:48:43\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-11 15:48:43\",\"updated_at\":\"2026-09-11 15:48:43\"}','127.0.0.1','2026-09-11 15:48:43'),(1230,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 15:49:42'),(1231,1,147,'QA Regression Tester','delete','User',333,'PWQA Help2','{\"id\":\"333\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Help2\",\"email\":\"pwqa.help2@pos-system.local\",\"username\":\"pwqa_help2\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-11 15:48:43\",\"session_valid_from\":\"2026-09-11 15:49:26\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-11 15:49:26\",\"created_at\":\"2026-09-11 15:48:43\",\"updated_at\":\"2026-09-11 15:49:26\"}','127.0.0.1','2026-09-11 15:49:42'),(1232,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (1 item)','{\"item_count\":1,\"amount\":45,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-11 16:11:12'),(1233,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 16:19:16'),(1234,1,147,'QA Regression Tester','create','User',334,'PWQA Lock','{\"id\":\"334\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Lock\",\"email\":\"pwqa.lock@pos-system.local\",\"username\":\"pwqa_lock\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-11 16:19:17\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-11 16:19:17\",\"updated_at\":\"2026-09-11 16:19:17\"}','127.0.0.1','2026-09-11 16:19:17'),(1235,1,147,'QA Regression Tester','update','Company',1,NULL,'{\"pos_lock_idle_minutes\":{\"old\":\"0\",\"new\":\"1\"}}','127.0.0.1','2026-09-11 16:19:17'),(1245,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 16:24:37'),(1256,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.59','2026-09-11 16:27:25'),(1257,1,147,'QA Regression Tester','update','Company',1,NULL,'{\"pos_lock_idle_minutes\":{\"old\":\"1\",\"new\":\"7\"}}','192.168.100.59','2026-09-11 16:27:32'),(1258,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 16:28:40'),(1259,1,147,'QA Regression Tester','update','Company',1,NULL,'{\"pos_lock_idle_minutes\":{\"old\":\"7\",\"new\":\"0\"}}','127.0.0.1','2026-09-11 16:28:40'),(1260,1,147,'QA Regression Tester','delete','User',334,'PWQA Lock','{\"id\":\"334\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Lock\",\"email\":\"pwqa.lock@pos-system.local\",\"username\":\"pwqa_lock\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-11 16:19:17\",\"session_valid_from\":\"2026-09-11 16:27:16\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-11 16:27:16\",\"created_at\":\"2026-09-11 16:19:17\",\"updated_at\":\"2026-09-11 16:27:16\"}','127.0.0.1','2026-09-11 16:28:40'),(1261,1,58,'Cashier1 101','unlock-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','192.168.100.59','2026-09-11 16:57:48'),(1262,1,58,'Cashier1 101','unlock-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','192.168.100.59','2026-09-11 16:57:48'),(1263,1,58,'Cashier1 101','unlock','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-11 16:57:52'),(1264,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.59','2026-09-11 16:58:57'),(1265,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-11 16:59:10'),(1266,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 17:05:00'),(1267,1,147,'QA Regression Tester','create','User',335,'PWQA Logout','{\"id\":\"335\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Logout\",\"email\":\"pwqa.logout@pos-system.local\",\"username\":\"pwqa_logout\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-11 17:05:00\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-11 17:05:00\",\"updated_at\":\"2026-09-11 17:05:00\"}','127.0.0.1','2026-09-11 17:05:00'),(1280,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 17:09:37'),(1281,1,147,'QA Regression Tester','delete','User',335,'PWQA Logout','{\"id\":\"335\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Logout\",\"email\":\"pwqa.logout@pos-system.local\",\"username\":\"pwqa_logout\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-11 17:05:00\",\"session_valid_from\":\"2026-09-11 17:09:09\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-11 17:09:09\",\"created_at\":\"2026-09-11 17:05:00\",\"updated_at\":\"2026-09-11 17:09:09\"}','127.0.0.1','2026-09-11 17:09:37'),(1282,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-11 20:16:14'),(1283,1,58,'Cashier1 101','item-void','Cart Item',NULL,'CDO Corned Beef 150g','{\"item\":\"CDO Corned Beef 150g\",\"quantity\":9,\"amount\":558,\"reason\":null}','192.168.100.225','2026-09-11 20:18:41'),(1284,1,58,'Cashier1 101','item-void','Cart Item',NULL,'Argentina Corned Beef 150g','{\"item\":\"Argentina Corned Beef 150g\",\"quantity\":1,\"amount\":55,\"reason\":null}','192.168.100.225','2026-09-11 20:18:49'),(1285,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 20:24:01'),(1286,1,147,'QA Regression Tester','create','User',336,'PWQA Hold','{\"id\":\"336\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Hold\",\"email\":\"pwqa.hold@pos-system.local\",\"username\":\"pwqa_hold\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-11 20:24:01\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-11 20:24:01\",\"updated_at\":\"2026-09-11 20:24:01\"}','127.0.0.1','2026-09-11 20:24:01'),(1288,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'127.0.0.1','2026-09-11 20:25:01'),(1289,1,147,'QA Regression Tester','delete','User',336,'PWQA Hold','{\"id\":\"336\",\"company_id\":\"1\",\"role_id\":\"4\",\"name\":\"PWQA Hold\",\"email\":\"pwqa.hold@pos-system.local\",\"username\":\"pwqa_hold\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-11 20:24:01\",\"session_valid_from\":\"2026-09-11 20:24:25\",\"phone\":null,\"is_active\":\"1\",\"last_login_at\":\"2026-09-11 20:24:25\",\"created_at\":\"2026-09-11 20:24:01\",\"updated_at\":\"2026-09-11 20:24:25\"}','127.0.0.1','2026-09-11 20:25:01'),(1290,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-11 20:39:35'),(1291,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-12 09:54:58'),(1292,1,58,'Cashier1 101','item-void','Cart Item',NULL,'33','{\"item\":\"33\",\"quantity\":1,\"amount\":22,\"reason\":null}','192.168.100.225','2026-09-12 10:05:53'),(1304,1,4,'Admininstrator','create','Category',25,'Cat 1','{\"id\":\"25\",\"company_id\":\"1\",\"parent_id\":null,\"name\":\"Cat 1\",\"description\":null,\"is_active\":\"1\",\"created_at\":\"2026-09-12 10:37:45\",\"updated_at\":\"2026-09-12 10:37:45\"}','192.168.100.59','2026-09-12 10:37:45'),(1305,1,4,'Admininstrator','create','Category',26,'Cat 2','{\"id\":\"26\",\"company_id\":\"1\",\"parent_id\":null,\"name\":\"Cat 2\",\"description\":null,\"is_active\":\"1\",\"created_at\":\"2026-09-12 10:38:10\",\"updated_at\":\"2026-09-12 10:38:10\"}','192.168.100.59','2026-09-12 10:38:10'),(1319,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-12 14:02:39'),(1321,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-12 14:07:19'),(1322,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (28 items)','{\"item_count\":28,\"amount\":5219,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-12 14:09:40'),(1324,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (4 items)','{\"item_count\":4,\"amount\":910,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-12 14:11:51'),(1327,1,58,'Cashier1 101','logout','User',58,NULL,NULL,'192.168.100.225','2026-09-12 14:20:49'),(1328,1,58,'Cashier1 101','login-failed','User',58,'Cashier1 101','{\"reason\":\"Incorrect password\"}','192.168.100.225','2026-09-12 14:21:18'),(1329,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-12 14:21:29'),(1330,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-12 14:22:00'),(1332,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (1 item)','{\"item_count\":1,\"amount\":22,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-12 14:26:06'),(1335,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.225','2026-09-12 14:34:03'),(1339,1,58,'Cashier1 101','item-void','Cart Item',NULL,'Belo Whitening Lotion 100ml','{\"item\":\"Belo Whitening Lotion 100ml\",\"quantity\":4,\"amount\":580,\"reason\":null}','192.168.100.225','2026-09-12 14:39:22'),(1349,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (34 items)','{\"item_count\":34,\"amount\":8220.5,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-12 15:05:50'),(1350,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (12 items)','{\"item_count\":12,\"amount\":76875,\"reason\":\"Customer changed mind\"}','192.168.100.225','2026-09-12 15:07:51'),(1351,1,58,'Cashier1 101','item-void','Cart Item',NULL,'All Purpose Flour 1kg','{\"item\":\"All Purpose Flour 1kg\",\"quantity\":1,\"amount\":55,\"reason\":null}','192.168.100.225','2026-09-12 15:13:26'),(1352,1,58,'Cashier1 101','item-void','Cart Item',NULL,'All Purpose Flour 1kg','{\"item\":\"All Purpose Flour 1kg\",\"quantity\":1,\"amount\":55,\"reason\":null}','192.168.100.225','2026-09-12 15:13:42'),(1353,1,58,'Cashier1 101','item-void','Cart Item',NULL,'All Purpose Flour 1kg','{\"item\":\"All Purpose Flour 1kg\",\"quantity\":3,\"amount\":165,\"reason\":null}','192.168.100.225','2026-09-12 15:16:12'),(1357,1,58,'Cashier1 101','item-void','Cart Item',NULL,'Eden Cheese 165g','{\"item\":\"Eden Cheese 165g\",\"quantity\":8,\"amount\":520,\"reason\":null}','192.168.100.225','2026-09-12 15:17:54'),(1359,1,58,'Cashier1 101','item-void','Cart Item',NULL,'Fita Crackers','{\"item\":\"Fita Crackers\",\"quantity\":1,\"amount\":25,\"reason\":null}','192.168.100.225','2026-09-12 15:18:20'),(1365,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-12 16:11:48'),(1366,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (29 items)','{\"item_count\":29,\"amount\":117290.2,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-12 16:12:06'),(1367,1,4,'Admininstrator','update','Company',1,NULL,'{\"pos_lock_idle_minutes\":{\"old\":\"0\",\"new\":\"1\"}}','192.168.100.59','2026-09-12 17:08:17'),(1368,1,58,'Cashier1 101','unlock','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-12 17:09:33'),(1369,1,4,'Admininstrator','update','Company',1,NULL,'{\"pos_lock_idle_minutes\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.59','2026-09-12 17:09:40'),(1390,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-12 17:43:54'),(1391,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-12 17:44:11'),(1396,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'::1','2026-09-13 14:47:24'),(1397,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 14:50:18'),(1398,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 14:50:50'),(1399,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PHP\",\"new\":\"PGK\"},\"tax_system\":{\"old\":\"vat\",\"new\":\"gst\"}}','192.168.100.59','2026-09-13 14:51:37'),(1400,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PGK\",\"new\":\"PHP\"},\"tax_system\":{\"old\":\"gst\",\"new\":\"vat\"}}','192.168.100.59','2026-09-13 14:51:51'),(1425,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:02:58'),(1426,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:03:30'),(1427,1,4,'Admininstrator','update','Company',1,NULL,'{\"transaction_no_reset_rule\":{\"old\":\"per_session\",\"new\":\"per_register\"},\"transaction_no_prefix\":{\"old\":null,\"new\":\"TX-\"},\"transaction_no_length\":{\"old\":\"0\",\"new\":\"4\"}}','192.168.100.59','2026-09-13 16:03:43'),(1430,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:09:06'),(1431,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:10:34'),(1432,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:15:13'),(1433,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:22:07'),(1434,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:23:07'),(1435,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:24:16'),(1436,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:24:54'),(1437,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:25:10'),(1438,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:26:14'),(1439,1,4,'Admininstrator','update','Company',1,NULL,'{\"loyalty_points_per_100\":{\"old\":\"0\",\"new\":\"3\"}}','192.168.100.59','2026-09-13 16:26:30'),(1440,1,4,'Admininstrator','update','Company',1,NULL,'{\"loyalty_points_per_100\":{\"old\":\"3\",\"new\":\"0\"}}','192.168.100.59','2026-09-13 16:26:35'),(1441,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:26:59'),(1442,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:27:51'),(1444,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PHP\",\"new\":\"PGK\"},\"tax_system\":{\"old\":\"vat\",\"new\":\"gst\"}}','192.168.100.59','2026-09-13 16:32:49'),(1445,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PGK\",\"new\":\"PHP\"},\"tax_system\":{\"old\":\"gst\",\"new\":\"vat\"}}','192.168.100.59','2026-09-13 16:33:04'),(1446,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:34:15'),(1447,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PHP\",\"new\":\"PGK\"},\"tax_system\":{\"old\":\"vat\",\"new\":\"gst\"}}','192.168.100.59','2026-09-13 16:34:25'),(1448,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:35:01'),(1449,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PGK\",\"new\":\"PHP\"},\"tax_system\":{\"old\":\"gst\",\"new\":\"vat\"}}','192.168.100.59','2026-09-13 16:35:11'),(1450,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:37:27'),(1451,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PHP\",\"new\":\"PGK\"},\"tax_system\":{\"old\":\"vat\",\"new\":\"gst\"}}','192.168.100.59','2026-09-13 16:37:38'),(1452,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PGK\",\"new\":\"PHP\"},\"tax_system\":{\"old\":\"gst\",\"new\":\"vat\"}}','192.168.100.59','2026-09-13 16:37:42'),(1453,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 16:39:10'),(1454,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PHP\",\"new\":\"PGK\"},\"tax_system\":{\"old\":\"vat\",\"new\":\"gst\"}}','192.168.100.59','2026-09-13 16:39:21'),(1455,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PGK\",\"new\":\"PHP\"},\"tax_system\":{\"old\":\"gst\",\"new\":\"vat\"}}','192.168.100.59','2026-09-13 16:39:26'),(1456,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PHP\",\"new\":\"PGK\"},\"tax_system\":{\"old\":\"vat\",\"new\":\"gst\"}}','192.168.100.59','2026-09-13 16:43:21'),(1457,1,4,'Admininstrator','update','Company',1,NULL,'{\"currency\":{\"old\":\"PGK\",\"new\":\"PHP\"},\"tax_system\":{\"old\":\"gst\",\"new\":\"vat\"}}','192.168.100.59','2026-09-13 16:43:26'),(1458,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-13 17:22:18'),(1463,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'127.0.0.1','2026-09-13 17:23:57'),(1464,1,4,'Admininstrator','create','Z-Reading',1,'Z #1 — Register 1','{\"id\":\"1\",\"company_id\":\"1\",\"store_id\":\"3\",\"register_id\":\"3\",\"z_counter\":\"1\",\"reset_counter\":\"0\",\"business_date\":\"2026-09-13\",\"covers_from\":\"1970-01-01 00:00:00\",\"covers_to\":\"2026-09-13 17:23:57\",\"min_no\":\"MIN-2024-0001-0101\",\"pos_serial_no\":\"SN2024EX00101\",\"ptu_number\":\"PTU-2026-0001-0101\",\"beginning_invoice_number\":\"INV-2026-00000013\",\"ending_invoice_number\":\"INV-2026-00000014\",\"beginning_grand_total\":\"0.00\",\"ending_grand_total\":\"130.00\",\"transaction_count\":\"2\",\"gross_sales\":\"130.00\",\"discount_total\":\"0.00\",\"net_sales\":\"130.00\",\"vatable_sales\":\"58.04\",\"vat_amount\":\"6.96\",\"vat_exempt_sales\":\"0.00\",\"zero_rated_sales\":\"0.00\",\"non_vat_sales\":\"65.00\",\"sc_discount_total\":\"0.00\",\"pwd_discount_total\":\"0.00\",\"bnpc_discount_total\":\"0.00\",\"other_discount_total\":\"0.00\",\"void_count\":\"0\",\"void_total\":\"0.00\",\"return_count\":\"0\",\"return_total\":\"0.00\",\"generated_by\":\"4\",\"created_at\":\"2026-09-13 17:23:57\",\"updated_at\":\"2026-09-13 17:23:57\"}','127.0.0.1','2026-09-13 17:23:57'),(1465,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'127.0.0.1','2026-09-13 17:25:02'),(1466,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'127.0.0.1','2026-09-13 17:25:09'),(1467,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'127.0.0.1','2026-09-13 17:25:26'),(1468,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'127.0.0.1','2026-09-14 07:43:49'),(1469,1,4,'Admininstrator','create','Z-Reading',2,'Z #2 — Register 1','{\"id\":\"2\",\"company_id\":\"1\",\"store_id\":\"3\",\"register_id\":\"3\",\"z_counter\":\"2\",\"reset_counter\":\"0\",\"business_date\":\"2026-09-14\",\"covers_from\":\"2026-09-13 17:23:57\",\"covers_to\":\"2026-09-14 07:48:51\",\"min_no\":\"MIN-2024-0001-0101\",\"pos_serial_no\":\"SN2024EX00101\",\"ptu_number\":\"PTU-2026-0001-0101\",\"beginning_invoice_number\":null,\"ending_invoice_number\":null,\"beginning_grand_total\":\"130.00\",\"ending_grand_total\":\"130.00\",\"transaction_count\":\"0\",\"gross_sales\":\"0.00\",\"discount_total\":\"0.00\",\"net_sales\":\"0.00\",\"vatable_sales\":\"0.00\",\"vat_amount\":\"0.00\",\"vat_exempt_sales\":\"0.00\",\"zero_rated_sales\":\"0.00\",\"non_vat_sales\":\"0.00\",\"sc_discount_total\":\"0.00\",\"pwd_discount_total\":\"0.00\",\"bnpc_discount_total\":\"0.00\",\"other_discount_total\":\"0.00\",\"void_count\":\"0\",\"void_total\":\"0.00\",\"return_count\":\"0\",\"return_total\":\"0.00\",\"generated_by\":\"4\",\"created_at\":\"2026-09-14 07:48:51\",\"updated_at\":\"2026-09-14 07:48:51\"}','192.168.100.59','2026-09-14 07:48:51'),(1470,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-14 07:52:36'),(1471,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-14 08:00:08'),(1472,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'127.0.0.1','2026-09-14 08:00:43'),(1473,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'127.0.0.1','2026-09-14 08:00:52'),(1476,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'127.0.0.1','2026-09-14 08:01:32'),(1477,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-14 08:01:39'),(1478,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-14 08:04:20'),(1479,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-14 08:04:26'),(1480,1,4,'Admininstrator','login-failed','User',4,'Admininstrator','{\"reason\":\"Incorrect password\"}','192.168.100.59','2026-09-14 08:11:57'),(1481,1,4,'Admininstrator','login-failed','User',4,'Admininstrator','{\"reason\":\"Incorrect password\"}','127.0.0.1','2026-09-14 08:12:58'),(1482,1,4,'Admininstrator','login-failed','User',4,'Admininstrator','{\"reason\":\"Incorrect password\"}','127.0.0.1','2026-09-14 08:13:12'),(1494,1,58,'Cashier1 101','cart-void','Cart',NULL,'Entire cart (1 item)','{\"item_count\":1,\"amount\":175,\"reason\":\"Customer changed mind\"}','192.168.100.59','2026-09-14 12:01:32'),(1499,1,4,'Admininstrator','update','Company',1,NULL,'{\"is_bir_registered\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.59','2026-09-14 13:21:14'),(1500,1,4,'Admininstrator','reset','System Configuration',1,'Configuration reset to a new-setup state',NULL,'192.168.100.59','2026-09-14 13:40:42'),(1501,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.59','2026-09-14 13:41:27'),(1509,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.59','2026-09-14 16:16:22'),(1510,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-14 16:16:32'),(1511,1,58,'Cashier1 101','login','User',58,'Cashier1 101',NULL,'192.168.100.59','2026-09-14 21:50:32'),(1512,1,4,'Admininstrator','login-failed','User',4,'Admininstrator','{\"reason\":\"Incorrect password\"}','192.168.100.59','2026-09-15 11:10:54');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `cash_movements`
--

LOCK TABLES `cash_movements` WRITE;
/*!40000 ALTER TABLE `cash_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_movements` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `cash_sessions`
--

LOCK TABLES `cash_sessions` WRITE;
/*!40000 ALTER TABLE `cash_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_sessions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (10,1,NULL,'Beverages','Soft drinks, juices, water, and other drinks',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(11,1,NULL,'Snacks & Chips','Chips, crackers, and packaged snacks',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(12,1,NULL,'Grocery & Canned Goods','Rice, canned goods, condiments, and pantry staples',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(13,1,NULL,'Personal Care','Toiletries, hygiene, and personal care products',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(14,1,NULL,'Household Supplies','Cleaning supplies and household essentials',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(15,1,NULL,'Frozen & Chilled','Frozen goods, dairy, and chilled items',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(16,1,NULL,'Bakery','Bread, pastries, and baked goods',1,'2026-08-24 01:01:32','2026-09-15 16:32:01'),(17,1,NULL,'School & Office Supplies','Stationery and office essentials',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(18,1,NULL,'Tobacco & Alcohol','Cigarettes, beer, and alcoholic beverages',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(19,1,NULL,'Others','Miscellaneous items not covered by other categories',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(25,1,NULL,'Cat 1',NULL,1,'2026-09-12 10:37:45','2026-09-12 10:37:45'),(26,1,NULL,'Cat 2',NULL,1,'2026-09-12 10:38:10','2026-09-12 10:38:10');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `category_discount_eligibility`
--

LOCK TABLES `category_discount_eligibility` WRITE;
/*!40000 ALTER TABLE `category_discount_eligibility` DISABLE KEYS */;
/*!40000 ALTER TABLE `category_discount_eligibility` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (1,'Default Company',NULL,NULL,0,NULL,1,NULL,NULL,NULL,'PHP','vat',0,'per_session',NULL,0,'UTC',0,0,1,1,NULL,NULL,NULL,NULL,NULL,1,'2026-08-16 16:41:35','2026-09-14 13:40:42');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (4,1,'2026080000000001','Customer 1','12','Customer 1 12',NULL,NULL,'45 Bonifacio St, Cebu','111-222-333-000','Sari-Sari Store',0.00,1,'2026-08-22 17:28:11','2026-08-27 20:01:29');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `inventory_transactions`
--

LOCK TABLES `inventory_transactions` WRITE;
/*!40000 ALTER TABLE `inventory_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_transactions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `invoice_sequences`
--

LOCK TABLES `invoice_sequences` WRITE;
/*!40000 ALTER TABLE `invoice_sequences` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_sequences` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `invoice_series`
--

LOCK TABLES `invoice_series` WRITE;
/*!40000 ALTER TABLE `invoice_series` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_series` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `loyalty_cards`
--

LOCK TABLES `loyalty_cards` WRITE;
/*!40000 ALTER TABLE `loyalty_cards` DISABLE KEYS */;
INSERT INTO `loyalty_cards` VALUES (2,4,'LC-286EA9821EFB','active',0,0.00,'2026-08-22 17:28:11','2026-08-22 17:28:11',NULL,'2026-08-22 17:28:11','2026-08-22 17:28:11');
/*!40000 ALTER TABLE `loyalty_cards` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `loyalty_point_transactions`
--

LOCK TABLES `loyalty_point_transactions` WRITE;
/*!40000 ALTER TABLE `loyalty_point_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `loyalty_point_transactions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2026-08-15-000001','App\\Database\\Migrations\\CreateCompanies','default','App',1786898482,1),(2,'2026-08-15-000002','App\\Database\\Migrations\\CreateStores','default','App',1786898482,1),(3,'2026-08-15-000003','App\\Database\\Migrations\\CreateRoles','default','App',1786898482,1),(4,'2026-08-15-000004','App\\Database\\Migrations\\CreatePermissions','default','App',1786898482,1),(5,'2026-08-15-000005','App\\Database\\Migrations\\CreateRolePermissions','default','App',1786898482,1),(6,'2026-08-15-000006','App\\Database\\Migrations\\CreateUsers','default','App',1786898482,1),(7,'2026-08-15-000007','App\\Database\\Migrations\\CreateUserStores','default','App',1786898482,1),(8,'2026-08-15-000008','App\\Database\\Migrations\\CreateRegisters','default','App',1786898482,1),(9,'2026-08-15-000009','App\\Database\\Migrations\\CreateCashSessions','default','App',1786898482,1),(10,'2026-08-15-000010','App\\Database\\Migrations\\CreateUnits','default','App',1786898482,1),(11,'2026-08-15-000011','App\\Database\\Migrations\\CreateCategories','default','App',1786898482,1),(12,'2026-08-15-000012','App\\Database\\Migrations\\CreateTaxRates','default','App',1786898482,1),(13,'2026-08-15-000013','App\\Database\\Migrations\\CreateProducts','default','App',1786898482,1),(14,'2026-08-15-000014','App\\Database\\Migrations\\CreateProductPrices','default','App',1786898482,1),(15,'2026-08-15-000015','App\\Database\\Migrations\\CreateInventory','default','App',1786898482,1),(16,'2026-08-15-000016','App\\Database\\Migrations\\CreateInventoryTransactions','default','App',1786898482,1),(17,'2026-08-15-000017','App\\Database\\Migrations\\CreateCustomers','default','App',1786898482,1),(18,'2026-08-15-000018','App\\Database\\Migrations\\CreateLoyaltyCards','default','App',1786898482,1),(19,'2026-08-15-000019','App\\Database\\Migrations\\CreateSuppliers','default','App',1786898482,1),(20,'2026-08-15-000020','App\\Database\\Migrations\\CreatePurchaseOrders','default','App',1786898482,1),(21,'2026-08-15-000021','App\\Database\\Migrations\\CreatePurchaseOrderItems','default','App',1786898482,1),(22,'2026-08-15-000022','App\\Database\\Migrations\\CreateSales','default','App',1786898482,1),(23,'2026-08-15-000023','App\\Database\\Migrations\\CreateSaleItems','default','App',1786898482,1),(24,'2026-08-15-000024','App\\Database\\Migrations\\CreatePayments','default','App',1786898482,1),(25,'2026-08-15-000025','App\\Database\\Migrations\\CreateReturns','default','App',1786898482,1),(26,'2026-08-15-000026','App\\Database\\Migrations\\CreateReturnItems','default','App',1786898482,1),(27,'2026-08-15-000027','App\\Database\\Migrations\\CreateInvoiceSequences','default','App',1786898482,1),(28,'2026-08-15-000028','App\\Database\\Migrations\\AddLoginSecurityToUsers','default','App',1786898482,1),(29,'2026-08-15-000029','App\\Database\\Migrations\\CreateRevokedTokens','default','App',1786898482,1),(30,'2026-08-15-000030','App\\Database\\Migrations\\UpdateCompanyFields','default','App',1786898482,1),(31,'2026-08-15-000031','App\\Database\\Migrations\\EnforceCompanyTradeNameNotNull','default','App',1786898482,1),(32,'2026-08-16-000032','App\\Database\\Migrations\\AddPasswordChangedAtToUsers','default','App',1786898482,1),(33,'2026-08-16-000033','App\\Database\\Migrations\\AddPrecisionToUnits','default','App',1786898482,1),(34,'2026-08-16-000034','App\\Database\\Migrations\\AddSellingPriceAndMinStockToProducts','default','App',1786898482,1),(35,'2026-08-16-000035','App\\Database\\Migrations\\AddTaxRateIdToLineItems','default','App',1786898483,1),(36,'2026-08-16-000036','App\\Database\\Migrations\\SplitTransferTransactionType','default','App',1786898483,1),(37,'2026-08-16-000037','App\\Database\\Migrations\\UpdateCustomerFields','default','App',1786898483,1),(38,'2026-08-16-000038','App\\Database\\Migrations\\UpdateLoyaltyCardFields','default','App',1786898483,1),(39,'2026-08-16-000039','App\\Database\\Migrations\\EnforceCustomerNameFieldsNotNull','default','App',1786898483,1),(40,'2026-08-16-000040','App\\Database\\Migrations\\AddApprovalToPurchaseOrders','default','App',1786898483,1),(41,'2026-08-16-000041','App\\Database\\Migrations\\AddBaggerIdToSales','default','App',1786898483,1),(42,'2026-08-16-000042','App\\Database\\Migrations\\UpdatePaymentMethods','default','App',1786898483,1),(43,'2026-08-16-000043','App\\Database\\Migrations\\CreateCashMovements','default','App',1786898483,1),(44,'2026-08-16-000044','App\\Database\\Migrations\\AddInvoiceSnapshotFields','default','App',1786898483,1),(45,'2026-08-16-000045','App\\Database\\Migrations\\AddApprovalToReturns','default','App',1786898483,1),(46,'2026-08-16-000046','App\\Database\\Migrations\\AddPerformanceIndexes','default','App',1786898483,1),(47,'2026-08-16-000047','App\\Database\\Migrations\\MakeSalesReportIndexCovering','default','App',1786898483,1),(48,'2026-08-16-000048','App\\Database\\Migrations\\MakeSaleItemsJoinIndexCovering','default','App',1786898483,1),(49,'2026-08-18-000049','App\\Database\\Migrations\\DropUnusedProductPrices','default','App',1787055928,2),(50,'2026-08-18-000050','App\\Database\\Migrations\\CreateStoreProductPrices','default','App',1787055928,2),(51,'2026-08-18-000051','App\\Database\\Migrations\\DropProductPriceColumns','default','App',1787055928,2),(52,'2026-08-23-000052','App\\Database\\Migrations\\CreateLoyaltyPointTransactions','default','App',1787420901,3),(54,'2026-08-25-000053','App\\Database\\Migrations\\AddImagePathToProducts','default','App',1787727557,4),(55,'2026-08-27-000054','App\\Database\\Migrations\\AddLoyaltyPointsRateToCompanies','default','App',1787858638,5),(56,'2026-08-28-000055','App\\Database\\Migrations\\CreateAuditLogs','default','App',1787945267,6),(57,'2026-08-30-000056','App\\Database\\Migrations\\CreatePaymentMethods','default','App',1788099865,7),(58,'2026-08-30-000057','App\\Database\\Migrations\\SeedPaymentMethodsAndWidenPaymentsMethod','default','App',1788099865,7),(59,'2026-08-30-000058','App\\Database\\Migrations\\GrantPaymentMethodPermissionsToExistingRoles','default','App',1788099926,8),(60,'2026-08-31-000059','App\\Database\\Migrations\\MakeSaleItemsProductIdNullable','default','App',1788110247,9),(61,'2026-08-31-000060','App\\Database\\Migrations\\GrantCategoriesViewToExistingCashierRole','default','App',1788110247,9),(62,'2026-09-01-000061','App\\Database\\Migrations\\AddRequireVoidApprovalToCompanies','default','App',1788290078,10),(63,'2026-09-01-000062','App\\Database\\Migrations\\SplitVoidApprovalSettings','default','App',1788297876,11),(64,'2026-09-02-000063','App\\Database\\Migrations\\AddSessionValidFromToUsers','default','App',1788339179,12),(65,'2026-09-02-000064','App\\Database\\Migrations\\AddReceiptHeaderNoteToStores','default','App',1788363316,13),(66,'2026-09-02-000065','App\\Database\\Migrations\\AddBirPosFieldsToStores','default','App',1788365698,14),(67,'2026-09-02-000066','App\\Database\\Migrations\\AddShowBirDetailsToStores','default','App',1788366054,15),(68,'2026-09-02-000067','App\\Database\\Migrations\\AddShowBirDetailsToSales','default','App',1788367132,16),(69,'2026-09-02-000068','App\\Database\\Migrations\\RenameReceiptHeaderNoteToFooter','default','App',1788370013,17),(70,'2026-09-07-000069','App\\Database\\Migrations\\AddDiscountTypeToSaleItems','default','App',1788711204,18),(71,'2026-09-07-000070','App\\Database\\Migrations\\AddDiscountHolderToSales','default','App',1788711204,18),(72,'2026-09-07-000071','App\\Database\\Migrations\\AddRequireManualDiscountApprovalToCompanies','default','App',1788711204,18),(73,'2026-09-07-000072','App\\Database\\Migrations\\AddSalesDiscountPermission','default','App',1788711204,18),(74,'2026-09-07-000073','App\\Database\\Migrations\\AddDiscountDefaultsToCompanies','default','App',1788713073,19),(75,'2026-09-08-000074','App\\Database\\Migrations\\CreateDiscountEligibilityTables','default','App',1788714790,20),(77,'2026-09-09-000075','App\\Database\\Migrations\\AddTaxSystemToCompanies','default','App',1788960395,21),(78,'2026-09-09-000076','App\\Database\\Migrations\\AddTaxSystemToTaxRates','default','App',1789031958,22),(79,'2026-09-11-000077','App\\Database\\Migrations\\AddOpeningFloatToRegisters','default','App',1789077440,23),(80,'2026-09-12-000078','App\\Database\\Migrations\\AddPosLockIdleMinutesToCompanies','default','App',1789142917,24),(81,'2026-09-13-000079','App\\Database\\Migrations\\CreateInvoiceSeries','default','App',1789232699,25),(82,'2026-09-13-000080','App\\Database\\Migrations\\BackfillInvoiceSeriesFromSequences','default','App',1789232699,25),(83,'2026-09-13-000081','App\\Database\\Migrations\\GrantInvoiceSeriesPermissionsToExistingRoles','default','App',1789232699,25),(84,'2026-09-13-000082','App\\Database\\Migrations\\AddTransactionNoToSalesAndCashSessions','default','App',1789312725,26),(85,'2026-09-13-000083','App\\Database\\Migrations\\AddTransactionNumberSettingsToCompanies','default','App',1789315017,27),(86,'2026-09-13-000084','App\\Database\\Migrations\\CreateTransactionCounters','default','App',1789315017,27),(87,'2026-09-13-000085','App\\Database\\Migrations\\ReworkTransactionNoOnSales','default','App',1789315017,27),(88,'2026-09-14-000086','App\\Database\\Migrations\\AddBirAccreditationFields','default','App',1789318866,28),(89,'2026-09-14-000087','App\\Database\\Migrations\\CreateZReadings','default','App',1789318866,28),(90,'2026-09-14-000088','App\\Database\\Migrations\\GrantReadingPermissionsToExistingRoles','default','App',1789319198,29),(91,'2026-09-14-000089','App\\Database\\Migrations\\AddBirRegisteredToCompanies','default','App',1789390677,30);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES (14,1,'Cash','cash',1,'2026-09-14 13:40:42','2026-09-14 13:40:42');
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'View Products','products.view','Can view product records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(2,'Create Products','products.create','Can create new products','2026-08-16 16:41:35','2026-08-16 16:41:35'),(3,'Update Products','products.update','Can edit existing products','2026-08-16 16:41:35','2026-08-16 16:41:35'),(4,'Delete Products','products.delete','Can delete products','2026-08-16 16:41:35','2026-08-16 16:41:35'),(5,'View Inventory','inventory.view','Can view stock levels','2026-08-16 16:41:35','2026-08-16 16:41:35'),(6,'Adjust Inventory','inventory.adjust','Can make manual stock adjustments','2026-08-16 16:41:35','2026-08-16 16:41:35'),(7,'Transfer Inventory','inventory.transfer','Can transfer stock between stores','2026-08-16 16:41:35','2026-08-16 16:41:35'),(8,'Create Sales','sales.create','Can ring up new sales','2026-08-16 16:41:35','2026-08-16 16:41:35'),(9,'View Sales','sales.view','Can view sales history','2026-08-16 16:41:35','2026-08-16 16:41:35'),(10,'Void Sales','sales.void','Can void a sale','2026-08-16 16:41:35','2026-08-16 16:41:35'),(11,'Refund Sales','sales.refund','Can process a refund','2026-08-16 16:41:35','2026-08-16 16:41:35'),(12,'View Customers','customers.view','Can view customer records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(13,'Create Customers','customers.create','Can create new customers','2026-08-16 16:41:35','2026-08-16 16:41:35'),(14,'Update Customers','customers.update','Can edit existing customers','2026-08-16 16:41:35','2026-08-16 16:41:35'),(15,'View Loyalty','loyalty.view','Can view loyalty card balances and points','2026-08-16 16:41:35','2026-08-16 16:41:35'),(16,'Manage Loyalty','loyalty.manage','Can issue cards and adjust points/balance','2026-08-16 16:41:35','2026-08-16 16:41:35'),(17,'View Reports','reports.view','Can view sales and inventory reports','2026-08-16 16:41:35','2026-08-16 16:41:35'),(18,'View Users','users.view','Can view user accounts','2026-08-16 16:41:35','2026-08-16 16:41:35'),(19,'Create Users','users.create','Can create new user accounts','2026-08-16 16:41:35','2026-08-16 16:41:35'),(20,'Update Users','users.update','Can edit existing user accounts','2026-08-16 16:41:35','2026-08-16 16:41:35'),(21,'View Stores','stores.view','Can view store records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(22,'Manage Stores','stores.manage','Can create and edit stores','2026-08-16 16:41:35','2026-08-16 16:41:35'),(23,'View Companies','companies.view','Can view company records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(24,'Manage Companies','companies.manage','Can create and edit companies','2026-08-16 16:41:35','2026-08-16 16:41:35'),(25,'View Roles','roles.view','Can view roles and their permissions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(26,'Manage Roles','roles.manage','Can create/edit roles and assign permissions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(27,'View Categories','categories.view','Can view product categories','2026-08-16 16:41:35','2026-08-16 16:41:35'),(28,'Manage Categories','categories.manage','Can create and edit categories','2026-08-16 16:41:35','2026-08-16 16:41:35'),(29,'View Units','units.view','Can view units of measure','2026-08-16 16:41:35','2026-08-16 16:41:35'),(30,'Manage Units','units.manage','Can create and edit units of measure','2026-08-16 16:41:35','2026-08-16 16:41:35'),(31,'View Taxes','taxes.view','Can view tax rate configuration','2026-08-16 16:41:35','2026-08-16 16:41:35'),(32,'Manage Taxes','taxes.manage','Can create and edit tax rates','2026-08-16 16:41:35','2026-08-16 16:41:35'),(33,'View Suppliers','suppliers.view','Can view supplier records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(34,'Manage Suppliers','suppliers.manage','Can create and edit suppliers','2026-08-16 16:41:35','2026-08-16 16:41:35'),(35,'View Purchases','purchases.view','Can view purchase orders','2026-08-16 16:41:35','2026-08-16 16:41:35'),(36,'Create Purchases','purchases.create','Can create purchase orders','2026-08-16 16:41:35','2026-08-16 16:41:35'),(37,'Manage Purchases','purchases.manage','Can edit and receive purchase orders','2026-08-16 16:41:35','2026-08-16 16:41:35'),(38,'View POS Terminals','registers.view','Can view POS terminals','2026-08-16 16:41:35','2026-08-31 14:23:03'),(39,'Manage POS Terminals','registers.manage','Can create and edit POS terminals','2026-08-16 16:41:35','2026-08-31 14:23:03'),(40,'View Cash Sessions','cash-sessions.view','Can view cash drawer sessions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(41,'Manage Cash Sessions','cash-sessions.manage','Can open and close cash drawer sessions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(42,'View Payments','payments.view','Can view sale payments','2026-08-16 16:41:35','2026-08-16 16:41:35'),(43,'View Returns','returns.view','Can view sales returns','2026-08-16 16:41:35','2026-08-16 16:41:35'),(44,'Create Returns','returns.create','Can request a sales return','2026-08-16 16:41:35','2026-08-16 16:41:35'),(45,'Approve Returns','returns.approve','Can approve a pending return, issuing the refund and restocking inventory','2026-08-16 16:41:35','2026-08-16 16:41:35'),(46,'View Dashboard','dashboard.view','Can view the dashboard\'s daily snapshot','2026-08-22 16:01:35','2026-08-22 16:01:35'),(47,'View Audit Trail','audit.view','Can view the audit trail of who did what, and when','2026-08-28 19:27:52','2026-08-28 19:27:52'),(48,'View Payment Methods','payment-methods.view','Can view the payment methods offered at checkout','2026-08-30 14:24:37','2026-08-30 14:24:37'),(49,'Manage Payment Methods','payment-methods.manage','Can add, rename, and activate/deactivate payment methods','2026-08-30 14:24:37','2026-08-30 14:24:37'),(50,'Approve Discounts','sales.discount','Can approve a manual/discretionary discount that falls outside the standard discount types','2026-09-06 16:13:24','2026-09-06 16:13:24'),(51,'View Invoice Series','invoice-series.view','Can view sales invoice numbering series and their configuration','2026-09-12 17:04:59','2026-09-12 17:04:59'),(52,'Manage Invoice Series','invoice-series.manage','Can create, edit, activate, and deactivate sales invoice numbering series','2026-09-12 17:04:59','2026-09-12 17:04:59'),(53,'View X/Z Readings','readings.view','Can take an X-reading and view issued Z-readings','2026-09-13 17:06:38','2026-09-13 17:06:38'),(54,'Generate Z-Readings','readings.manage','Can close the period and issue a Z-reading','2026-09-13 17:06:38','2026-09-13 17:06:38');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `product_discount_eligibility`
--

LOCK TABLES `product_discount_eligibility` WRITE;
/*!40000 ALTER TABLE `product_discount_eligibility` DISABLE KEYS */;
INSERT INTO `product_discount_eligibility` VALUES (4,237,'senior_citizen',1,'2026-09-07 20:24:04','2026-09-07 20:24:04'),(5,179,'senior_citizen',1,'2026-09-07 20:26:53','2026-09-07 20:26:53');
/*!40000 ALTER TABLE `product_discount_eligibility` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (6,1,10,1,NULL,'BEV-0001','4800000000011','Coca-Cola 1.5L','Soft drink, 1.5 liter bottle','uploads/products/6_f6d1c7b55f6a3c87.png',20.0000,1,1,'2026-08-24 03:27:00','2026-08-31 10:17:30'),(8,1,10,1,NULL,'BEV-0003','4800000000035','Nescafe 3-in-1 Coffee Sachet','Instant coffee mix, single sachet',NULL,50.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(9,1,10,1,NULL,'BEV-0004','4800000000042','Bottled Water 500ml','Purified drinking water 500','uploads/products/9_c127099dfb89c0cc.png',50.0000,1,1,'2026-08-24 03:27:00','2026-08-30 09:39:06'),(10,1,10,1,NULL,'BEV-0005','4800000000059','C2 Green Tea 500ml','Ready-to-drink green tea',NULL,20.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(11,1,11,1,NULL,'SNK-0001','4800000000066','Piattos Cheese 85g','Potato chips, cheese flavor',NULL,20.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(13,1,11,1,NULL,'SNK-0003','4800000000080','Skyflakes Crackers','Soda crackers, pack',NULL,30.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(14,1,12,1,NULL,'GRO-0001','4800000000097','Jasmine Rice 5kg','Well-milled jasmine rice, 5kg bag','uploads/products/14_3a1db7c239d0a527.png',10.0000,1,1,'2026-08-24 03:27:00','2026-08-31 10:17:30'),(15,1,12,1,NULL,'GRO-0002','4800000000103','Century Tuna Flakes in Oil 155g','Canned tuna flakes in oil',NULL,30.0000,1,1,'2026-08-24 03:27:00','2026-08-30 09:50:26'),(16,1,12,1,NULL,'GRO-0003','4800000000110','Datu Puti Soy Sauce 1L','Soy sauce, 1 liter bottle',NULL,15.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(18,1,13,1,NULL,'PC-0001','4800000000134','Safeguard Soap 90g','Antibacterial bar soap','uploads/products/18_df2be17ee4286e28.png',30.0000,1,1,'2026-08-24 03:27:00','2026-08-31 10:17:30'),(19,1,13,1,NULL,'PC-0002','4800000000141','Colgate Toothpaste 150g','Fluoride toothpaste',NULL,30.0000,1,1,'2026-08-24 03:27:00','2026-08-28 16:52:07'),(20,1,13,1,NULL,'PC-0003','4800000000158','Palmolive Shampoo Sachet','Shampoo, single-use sachet',NULL,50.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(22,1,14,1,NULL,'HH-0002','4800000000172','Joy Dishwashing Liquid 250ml','Dishwashing liquid, lemon scent',NULL,15.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(23,1,15,1,NULL,'FRZ-0001','4800000000189','Purefoods Tender Juicy Hotdog 1kg','Frozen hotdog, 1kg pack',NULL,10.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(24,1,15,1,NULL,'FRZ-0002','4800000000196','CDO Corned Beef 150g','Canned corned beef','uploads/products/24_a40886f113759a5d.png',20.0000,1,1,'2026-08-24 03:27:00','2026-08-28 18:32:59'),(25,1,16,1,NULL,'BAK-0001','4800000000202','Pandesal (Pack of 10)','Freshly baked bread rolls','uploads/products/25_24ba20a7e3cd34a0.png',15.0000,1,1,'2026-08-24 03:27:00','2026-08-31 10:17:30'),(26,1,16,1,NULL,'BAK-0002','4800000000219','Gardenia Wheat Bread','Sliced wheat bread loaf','uploads/products/26_c6110ccfa2fdc2aa.png',10.0000,1,1,'2026-08-24 03:27:00','2026-08-31 10:17:30'),(27,1,17,1,NULL,'SCH-0001','4800000000226','Ballpen Black','Ballpoint pen, black ink',NULL,50.0000,0,1,'2026-08-24 03:27:00','2026-08-27 18:53:17'),(28,1,17,1,NULL,'SCH-0002','4800000000233','Spiral Notebook 80 Leaves','Spiral-bound notebook',NULL,20.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(29,1,18,1,NULL,'TOB-0001','4800000000240','Red Horse Beer 1L','Strong beer, 1 liter bottle',NULL,15.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(30,1,18,1,NULL,'TOB-0002','4800000000257','Marlboro Red Pack','Cigarettes, pack of 20',NULL,20.0000,1,1,'2026-08-24 03:27:00','2026-08-24 03:27:00'),(66,1,NULL,NULL,NULL,'SCH-0001a','4800000000042aa','sdf',NULL,NULL,0.0000,1,1,'2026-08-29 15:15:29','2026-08-29 15:15:29'),(108,1,10,1,NULL,'ABC-001','1234567890123','Sample Product',NULL,NULL,5.0000,1,1,'2026-08-29 17:16:06','2026-08-29 17:16:06'),(116,1,10,1,NULL,'11111','11001111','aa',NULL,NULL,5.0000,1,1,'2026-08-29 17:31:25','2026-08-29 17:31:25'),(117,1,16,1,NULL,'22222','220022222','aa',NULL,NULL,5.0000,1,1,'2026-08-29 17:31:25','2026-08-29 17:31:25'),(121,1,16,1,NULL,'BEV-00042','4.8E+12','aa',NULL,NULL,6.0000,1,1,'2026-08-29 17:31:57','2026-08-29 17:31:57'),(133,1,10,1,NULL,'BEV-0006','4800000001001','Sprite 1.5L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(134,1,10,1,NULL,'BEV-0007','4800000001002','Royal Tru-Orange 1.5L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(135,1,10,1,NULL,'BEV-0008','4800000001003','Nescafe Classic 3-in-1 Twin Pack',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(136,1,10,1,NULL,'BEV-0009','4800000001004','Milo Champion 33g Sachet',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(137,1,10,1,NULL,'BEV-0010','4800000001005','Kopiko Brown Coffee 3-in-1',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(138,1,10,1,NULL,'BEV-0011','4800000001006','Great Taste White Coffee',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(139,1,10,1,NULL,'BEV-0012','4800000001007','Tang Orange Powdered Juice 25g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(140,1,10,1,NULL,'BEV-0013','4800000001008','Zesto Orange Juice 250ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(141,1,10,1,NULL,'BEV-0014','4800000001009','Wilkins Distilled Water 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(142,1,10,1,NULL,'BEV-0015','4800000001010','San Miguel Pale Pilsen 330ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(143,1,10,1,NULL,'BEV-0016','4800000001011','Sting Energy Drink 500ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(144,1,10,1,NULL,'BEV-0017','4800000001012','Gatorade Blue 500ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(145,1,10,1,NULL,'BEV-0018','4800000001013','Nature\'s Spring Water 500ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(146,1,10,1,NULL,'BEV-0019','4800000001014','Yakult 5s',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(147,1,11,1,NULL,'SNK-0004','4800000001015','Chippy BBQ 110g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(148,1,11,1,NULL,'SNK-0005','4800000001016','Nova Multigrain Chips',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(149,1,11,1,NULL,'SNK-0006','4800000001017','Clover Chips Barbecue',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(150,1,11,1,NULL,'SNK-0007','4800000001018','Boy Bawang Cornick',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(151,1,11,1,NULL,'SNK-0008','4800000001019','Oishi Prawn Crackers',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(152,1,11,1,NULL,'SNK-0009','4800000001020','Ricoa Curly Tops',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(153,1,11,1,NULL,'SNK-0010','4800000001021','Jack n Jill Roller Coaster',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(154,1,11,1,NULL,'SNK-0011','4800000001022','Rebisco Crackers Sandwich',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(155,1,11,1,NULL,'SNK-0012','4800000001023','Fita Crackers',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(156,1,11,1,NULL,'SNK-0013','4800000001024','Chiz Curls',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(157,1,11,1,NULL,'SNK-0014','4800000001025','Nagaraya Garlic Peanuts',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(158,1,11,1,NULL,'SNK-0015','4800000001026','Cheese Ring',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(159,1,12,1,NULL,'GRO-0004','4800000001027','Argentina Corned Beef 150g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(160,1,12,1,NULL,'GRO-0005','4800000001028','555 Sardines in Tomato Sauce 155g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(161,1,12,1,NULL,'GRO-0006','4800000001029','Ligo Sardines Spanish Style',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(162,1,12,1,NULL,'GRO-0007','4800000001030','Del Monte Pineapple Juice 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(163,1,12,1,NULL,'GRO-0008','4800000001031','Del Monte Tomato Sauce 200g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(164,1,12,1,NULL,'GRO-0009','4800000001032','UFC Banana Ketchup 320g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(165,1,12,1,NULL,'GRO-0010','4800000001033','Silver Swan Soy Sauce 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(166,1,12,1,NULL,'GRO-0011','4800000001034','Datu Puti Vinegar 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(167,1,12,1,NULL,'GRO-0012','4800000001035','Knorr Sinigang Mix 44g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(168,1,12,1,NULL,'GRO-0013','4800000001036','Maggi Magic Sarap 8g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(169,1,12,1,NULL,'GRO-0014','4800000001037','Lucky Me Pancit Canton',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(170,1,12,1,NULL,'GRO-0015','4800000001038','Nissin Cup Noodles Beef',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(171,1,12,1,NULL,'GRO-0016','4800000001039','Quaker Oats 400g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(172,1,12,1,NULL,'GRO-0017','4800000001040','Jasmine Rice 25kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(173,1,12,1,NULL,'GRO-0018','4800000001041','Sinandomeng Rice 5kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(174,1,12,1,NULL,'GRO-0019','4800000001042','White Sugar 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(175,1,12,1,NULL,'GRO-0020','4800000001043','Iodized Salt 500g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(176,1,12,1,NULL,'GRO-0021','4800000001044','Baguio Beans 250g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(177,1,12,1,NULL,'GRO-0022','4800000001045','Cooking Oil (Palm) 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(178,1,12,1,NULL,'GRO-0023','4800000001046','Minola Coconut Oil 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(179,1,12,1,NULL,'GRO-0024','4800000001047','All Purpose Flour 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-07 20:26:03'),(180,1,12,1,NULL,'GRO-0025','4800000001048','Star Margarine 250g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(181,1,12,1,NULL,'GRO-0026','4800000001049','San Miguel Purefoods Ham 200g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(182,1,13,1,NULL,'PC-0004','4800000001050','Head & Shoulders Shampoo Sachet',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(183,1,13,1,NULL,'PC-0005','4800000001051','Rejoice Shampoo 340ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(184,1,13,1,NULL,'PC-0006','4800000001052','Dove Soap 90g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(185,1,13,1,NULL,'PC-0007','4800000001053','Safeguard Soap 135g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(186,1,13,1,NULL,'PC-0008','4800000001054','Close Up Toothpaste 160g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(187,1,13,1,NULL,'PC-0009','4800000001055','Sensodyne Toothpaste 100g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(188,1,13,1,NULL,'PC-0010','4800000001056','Nivea Lotion 100ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(189,1,13,1,NULL,'PC-0011','4800000001057','Belo Whitening Lotion 100ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(190,1,13,1,NULL,'PC-0012','4800000001058','Modess Sanitary Napkin',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(191,1,13,1,NULL,'PC-0013','4800000001059','Whisper Pantyliner',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(192,1,13,1,NULL,'PC-0014','4800000001060','Gillette Disposable Razor',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(193,1,13,1,NULL,'PC-0015','4800000001061','Johnson\'s Baby Powder 100g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(194,1,13,1,NULL,'PC-0016','4800000001062','Cetaphil Gentle Skin Cleanser 125ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(195,1,13,1,NULL,'PC-0017','4800000001063','Eskinol Facial Wash 135ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(196,1,14,1,NULL,'HH-0003','4800000001064','Tide Powder Detergent 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(197,1,14,1,NULL,'HH-0004','4800000001065','Ariel Powder Detergent 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(198,1,14,1,NULL,'HH-0005','4800000001066','Surf Powder Detergent 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(199,1,14,1,NULL,'HH-0006','4800000001067','Downy Fabric Conditioner 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(200,1,14,1,NULL,'HH-0007','4800000001068','Zonrox Bleach 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(201,1,14,1,NULL,'HH-0008','4800000001069','Domex Toilet Cleaner 500ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(202,1,14,1,NULL,'HH-0009','4800000001070','Mr. Muscle All Purpose Cleaner',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(203,1,14,1,NULL,'HH-0010','4800000001071','Baygon Insecticide Spray',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(204,1,14,1,NULL,'HH-0011','4800000001072','Trash Bag Large (10s)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(205,1,14,1,NULL,'HH-0012','4800000001073','Kleenex Facial Tissue',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(206,1,14,1,NULL,'HH-0013','4800000001074','Scotch Brite Sponge',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(207,1,15,1,NULL,'FRZ-0003','4800000001075','Magnolia Chicken Whole 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(208,1,15,1,NULL,'FRZ-0004','4800000001076','Purefoods Chicken Franks',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(209,1,15,1,NULL,'FRZ-0005','4800000001077','Swift Hotdog Classic 1kg',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(210,1,15,1,NULL,'FRZ-0006','4800000001078','Purefoods Bacon 250g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(211,1,15,1,NULL,'FRZ-0007','4800000001079','Selecta Ice Cream 1.5L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(212,1,15,1,NULL,'FRZ-0008','4800000001080','Nestle Cream 250ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(213,1,15,1,NULL,'FRZ-0009','4800000001081','Magnolia Fresh Milk 1L',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(214,1,15,1,NULL,'FRZ-0010','4800000001082','Eden Cheese 165g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(215,1,15,1,NULL,'FRZ-0011','4800000001083','Anchor Butter 200g',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(216,1,16,1,NULL,'BAK-0003','4800000001084','Spanish Bread (Pack of 6)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(217,1,16,1,NULL,'BAK-0004','4800000001085','Ensaymada (Pack of 4)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(218,1,16,1,NULL,'BAK-0005','4800000001086','Loaf Bread Sliced',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(219,1,16,1,NULL,'BAK-0006','4800000001087','Cheese Roll (Pack of 6)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(220,1,16,1,NULL,'BAK-0007','4800000001088','Monay Bread (Pack of 6)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(221,1,17,1,NULL,'SCH-0003','4800000001089','Yellow Pad Paper',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(222,1,17,1,NULL,'SCH-0004','4800000001090','Bond Paper A4 (10s)',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(223,1,17,1,NULL,'SCH-0005','4800000001091','Mongol Pencil #2',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(224,1,17,1,NULL,'SCH-0006','4800000001092','Crayola Crayons 8s',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(225,1,17,1,NULL,'SCH-0007','4800000001093','Scotch Tape 1 inch',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(226,1,17,1,NULL,'SCH-0008','4800000001094','Elmer\'s Glue Stick',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(227,1,17,1,NULL,'SCH-0009','4800000001095','Scissors 6 inch',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(228,1,17,1,NULL,'SCH-0010','4800000001096','Ruler 12 inch Plastic',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(229,1,17,1,NULL,'SCH-0011','4800000001097','Correction Tape',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(230,1,18,1,NULL,'TOB-0003','4800000001098','Fortune Red Pack',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(231,1,18,1,NULL,'TOB-0004','4800000001099','Winston Red Pack',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(232,1,18,1,NULL,'TOB-0005','4800000001100','Tanduay Rhum 350ml',NULL,NULL,0.0000,1,1,'2026-09-02 14:37:44','2026-09-02 14:37:44'),(234,1,16,NULL,NULL,'123456789','1122335546','Tst',NULL,NULL,0.0000,1,1,'2026-09-07 17:13:34','2026-09-07 17:13:34'),(235,1,15,NULL,NULL,'12344','11222233','aad',NULL,NULL,0.0000,1,1,'2026-09-07 18:13:25','2026-09-07 18:13:25'),(237,1,11,NULL,NULL,'111114','2222','33',NULL,NULL,0.0000,1,1,'2026-09-07 19:34:19','2026-09-07 19:34:19');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `registers`
--

LOCK TABLES `registers` WRITE;
/*!40000 ALTER TABLE `registers` DISABLE KEYS */;
INSERT INTO `registers` VALUES (14,19,'Register 1','101_reg1','manual',NULL,0.00,0,0,0,1,'2026-09-15 15:56:59','2026-09-15 15:56:59'),(15,19,'Register 2','101_reg2','fixed',5000.00,0.00,0,0,0,1,'2026-09-15 15:56:59','2026-09-15 15:56:59');
/*!40000 ALTER TABLE `registers` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `return_items`
--

LOCK TABLES `return_items` WRITE;
/*!40000 ALTER TABLE `return_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `return_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `returns`
--

LOCK TABLES `returns` WRITE;
/*!40000 ALTER TABLE `returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `returns` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `revoked_tokens`
--

LOCK TABLES `revoked_tokens` WRITE;
/*!40000 ALTER TABLE `revoked_tokens` DISABLE KEYS */;
INSERT INTO `revoked_tokens` VALUES ('00175316481dbe3768b95f2776cb19ef',58,'2026-09-16 17:25:22','2026-09-02 18:28:01'),('0157656fd3c51f309330ebd761b008c6',58,'2026-09-13 16:45:06','2026-08-30 17:48:34'),('0260be55748291fa65b4f251b8f1a5c1',4,'2026-08-20 11:08:54','2026-08-20 10:09:31'),('036197f89e33e06b489f51a8f3303277',4,'2026-09-14 19:31:47','2026-09-01 08:31:30'),('042e0ff2468b61e9ebfe27ccd9b81238',58,'2026-09-24 22:45:15','2026-09-11 14:49:00'),('055334a674536f12be1868e55912a6d2',5,'2026-08-30 16:22:07','2026-08-30 15:23:11'),('0602351bb12c35b823165e3bd6ed00bc',58,'2026-09-12 15:07:19','2026-09-12 14:20:49'),('065f97a2ff338b5a48e88513f907673b',58,'2026-09-25 16:11:12','2026-09-11 16:57:48'),('0686e47d3230131b551e6376f84e498a',4,'2026-09-07 22:06:24','2026-08-26 07:01:59'),('07d0f6e83ad80b80c4097eb6868ab0e1',4,'2026-09-10 19:01:19','2026-08-27 20:01:19'),('08563f411fe81ff7e5b074e21bd766ed',5,'2026-09-10 15:37:50','2026-08-27 15:37:52'),('09469f6a2c1643ec2a9f6db1485b644d',4,'2026-09-11 22:47:09','2026-08-28 22:47:09'),('0a985b1c37c00a7385d220693fc06824',58,'2026-09-26 10:55:32','2026-09-12 12:17:32'),('0c7b996eb4459e7a5cabfc6afba2ba71',21,'2026-08-29 00:06:26','2026-08-28 23:12:46'),('0d80d564127d3d8f7c2a4d79bea2c397',4,'2026-09-10 15:37:35','2026-08-27 16:57:08'),('0fbe6951bfddf0a45a6d9326155ab4d0',5,'2026-09-10 18:37:41','2026-08-27 18:37:41'),('10147e82d165332f1b93bc42bd52e002',5,'2026-09-12 15:08:02','2026-08-29 16:40:07'),('104b039895c116e56bf59fa4e4ba8d77',5,'2026-09-11 14:39:20','2026-08-28 16:01:01'),('11ba4e31bd19fe6027edbdaafda97ce4',4,'2026-09-02 19:11:31','2026-08-19 20:13:55'),('11cb55ffc82941b2f76f29e80fc82fa2',5,'2026-09-12 16:40:07','2026-08-29 17:40:55'),('13869b139a0f5d51f6b5a5edc2ec600c',4,'2026-09-01 21:19:07','2026-08-19 19:57:19'),('13a837e484035aa4f7c6329fd270ae3e',5,'2026-08-20 11:51:14','2026-08-20 11:02:53'),('13d0beeb1db00d6bb9f65738e3d6104d',58,'2026-09-15 21:15:02','2026-09-01 21:15:03'),('145c7c76cdd90e7234e9c541b8675169',4,'2026-09-25 13:13:39','2026-09-11 14:47:46'),('16754dba34167546bc1f4ab511bf92c6',5,'2026-08-27 08:35:18','2026-08-27 08:17:49'),('169dae2a73bb6727cbd2f3e35403dd13',5,'2026-08-23 17:58:34','2026-08-23 17:13:42'),('174b39c0b449f6980df0b0137e3182d0',4,'2026-09-10 16:57:08','2026-08-27 18:00:59'),('176b863b5350d7c7b9a041bb7b987a6e',4,'2026-09-24 22:45:32','2026-09-11 13:13:39'),('180b064609578d2451aac883640726c8',58,'2026-09-01 17:09:15','2026-09-01 16:27:14'),('1a65e3f0b96d9db67ec5fca325b09524',21,'2026-09-11 14:49:18','2026-08-28 14:49:19'),('1a7baf03fca17ff2397ce214187d711c',4,'2026-09-27 16:01:46','2026-09-13 17:25:38'),('1c400f793ab8c976021294cdbab87e93',4,'2026-08-28 19:07:09','2026-08-28 18:08:16'),('1ccd373f1fc33956be30f647f7ab99f5',58,'2026-09-02 09:47:35','2026-09-02 09:10:13'),('1d5f1e1c31e7c5469c8388c7980f436c',4,'2026-08-28 21:50:57','2026-08-28 20:51:28'),('1e1c8fb1a97ac9a8535f58ff67574fd8',58,'2026-09-07 22:57:08','2026-09-07 21:57:37'),('1e46ac84e75777d4d417d71ce31e84ec',58,'2026-09-15 20:09:28','2026-09-01 21:15:02'),('209b9c350f28b0dfc8b9bc71225dbf99',5,'2026-08-22 16:30:21','2026-08-22 15:30:25'),('216d12608f8be227f509531d66dc64f9',4,'2026-09-03 18:49:44','2026-09-03 17:49:53'),('21dbc7db2a020af9813576ccfbfee6df',4,'2026-09-02 21:20:35','2026-08-19 21:25:47'),('221acc8ff7436195669cb0a074ad5634',5,'2026-08-28 19:08:27','2026-08-28 18:24:59'),('27de8e55f220e350a7bfecc84f52027d',58,'2026-09-08 09:26:38','2026-09-08 08:43:13'),('2895382771d897242a0c3bf873a46b1a',4,'2026-09-12 15:07:49','2026-08-29 16:11:58'),('28b070be4cebb471166861f9bed19f62',4,'2026-09-14 06:45:05','2026-08-31 07:56:37'),('29be955dd51a26c8432f292a0e1ba457',58,'2026-08-22 16:27:01','2026-08-22 15:27:29'),('2a256f18986ecb5dfb0afafb9c73622b',4,'2026-09-10 18:01:00','2026-08-27 19:01:19'),('2b2163defff7b7a770ba79a49711374a',58,'2026-09-04 15:04:38','2026-09-04 14:40:18'),('2e839305409f4dc0a86c03d19235aa63',4,'2026-09-02 18:08:53','2026-09-02 17:19:15'),('2ff636961dd528ef775333c42d3b5bec',58,'2026-09-04 20:15:22','2026-09-04 19:31:16'),('3043109b27bc450a19cf0a683cd986e0',58,'2026-09-14 10:12:23','2026-08-31 11:58:32'),('306236dc43f9e43865af6ed3eba3575b',4,'2026-09-06 17:40:53','2026-09-06 16:41:38'),('31d87a6e28d5680f2c261164f004643d',4,'2026-09-03 12:03:46','2026-08-20 13:19:57'),('3206c88bf4273b3ea41000100d2995f6',58,'2026-09-06 18:28:11','2026-09-06 18:03:10'),('3372c6925afb89d52a9b1048bb6b9bcf',4,'2026-09-02 20:20:10','2026-08-19 21:20:35'),('34676c108c4b663bdfd55d84dbbd9bec',4,'2026-09-02 20:18:40','2026-08-19 20:19:11'),('3606237ba9c0f3a316d5c5b8a300ccb0',58,'2026-09-04 19:05:01','2026-09-04 18:06:28'),('36c64747c13beda60c0669cc8f3d4db0',4,'2026-09-26 09:57:43','2026-09-12 16:12:14'),('375fc2a2984221388b9b3a7225652d36',21,'2026-08-30 15:46:37','2026-08-30 15:12:41'),('3af882ed914584f5eeb4bb0830d0b70e',5,'2026-08-23 19:23:54','2026-08-23 18:56:16'),('3b0e8015540f8b8f89bf91fc35089710',5,'2026-09-14 12:03:15','2026-08-31 15:10:47'),('3b10845a0dc690f98dcfa5e616d6cc4c',4,'2026-09-28 11:52:40','2026-09-14 13:21:08'),('3b88b12cf811e3f235ea30eb54787a58',5,'2026-09-11 16:01:01','2026-08-28 17:06:13'),('3bd98190af715756fbd3f6303ac8fb36',21,'2026-09-11 16:01:00','2026-08-28 17:33:37'),('3d46148666400ed156864e4e9e5ee4c9',4,'2026-09-06 17:08:56','2026-09-06 16:16:33'),('3edb637d57551c23990abfd96c8d78d2',4,'2026-09-12 17:16:06','2026-08-29 18:26:22'),('3f03a58378f2347c092b1e8c5453029a',4,'2026-08-30 15:04:50','2026-08-30 14:59:47'),('3f38059fd4f20536dee62efd52f9d06c',5,'2026-08-22 16:30:05','2026-08-22 15:42:58'),('4079b17353909ad777a1d5585525b6e4',58,'2026-09-21 20:23:23','2026-09-07 21:47:41'),('40a33048bffe4d646888e45177109f3f',4,'2026-09-14 16:51:56','2026-08-31 18:19:17'),('4147e9a147e085e35e47c0585d859e8f',4,'2026-09-12 18:26:23','2026-08-30 09:24:49'),('422973debc2c5d0618b7cb1d9cecc1ee',4,'2026-09-09 09:27:40','2026-08-27 06:52:24'),('4251cddb5bf709e501507b46e0c4e635',58,'2026-09-14 07:55:42','2026-08-31 09:05:03'),('425a231732863dc7becd12cf1b6bd8a1',21,'2026-08-22 17:14:06','2026-08-22 16:42:34'),('4425b0bb35edc55b465786504a4f3e64',5,'2026-08-30 16:13:14','2026-08-30 15:18:21'),('447d82e522a77f26083dca78ff903654',58,'2026-09-24 12:06:06','2026-09-10 13:14:45'),('448426caa790a29149c7524fed4865e0',58,'2026-09-02 08:58:11','2026-09-02 08:46:38'),('44858e6bfa3bba85f9becab025fbbbb4',4,'2026-09-21 17:11:43','2026-09-07 18:12:59'),('4523ea7f1c62657c707f418305726db4',5,'2026-08-19 20:58:19','2026-08-19 19:58:34'),('47f1e592ad86f6ef34b4db4482b3f614',5,'2026-08-20 11:09:43','2026-08-20 10:15:28'),('4983ad2d84e0dc4548e362960ba0fd0a',4,'2026-09-11 21:35:59','2026-08-28 22:47:07'),('49b9d1fe9cb8d6a166b898201b998fa2',5,'2026-09-12 08:44:21','2026-08-29 10:07:34'),('4a6c5acfa64767d38b180a4d4af6173a',21,'2026-09-11 17:33:38','2026-08-28 21:40:25'),('4aa54e9c7e15d90b51d0a32714de301b',58,'2026-09-14 13:03:04','2026-08-31 14:13:11'),('4b9b40064915e1f7da24244e17c4d61f',5,'2026-08-20 11:28:23','2026-08-20 10:30:42'),('4dd6001e3f98fa48cf9c90fd0c2e33eb',4,'2026-09-03 13:19:57','2026-08-22 14:41:46'),('50291962cdcbd05002a333ff80fb7ce3',58,'2026-09-04 14:39:04','2026-09-04 14:03:52'),('508c4fe2efc34d8bb26947a001663066',58,'2026-09-14 11:58:32','2026-08-31 13:03:04'),('5201bd2143fb662e4738a5dd70b3123e',21,'2026-09-11 13:45:17','2026-08-28 14:49:18'),('535e189c7c26138209d4304f11b5bfe6',21,'2026-09-12 15:10:20','2026-08-29 16:24:41'),('53945c94b246dcc4e5c90a7c0ff7fe53',58,'2026-09-15 14:45:58','2026-09-01 15:59:43'),('557631ec5b1377299127b311b227abff',58,'2026-09-16 18:28:01','2026-09-02 20:59:33'),('55c9258faba3f2c0c443402ead13ea0e',58,'2026-09-21 22:07:40','2026-09-08 07:50:28'),('5610063f17e93c6203022dd260a7153c',58,'2026-09-17 18:07:51','2026-09-03 19:22:01'),('5662022d6a05dfeda6ff541520fd5b70',4,'2026-09-10 09:31:25','2026-08-29 08:34:05'),('5683633585ff9e1d35fd3dadf0aa9fb2',4,'2026-09-13 11:28:22','2026-08-30 14:04:50'),('57ad27b4589e5d586ad4bded7ea6d4d4',4,'2026-09-28 13:21:09','2026-09-14 13:21:09'),('59696481bdf4627afacd3da2dbec9023',4,'2026-09-16 19:07:07','2026-09-02 20:55:37'),('59a323bb3e808740e797b7acccb93aaf',58,'2026-09-24 13:14:45','2026-09-10 19:33:16'),('5a5f2ff9148c0a7f72fa31739d3e15c7',4,'2026-09-11 12:17:32','2026-08-28 13:45:08'),('5b85392f1b3d0eafeb5256b0b63f02f1',4,'2026-09-28 13:21:09','2026-09-16 12:58:14'),('5eed4f099c42204717d8beae91e1723f',21,'2026-09-10 17:53:05','2026-08-28 13:45:17'),('5f48fefed750e76d79dfc632dd6ccf32',5,'2026-09-11 12:17:39','2026-08-28 13:31:26'),('6161433130eb9eede24d2d57f9a2bb32',4,'2026-09-16 17:20:56','2026-09-02 19:07:07'),('61f3071e050dae3425754b36df28f844',4,'2026-08-27 15:12:53','2026-08-27 14:34:14'),('6377b99d5a3dce7811d72ee7875f431c',5,'2026-08-30 16:18:30','2026-08-30 15:21:31'),('63d1fda281607af5b5fa7d7e71b97e24',4,'2026-09-21 19:33:41','2026-09-07 21:48:56'),('64c9dc363c9aa319c7f2ff13a1c2f156',21,'2026-09-06 18:18:24','2026-08-24 18:47:17'),('653bcd33be0ef8357772ca110c690e00',5,'2026-09-10 15:37:54','2026-08-27 17:11:01'),('65cd2cb677461240f039ac68e23edd25',21,'2026-09-12 16:24:41','2026-08-29 17:36:37'),('66b645bc785d6e8f237a56cc174f93fc',4,'2026-09-11 13:45:08','2026-08-28 13:45:09'),('67107a0fe5a8714886edcb234ccf17f6',4,'2026-09-09 07:01:59','2026-08-26 09:27:40'),('694e6691b593245ede96e8d99760c256',5,'2026-08-20 11:34:55','2026-08-20 10:38:03'),('69e9ea771aa2d2e4dea66aeea48f9002',58,'2026-08-30 16:26:49','2026-08-30 16:13:36'),('6a27a2087be52210a12b54f89c260e9a',4,'2026-08-22 16:47:41','2026-08-22 16:34:40'),('6c4d66144f88781b67dc07cc690c03ca',58,'2026-09-24 19:33:16','2026-09-10 21:42:50'),('6ce48c5b2fe4ff590516c6ef8c06a863',4,'2026-09-06 18:04:25','2026-08-23 19:23:58'),('6e19f505992f196d0cfd39fd4c7e6297',58,'2026-09-15 12:22:38','2026-09-01 13:47:20'),('7146f2b8d106324ef52e67fd051d706a',5,'2026-08-20 12:03:02','2026-08-20 12:02:45'),('717d73954a6977fd691646a5aae0ec45',58,'2026-09-19 16:44:41','2026-09-06 15:41:20'),('72063ddfc042deb8728e15c8b377275e',4,'2026-08-22 15:41:46','2026-08-22 14:43:08'),('727e4e4d3505fc94e1de2a0e557ca016',5,'2026-09-11 13:31:27','2026-08-28 14:39:20'),('72d6569c54edacc90b4f3b4dd6f57f3f',4,'2026-08-28 19:25:13','2026-08-28 18:27:10'),('732c8c363c24156b49a9ac85caf0cb31',5,'2026-09-12 17:40:55','2026-09-01 08:43:46'),('74461062ddec821410871f98de7b7857',5,'2026-09-10 18:37:41','2026-08-27 19:49:28'),('7463457c37fb0810566090959069d265',4,'2026-09-11 15:38:28','2026-08-28 16:50:06'),('74b382b13335dc9a93f315c220bc5ac2',58,'2026-09-21 17:11:24','2026-09-07 18:14:44'),('74d4d05f4ad5b13c2dd8f7882d32a219',5,'2026-09-02 22:00:31','2026-08-20 08:24:48'),('760bfa5931cd21ac72fc7e58ce7c5206',58,'2026-09-01 15:34:47','2026-09-01 14:34:58'),('762dfca45b928535b3d441865fc69e11',4,'2026-09-10 20:01:19','2026-08-28 12:17:32'),('769695e7cadd8b80e0f52a296e70c0df',4,'2026-09-14 11:59:15','2026-08-31 11:59:15'),('76e33f98151065aa7c71acf93ff778b8',58,'2026-09-08 08:52:27','2026-09-08 08:19:53'),('78c972f0295e5be85ecb471f409df96a',4,'2026-09-15 16:27:26','2026-09-01 17:58:57'),('7a3e06c0b41e1d8f63794a747fee6633',5,'2026-08-20 11:38:16','2026-08-20 10:50:59'),('7a41ab41c31ee4fdc52b8dae62f8bf2d',5,'2026-08-29 11:45:18','2026-08-29 10:45:24'),('7a5759b4be0a5666d9d1a217f9519912',4,'2026-08-31 12:59:15','2026-08-31 12:37:51'),('7a857b3d38513735bebadc4d762ab266',4,'2026-09-11 22:47:08','2026-08-28 22:47:09'),('7a8e81f80db2d8945f027912fc79a7e1',4,'2026-09-02 21:25:48','2026-08-20 08:23:19'),('7a983906dad3c830850bb0f5e18c597a',4,'2026-09-10 09:11:19','2026-08-29 08:31:25'),('7b4df8c95189f197ec28918a81e71db5',5,'2026-08-20 11:15:51','2026-08-20 10:28:14'),('7c13073d0941e1252e3de433e802cd8a',5,'2026-08-22 16:05:43','2026-08-22 15:11:07'),('7c5456dab9c0690f0f676cbbd43b4193',4,'2026-09-15 19:10:01','2026-09-01 20:17:24'),('7dadea55f347272592a9021031e92602',21,'2026-09-13 09:27:09','2026-08-30 14:46:37'),('7e05c6d89199e66178ac917b46450c86',4,'2026-09-10 08:18:03','2026-08-27 09:31:25'),('7e44e1357cc4ebda8dcd7f15d8b2dac4',4,'2026-09-14 14:51:48','2026-09-01 08:46:52'),('7fb8cc1feb40e2a963d73bc93c33b007',58,'2026-09-15 18:00:49','2026-09-01 18:00:49'),('7fcf6e6781d5d7122845140fe125e65a',58,'2026-09-28 07:47:13','2026-09-14 12:01:06'),('808d821dc77fda543b99adbe4623b69b',5,'2026-08-22 16:46:31','2026-08-22 16:07:18'),('83dc09ac7f102509a99549e84a01c3d9',4,'2026-09-03 08:23:19','2026-08-20 09:26:47'),('83e66ea4a698648c824c484b973a8865',21,'2026-09-06 17:13:36','2026-08-23 18:18:24'),('84ecc0061acccfaabcc03d039cb2e18f',5,'2026-08-19 22:48:51','2026-08-19 21:52:17'),('856bc796e2533945dbda12b3503beace',58,'2026-09-14 18:46:47','2026-08-31 19:47:21'),('86124118a579de275a52f058138cfcc6',4,'2026-09-30 12:58:14','2026-09-16 16:32:43'),('8621742d24b73900d99b5d4b5546c086',5,'2026-09-03 08:24:48','2026-08-20 09:45:34'),('8656e6fdc8be2b79f7e315477ec41aca',4,'2026-09-11 22:47:07','2026-08-28 22:47:08'),('870d55ad28a15adbec03696d5b7ff0ae',21,'2026-08-22 17:45:15','2026-08-22 16:47:52'),('8a703d61bd53fc57ed0a848d7413477d',5,'2026-09-10 20:49:33','2026-08-27 20:49:33'),('8a8c6deb14881368b7e2213edc26167b',5,'2026-08-20 10:45:34','2026-08-20 09:46:45'),('8af2d904654db646befbd95790ef7067',4,'2026-08-19 20:57:19','2026-08-19 19:57:33'),('8c0a1eb6023fecc602e9ce8611393236',4,'2026-09-25 16:18:08','2026-09-12 09:57:43'),('8cda9905daf4fcffba3e3379776e311d',58,'2026-09-02 08:55:22','2026-09-02 08:46:32'),('8ddd06ea6f8262da94621d9b64969299',5,'2026-08-22 18:01:22','2026-08-22 18:00:31'),('8dde9b83a46901303eb8c11ffb1edfad',5,'2026-09-10 19:49:28','2026-08-27 20:49:33'),('8e4b113cd758dd25d8b8205402e0510c',58,'2026-09-15 15:59:44','2026-09-01 18:00:49'),('8ff5d4cc6a6ddcd14528f8e2ad1a9331',58,'2026-09-14 06:45:18','2026-08-31 07:55:42'),('8ffa24a97f08a9aea60ca14371cf7311',21,'2026-08-22 16:43:31','2026-08-22 16:08:03'),('91213e29005232ffd49049e5ebce465a',4,'2026-09-23 13:21:23','2026-09-10 12:46:43'),('9158f54ba97e519c7fb0bc10d7dcacf7',58,'2026-09-14 16:25:26','2026-08-31 17:37:18'),('9176f249b5a1af8c086125d4a185778b',4,'2026-09-10 19:01:19','2026-08-27 19:01:19'),('919d64a31503b35f3c2118ae1014fbfa',58,'2026-09-26 16:11:48','2026-09-14 07:47:13'),('919fcbca7a6872ad67ae94c16c747389',5,'2026-09-03 13:20:29','2026-08-22 15:13:13'),('92bee2373fe48c7308563e9716c8e490',4,'2026-09-14 18:19:17','2026-08-31 19:31:47'),('93646cee59c635826a6603f682f649ba',4,'2026-09-27 14:50:50','2026-09-13 16:01:46'),('93f690de543f978a2f673661f4c994a5',4,'2026-09-03 09:26:47','2026-08-20 10:27:01'),('951b1559dd2a4a79e62d9f09bc833d01',5,'2026-09-11 13:31:26','2026-08-28 13:31:27'),('952c7994494a3c11a4d052e015aae86a',4,'2026-09-27 17:25:38','2026-09-14 07:44:21'),('960504db994143b8214c9b5092c1e534',21,'2026-09-10 16:33:18','2026-08-27 17:53:05'),('96eb4b2955855211e1a8ca01013a2fe7',4,'2026-09-06 19:23:58','2026-08-24 18:46:41'),('97f967e43b9419d6b1ebc50cdc2b78b0',4,'2026-09-12 16:11:58','2026-08-29 17:16:06'),('9810a4ec71fee1e5b358618746224e2b',58,'2026-09-22 18:44:16','2026-09-08 22:29:53'),('9902086817a3135397269920d7e2cca1',21,'2026-09-11 14:49:19','2026-08-28 16:01:00'),('990e4d8eecbda60b9031f8aa25630ed8',58,'2026-09-02 18:19:30','2026-09-02 17:20:39'),('99765ac82c468b9fe4086b0fe4b70da3',4,'2026-09-25 14:47:46','2026-09-11 16:18:08'),('998633361aca5561297d01174091c55a',5,'2026-08-22 17:56:33','2026-08-22 16:59:33'),('9aa4057ba594afc1c00c0b38d9a4e793',21,'2026-09-07 18:47:18','2026-08-24 21:29:22'),('9b0f2ca7f2c0ef6a622c00d3e6a93a78',4,'2026-09-02 20:19:32','2026-08-19 20:20:10'),('9be2a87d5fe523c1dc2c33b6f37eb537',5,'2026-08-19 22:26:54','2026-08-19 21:42:37'),('9c0fa5ed4d119bc7103c267f94827d6f',4,'2026-09-03 10:27:01','2026-08-20 12:03:46'),('9c8e5e78b88739d49cfe4f9536aabd56',58,'2026-09-21 19:16:16','2026-09-07 20:23:23'),('9ce4a7d0d2f0d649e8b8e38dd0617192',58,'2026-09-02 09:47:23','2026-09-02 09:10:06'),('9db8b9720d0d7b2cf62aff284b8d1653',5,'2026-08-22 17:44:00','2026-08-22 16:48:17'),('9dd718487c31c5b02b9fc037cddb81f4',58,'2026-09-16 20:59:33','2026-09-03 13:12:41'),('9e67cf74eb908ad74bf2b47b539da7b8',5,'2026-08-20 11:01:08','2026-08-20 10:05:35'),('9ed7424c7cc2e6ee1b4d6d849d0626e1',58,'2026-09-24 09:14:02','2026-09-10 12:06:06'),('9fae762963f5eb8e27148de2841d6996',4,'2026-09-06 18:01:05','2026-09-06 17:27:58'),('a0b46588a93de24cd436506c732c8804',58,'2026-09-25 14:49:00','2026-09-11 16:11:12'),('a1c38d2f950d8d380cdbd163202b8c2f',58,'2026-09-15 08:45:53','2026-09-01 10:14:57'),('a1cd7e2d9fd054faf5070b1c6a8b9309',4,'2026-09-27 17:25:38','2026-09-13 17:25:38'),('a2c77e7d4751e81d45c6e40fe3ea4dad',4,'2026-09-21 09:04:34','2026-09-07 10:58:38'),('a2e0e5b447c13c366dcb7b2939f6ef59',5,'2026-09-06 18:56:30','2026-08-29 10:45:18'),('a34d62abbdbfcde0dde916195d30b63e',5,'2026-08-26 08:09:13','2026-08-26 07:09:21'),('a4812b66e095cc3bd6b672211e79fe45',5,'2026-08-31 16:10:47','2026-08-31 15:10:53'),('a51136ef5bb943968f7f53f8d8d89f9c',21,'2026-08-26 08:05:21','2026-08-26 07:08:55'),('a5b3cb276601455289f8de8fcdb2c084',21,'2026-08-22 17:48:05','2026-08-22 16:56:55'),('a5d917c5bbe51f680dc1741c8e5e19fa',58,'2026-09-04 18:52:32','2026-09-04 17:56:26'),('a7f143e36e93d3c51550770e87a92fa7',4,'2026-09-11 22:47:10','2026-08-28 22:47:10'),('a7f50027f709abdc993afbf6f6830658',4,'2026-08-27 07:55:04','2026-08-27 07:34:58'),('a7fdf89dd8f44615f1daa1d980655624',4,'2026-09-09 20:32:49','2026-08-27 14:12:53'),('a8038e56ec8250a3a10327af5a45437e',58,'2026-09-04 18:56:49','2026-09-04 17:57:27'),('a871ea45799d47f6dfadc63d2f074008',58,'2026-09-06 17:41:47','2026-09-06 16:44:53'),('a99cbf9ef4023bfce9d3160d8d3ffd11',58,'2026-09-19 15:17:48','2026-09-05 16:25:42'),('a9b8930ab5809578d4f3bb2211ea3ef8',4,'2026-09-07 21:00:54','2026-08-24 22:06:24'),('aa39d817315e113645851fe3af29b418',4,'2026-09-08 08:54:33','2026-09-08 08:20:34'),('aa59587c09f776f34f19d719af557a86',4,'2026-09-26 16:12:14','2026-09-12 17:14:37'),('aaee5d563a709dd396205b308f18b1e4',4,'2026-09-12 18:26:22','2026-08-29 18:26:23'),('ac370e0bf4928622b154a4c7d04cf58c',4,'2026-09-11 19:09:35','2026-08-28 20:50:57'),('ad15ced09c0ed085cd8b14dbb0fe1b6d',5,'2026-08-22 17:48:25','2026-08-22 16:56:23'),('adf874598e4ec0492e07913eebedd5e7',4,'2026-09-12 18:14:37','2026-09-12 17:43:54'),('af11f836249c2d63bfe20a344aef3544',4,'2026-08-29 09:34:05','2026-08-29 08:43:56'),('af363a26b7ea5bb0d7ba2f007e431624',4,'2026-09-15 08:46:52','2026-09-01 12:34:16'),('af4651026fe920259f0f2b0ce4b27f84',4,'2026-09-11 22:47:08','2026-08-28 22:47:08'),('af91c8a491e54544b9568a82ccb43a34',4,'2026-09-28 08:04:26','2026-09-14 11:52:40'),('afc04d560f1a0c21bb763af800551792',4,'2026-09-09 09:26:33','2026-08-27 06:55:04'),('b14a9b94abc1c8d45dcd0d036d3c4eeb',5,'2026-08-22 16:13:44','2026-08-22 15:26:24'),('b3e97f8466cac11f82f772da56e7ed60',5,'2026-09-01 09:43:46','2026-09-01 08:45:43'),('b49a0daaa76948932f1637f7297f1b7c',21,'2026-08-22 16:12:48','2026-08-22 15:29:47'),('b513f4b651d8f27cf832e576c5fe4c29',58,'2026-09-17 16:28:26','2026-09-03 17:40:59'),('b57937eb5b88888e923a8ee913295ff9',4,'2026-08-20 11:34:08','2026-08-20 10:34:46'),('b605dfcc96b2c48e6f6990c76c5c7664',58,'2026-09-21 10:59:02','2026-09-07 17:11:24'),('b7959126a4f9013c04cf57a332c03b3b',58,'2026-08-22 16:27:43','2026-08-22 15:27:49'),('ba2a25c1b32bff19ad006ac94b546c15',4,'2026-09-14 09:04:15','2026-09-14 08:04:20'),('bb88a01f75f32f6a23366dec52ca2391',58,'2026-08-30 16:26:39','2026-08-30 15:26:43'),('bba96520785f29312876348c71aff5bb',4,'2026-09-15 17:58:57','2026-09-01 19:10:01'),('bbe3c52d93b79331f903d50a4ffd9321',5,'2026-09-06 17:13:50','2026-08-23 18:23:54'),('bcc7fe2206ef79da8d6e4992a4422fe3',58,'2026-09-14 15:24:57','2026-08-31 16:25:26'),('bcf52736ef3aa861b739ceed52109aa2',4,'2026-09-10 07:54:15','2026-08-27 07:54:16'),('bd8f8feac96b5cd21e1f5c6b411fb04c',58,'2026-09-04 19:08:35','2026-09-04 18:25:50'),('bdc9d4d11c7011531d968413342caace',58,'2026-09-20 18:05:54','2026-09-07 07:14:52'),('be02a8d316350dbb83bdac643e583923',4,'2026-09-11 17:07:07','2026-08-28 18:07:09'),('be1283b3112e855236a68c7c73f38d8c',4,'2026-09-07 18:46:41','2026-08-24 21:00:54'),('be2527549e2411ab59d2f08e3a0586bf',4,'2026-09-09 07:09:44','2026-08-26 09:26:33'),('c0f0d66acbdfb786372d5216067f64bf',4,'2026-09-05 14:46:43','2026-08-22 15:47:41'),('c15027b22068ef458941e37e29e2de4f',4,'2026-09-05 16:34:50','2026-08-22 17:37:28'),('c24fd69ea8aeec6342ad957c3a79f0e6',5,'2026-08-20 10:54:04','2026-08-20 09:58:00'),('c25f5c8e065845850df51770b12d4c91',4,'2026-09-11 16:50:06','2026-08-28 17:51:45'),('c2b1074f81c8c4b0496ab1b2b5eef7aa',5,'2026-09-10 20:49:33','2026-08-28 12:17:39'),('c3cacbb45425284578a6c2c7a70930f8',4,'2026-09-06 17:20:17','2026-09-06 16:40:42'),('c49cb926cfdd44927d01923b6bb28cce',4,'2026-08-19 15:23:21','2026-08-19 14:31:32'),('c5700c4a690507efb570dbf034870279',58,'2026-09-21 18:14:44','2026-09-07 19:16:16'),('c716a025070c52278cbc8260fe48d06c',4,'2026-08-20 11:07:54','2026-08-20 10:08:05'),('c85e681e6d2088dabf7d781a277babc0',4,'2026-09-16 20:55:37','2026-09-03 17:49:44'),('ca989c2bb756c57306b09ce1266e2d0b',4,'2026-09-07 22:48:56','2026-09-07 21:57:00'),('cbd518d6a2bfcefa4d0c4149ca71b685',58,'2026-09-04 14:24:47','2026-09-04 13:38:36'),('cc8c24b0199c68ea500fb862dce888ba',58,'2026-09-24 21:42:50','2026-09-10 22:45:15'),('cca17a5e560fb1925e47733f215bb029',58,'2026-09-14 17:37:18','2026-08-31 18:46:47'),('cd14dfe265fe5d8fb38a926969141056',4,'2026-09-28 16:15:46','2026-09-14 16:15:48'),('ce45211a0da7a16d6592c9ad1c828b3e',4,'2026-09-13 09:24:49','2026-08-30 11:28:22'),('ce4bdd60437821b2f17c4d8110ff0091',5,'2026-08-28 18:06:13','2026-08-28 17:06:56'),('cfffe8706fdac46129ada14498dee0dc',21,'2026-09-11 17:33:38','2026-08-28 17:33:38'),('d0f9f712524d9984407925223d977195',4,'2026-09-14 17:15:50','2026-09-14 16:16:22'),('d39c5ebc9d8c8ba0ba69f420b86c68dd',5,'2026-09-10 14:34:24','2026-08-27 15:37:50'),('d557f6699b79758ccb90264a90a8944b',4,'2026-09-28 16:15:45','2026-09-14 16:15:46'),('d603ec3515c7fa2c1800dc918b232fa3',4,'2026-09-13 14:59:56','2026-08-30 16:06:26'),('d649e33f65728f69112a30dac964e1d5',58,'2026-09-06 17:16:44','2026-09-06 16:20:02'),('d65da9d7fdd4f4a9dfa0a726eb1eee49',5,'2026-08-19 21:02:04','2026-08-19 20:02:20'),('d6e3ccfa9e5af6509532a939dcad9ff8',4,'2026-09-06 16:58:30','2026-08-23 18:04:25'),('d74760feb8bc0c81457c61aab48c7606',4,'2026-08-22 15:47:59','2026-08-22 15:05:31'),('d7f5af0085eba143f47b46edfeff6ba9',58,'2026-09-26 09:54:58','2026-09-12 10:55:32'),('d91f5816c0ef71cda146abe841e652e8',4,'2026-09-14 11:59:14','2026-08-31 11:59:15'),('da81bddb890dc722c9ae853f445301b3',58,'2026-09-15 18:00:49','2026-09-01 19:09:15'),('da92bba66d61f477f6e1baff57fa56ca',58,'2026-09-14 09:05:03','2026-08-31 10:12:23'),('dc4cfe85711e616d6806eb20fa67e81c',5,'2026-08-22 17:07:36','2026-08-22 16:42:25'),('dc6d46f1bd525e73fb2cd0d0a2415b92',4,'2026-09-16 14:34:15','2026-09-02 15:40:52'),('dd8aaf646ed64b4579b5976418b11138',21,'2026-08-22 17:57:08','2026-08-22 17:01:32'),('de23364b61279815344130ae2704df94',5,'2026-08-22 17:59:42','2026-08-22 17:01:13'),('de94aa46cf72c20c0a001c93e4989b05',58,'2026-09-14 19:47:21','2026-08-31 21:25:10'),('e0cbb7250c37dd7e906eba22b20c9980',58,'2026-09-15 10:14:57','2026-09-01 12:22:38'),('e0f707cbe3a330980d2a22bd4ee6c1fc',5,'2026-08-19 22:52:30','2026-08-19 22:00:14'),('e12fa025aa465c161e2b880a3c3dc0c3',4,'2026-09-11 22:47:10','2026-08-28 22:47:11'),('e1c89837b70190c2f3ddd4b033828bd3',4,'2026-09-10 13:53:58','2026-08-27 15:37:35'),('e2850892c9a2d7138e808af46c226a4f',4,'2026-09-05 17:34:34','2026-09-05 16:34:58'),('e3024c634d669da1fed88f1f7cd3c192',58,'2026-09-11 17:57:48','2026-09-11 16:58:57'),('e6073d5c68d7e7f83d69d5df2f4cc2e7',58,'2026-09-15 19:09:15','2026-09-01 20:09:28'),('e62bb07cd380fc1bc065af389b3f5b72',5,'2026-08-22 16:43:10','2026-08-22 15:46:12'),('e6327b791b500ae6a07e925a54daecc9',4,'2026-09-15 20:17:24','2026-09-01 21:35:50'),('e67657cb853f6eab93f110468d51ef1e',4,'2026-09-06 17:45:01','2026-09-06 17:00:54'),('e733ba0a9bec8f6cac6c7de8940dd337',4,'2026-08-19 21:13:55','2026-08-19 20:16:47'),('e774dcbdf27eb124fab195ba96628f5b',4,'2026-09-14 07:56:37','2026-08-31 11:59:14'),('e7c95e4544c706aec819251a7768c8da',4,'2026-09-28 13:41:27','2026-09-14 16:15:45'),('e86e97e60ba46129f0d88f7824472b39',5,'2026-08-30 16:23:18','2026-08-30 15:25:22'),('e9424c71ce5b247f7dbbd3288f7aaadd',4,'2026-09-10 06:52:25','2026-08-27 07:54:15'),('ea5b5b1c07bfe72ff1f40417f1ecfa33',5,'2026-09-11 18:27:44','2026-08-28 22:54:50'),('ea63651b07fafb28337c5116b057cd31',4,'2026-09-21 07:21:09','2026-09-07 09:04:34'),('ea691b470ddeb1c679bdae5b5c56c782',58,'2026-09-21 08:31:40','2026-09-07 09:36:59'),('ea988dcf7474c3375cfe9aa1d79a8f08',58,'2026-09-06 16:41:20','2026-09-06 16:08:45'),('ec6021514262b289818a78ea8f58b312',4,'2026-09-12 08:31:25','2026-08-29 10:07:26'),('ec73a646f4ef7396b85ec9bc854f38a7',4,'2026-09-01 15:40:20','2026-09-01 14:45:43'),('ec9e0a93a96c89b05e1491e032eb11a5',5,'2026-09-10 15:37:52','2026-08-27 15:37:54'),('eed07036ffd8e12ae28b5212bf8ddd97',21,'2026-09-12 17:36:37','2026-08-30 09:27:09'),('eef9c7c5a3e2b738b87121a61de69344',21,'2026-09-07 21:29:22','2026-08-26 07:05:21'),('ef2d968e2057d08e0e121c280f11e63e',21,'2026-09-05 17:01:45','2026-08-23 17:13:36'),('f0482b110d8090999cfc9d0e962f0112',4,'2026-08-28 21:51:37','2026-08-28 21:35:45'),('f070bf8c19c0194b9e9a137c40b21565',4,'2026-09-11 13:45:09','2026-08-28 15:38:28'),('f097b395fbff9b3a9d70484bbb2e3437',5,'2026-08-20 11:05:54','2026-08-20 10:07:28'),('f09f0299b3afd53426ec6c8b789276ed',4,'2026-09-21 18:12:59','2026-09-07 19:33:41'),('f16d3db0c3bfdfe94d243002cd2ab790',4,'2026-09-13 16:35:30','2026-08-30 17:49:54'),('f1e84c0a0acff72deaf4dafb2e8b1f95',5,'2026-08-20 11:30:55','2026-08-20 10:34:02'),('f23b42d860a92bf60fc852de956fdec5',4,'2026-09-11 17:51:45','2026-08-28 19:09:35'),('f25328e9780e4e0981a3303c087322fc',4,'2026-09-06 19:03:21','2026-09-06 18:05:45'),('f2897d6a510adfd78463d437bdbd4cd8',4,'2026-09-16 15:40:52','2026-09-02 17:08:53'),('f2bf56b5b867289e9bf9dc7ad9b0fccd',58,'2026-09-14 14:13:11','2026-09-02 07:55:22'),('f2ea55f3253c0507b37b3b69869d751a',4,'2026-09-13 17:49:54','2026-08-31 06:45:05'),('f3ad27ea9158ee91c90688e24d8db5fd',4,'2026-09-07 09:01:22','2026-09-07 08:01:36'),('f49bd13ea1bd376f1955740a2f479662',5,'2026-09-03 12:02:52','2026-08-20 13:20:29'),('f527cc5979bdca973d286e29e10e9a90',4,'2026-09-24 12:46:43','2026-09-10 22:45:32'),('f52d561b5cdff7fea527722bdd055ab8',4,'2026-09-21 10:58:38','2026-09-07 17:11:43'),('f7df65e3066729ee0d5b0aec6b72703b',4,'2026-09-28 16:15:48','2026-09-14 16:15:50'),('f91e9968842d50dab5c540941a981fae',58,'2026-09-08 09:21:31','2026-09-08 08:22:43'),('fa659ac6eef387edaa4e6681548f9ae0',58,'2026-09-14 21:25:10','2026-09-01 16:09:15'),('fce0c058ee9b981b6c82bfe031b58006',5,'2026-09-10 17:11:01','2026-08-27 18:37:41'),('fcfa9afb9cbc6980be2faec1d7a7c835',5,'2026-08-29 00:02:56','2026-08-28 23:13:31'),('fd050d94c7f95ddf1e3b07c6f4d75a0f',4,'2026-09-28 13:21:08','2026-09-14 13:21:09'),('fd5748a361389e8ce29e5a273ea59094',5,'2026-08-28 23:54:50','2026-08-28 22:54:57'),('ff23938c88980e6d755f65e5f218e930',5,'2026-08-22 16:13:13','2026-08-22 15:13:26'),('ff3314ea24516fa6a30d1cce4f16f3ef',4,'2026-09-14 14:58:18','2026-08-31 16:51:56');
/*!40000 ALTER TABLE `revoked_tokens` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (46,2,1,'2026-08-16 16:41:35'),(47,2,2,'2026-08-16 16:41:35'),(48,2,3,'2026-08-16 16:41:35'),(49,2,4,'2026-08-16 16:41:35'),(50,2,5,'2026-08-16 16:41:35'),(51,2,6,'2026-08-16 16:41:35'),(52,2,7,'2026-08-16 16:41:35'),(53,2,8,'2026-08-16 16:41:35'),(54,2,9,'2026-08-16 16:41:35'),(55,2,10,'2026-08-16 16:41:35'),(56,2,11,'2026-08-16 16:41:35'),(57,2,12,'2026-08-16 16:41:35'),(58,2,13,'2026-08-16 16:41:35'),(59,2,14,'2026-08-16 16:41:35'),(60,2,15,'2026-08-16 16:41:35'),(61,2,16,'2026-08-16 16:41:35'),(62,2,17,'2026-08-16 16:41:35'),(63,2,18,'2026-08-16 16:41:35'),(64,2,19,'2026-08-16 16:41:35'),(65,2,20,'2026-08-16 16:41:35'),(66,2,21,'2026-08-16 16:41:35'),(67,2,22,'2026-08-16 16:41:35'),(68,2,23,'2026-08-16 16:41:35'),(69,2,24,'2026-08-16 16:41:35'),(70,2,25,'2026-08-16 16:41:35'),(71,2,26,'2026-08-16 16:41:35'),(72,2,27,'2026-08-16 16:41:35'),(73,2,28,'2026-08-16 16:41:35'),(74,2,29,'2026-08-16 16:41:35'),(75,2,30,'2026-08-16 16:41:35'),(76,2,31,'2026-08-16 16:41:35'),(77,2,32,'2026-08-16 16:41:35'),(78,2,33,'2026-08-16 16:41:35'),(79,2,34,'2026-08-16 16:41:35'),(80,2,35,'2026-08-16 16:41:35'),(81,2,36,'2026-08-16 16:41:35'),(82,2,37,'2026-08-16 16:41:35'),(83,2,38,'2026-08-16 16:41:35'),(84,2,39,'2026-08-16 16:41:35'),(85,2,40,'2026-08-16 16:41:35'),(86,2,41,'2026-08-16 16:41:35'),(87,2,42,'2026-08-16 16:41:35'),(88,2,43,'2026-08-16 16:41:35'),(89,2,44,'2026-08-16 16:41:35'),(90,2,45,'2026-08-16 16:41:35'),(91,3,1,'2026-08-16 16:41:35'),(92,3,5,'2026-08-16 16:41:35'),(93,3,6,'2026-08-16 16:41:35'),(94,3,7,'2026-08-16 16:41:35'),(95,3,8,'2026-08-16 16:41:35'),(96,3,9,'2026-08-16 16:41:35'),(97,3,10,'2026-08-16 16:41:35'),(98,3,11,'2026-08-16 16:41:35'),(99,3,12,'2026-08-16 16:41:35'),(100,3,13,'2026-08-16 16:41:35'),(101,3,14,'2026-08-16 16:41:35'),(102,3,15,'2026-08-16 16:41:35'),(103,3,16,'2026-08-16 16:41:35'),(104,3,17,'2026-08-16 16:41:35'),(105,3,18,'2026-08-16 16:41:35'),(106,3,21,'2026-08-16 16:41:35'),(107,3,22,'2026-08-16 16:41:35'),(108,3,27,'2026-08-16 16:41:35'),(109,3,28,'2026-08-16 16:41:35'),(110,3,29,'2026-08-16 16:41:35'),(111,3,31,'2026-08-16 16:41:35'),(112,3,33,'2026-08-16 16:41:35'),(113,3,34,'2026-08-16 16:41:35'),(114,3,35,'2026-08-16 16:41:35'),(115,3,36,'2026-08-16 16:41:35'),(116,3,37,'2026-08-16 16:41:35'),(117,3,38,'2026-08-16 16:41:35'),(118,3,39,'2026-08-16 16:41:35'),(119,3,40,'2026-08-16 16:41:35'),(120,3,41,'2026-08-16 16:41:35'),(121,3,42,'2026-08-16 16:41:35'),(122,3,43,'2026-08-16 16:41:35'),(123,3,44,'2026-08-16 16:41:35'),(124,3,45,'2026-08-16 16:41:35'),(143,5,1,'2026-08-16 16:41:35'),(144,5,5,'2026-08-16 16:41:35'),(238,8,1,'2026-08-19 21:33:36'),(239,8,5,'2026-08-19 21:33:36'),(240,8,8,'2026-08-19 21:33:36'),(241,8,9,'2026-08-19 21:33:36'),(242,8,10,'2026-08-19 21:33:36'),(243,8,12,'2026-08-19 21:33:36'),(244,8,13,'2026-08-19 21:33:36'),(245,8,15,'2026-08-19 21:33:36'),(246,8,16,'2026-08-19 21:33:36'),(247,8,27,'2026-08-19 21:33:36'),(248,8,29,'2026-08-19 21:33:36'),(249,8,31,'2026-08-19 21:33:36'),(250,8,21,'2026-08-19 21:33:36'),(251,8,38,'2026-08-19 21:33:36'),(252,8,40,'2026-08-19 21:33:36'),(253,8,41,'2026-08-19 21:33:36'),(254,8,42,'2026-08-19 21:33:36'),(255,8,43,'2026-08-19 21:33:36'),(256,8,44,'2026-08-19 21:33:36'),(257,8,45,'2026-08-19 21:33:36'),(351,2,46,'2026-08-22 16:01:35'),(392,3,46,'2026-08-22 16:01:35'),(497,2,47,'2026-08-28 19:27:53'),(535,2,48,'2026-08-30 14:24:38'),(536,2,49,'2026-08-30 14:24:38'),(539,3,48,'2026-08-30 14:25:26'),(540,3,49,'2026-08-30 14:25:26'),(541,8,48,'2026-08-30 14:25:26'),(543,6,1,'2026-08-30 15:22:58'),(544,6,18,'2026-08-30 15:22:58'),(545,6,19,'2026-08-30 15:22:58'),(546,6,20,'2026-08-30 15:22:58'),(547,6,21,'2026-08-30 15:22:58'),(548,6,25,'2026-08-30 15:22:58'),(549,6,27,'2026-08-30 15:22:58'),(550,6,29,'2026-08-30 15:22:58'),(551,6,31,'2026-08-30 15:22:58'),(552,6,38,'2026-08-30 15:22:58'),(553,6,39,'2026-08-30 15:22:58'),(554,6,46,'2026-08-30 15:22:58'),(555,6,48,'2026-08-30 15:22:58'),(556,4,1,'2026-08-30 15:25:06'),(557,4,5,'2026-08-30 15:25:06'),(558,4,8,'2026-08-30 15:25:06'),(559,4,9,'2026-08-30 15:25:06'),(560,4,12,'2026-08-30 15:25:06'),(561,4,13,'2026-08-30 15:25:06'),(562,4,14,'2026-08-30 15:25:06'),(563,4,15,'2026-08-30 15:25:06'),(564,4,16,'2026-08-30 15:25:06'),(565,4,21,'2026-08-30 15:25:06'),(566,4,29,'2026-08-30 15:25:06'),(567,4,31,'2026-08-30 15:25:06'),(568,4,38,'2026-08-30 15:25:06'),(569,4,40,'2026-08-30 15:25:06'),(570,4,41,'2026-08-30 15:25:06'),(571,4,42,'2026-08-30 15:25:06'),(572,4,43,'2026-08-30 15:25:06'),(573,4,44,'2026-08-30 15:25:06'),(574,4,48,'2026-08-30 15:25:06'),(575,4,27,'2026-08-30 17:17:27'),(577,2,50,'2026-09-06 16:13:24'),(578,3,50,'2026-09-06 16:13:24'),(579,6,50,'2026-09-06 16:13:24'),(580,8,50,'2026-09-06 16:13:24'),(581,6,51,'2026-09-12 17:04:59'),(582,6,52,'2026-09-12 17:04:59'),(583,3,51,'2026-09-12 17:04:59'),(584,3,52,'2026-09-12 17:04:59'),(585,2,52,'2026-09-13 01:20:03'),(586,2,51,'2026-09-13 01:20:03'),(588,1,1,'2026-09-12 17:43:48'),(589,1,2,'2026-09-12 17:43:48'),(590,1,3,'2026-09-12 17:43:48'),(591,1,4,'2026-09-12 17:43:48'),(592,1,5,'2026-09-12 17:43:48'),(593,1,6,'2026-09-12 17:43:48'),(594,1,7,'2026-09-12 17:43:48'),(595,1,8,'2026-09-12 17:43:48'),(596,1,9,'2026-09-12 17:43:48'),(597,1,10,'2026-09-12 17:43:48'),(598,1,11,'2026-09-12 17:43:48'),(599,1,12,'2026-09-12 17:43:48'),(600,1,13,'2026-09-12 17:43:48'),(601,1,14,'2026-09-12 17:43:48'),(602,1,15,'2026-09-12 17:43:48'),(603,1,16,'2026-09-12 17:43:48'),(604,1,17,'2026-09-12 17:43:48'),(605,1,18,'2026-09-12 17:43:48'),(606,1,19,'2026-09-12 17:43:48'),(607,1,20,'2026-09-12 17:43:48'),(608,1,21,'2026-09-12 17:43:48'),(609,1,22,'2026-09-12 17:43:48'),(610,1,23,'2026-09-12 17:43:48'),(611,1,24,'2026-09-12 17:43:48'),(612,1,25,'2026-09-12 17:43:48'),(613,1,26,'2026-09-12 17:43:48'),(614,1,27,'2026-09-12 17:43:48'),(615,1,28,'2026-09-12 17:43:48'),(616,1,29,'2026-09-12 17:43:48'),(617,1,30,'2026-09-12 17:43:48'),(618,1,31,'2026-09-12 17:43:48'),(619,1,32,'2026-09-12 17:43:48'),(620,1,33,'2026-09-12 17:43:48'),(621,1,34,'2026-09-12 17:43:48'),(622,1,35,'2026-09-12 17:43:48'),(623,1,36,'2026-09-12 17:43:48'),(624,1,37,'2026-09-12 17:43:48'),(625,1,38,'2026-09-12 17:43:48'),(626,1,39,'2026-09-12 17:43:48'),(627,1,40,'2026-09-12 17:43:48'),(628,1,41,'2026-09-12 17:43:48'),(629,1,42,'2026-09-12 17:43:48'),(630,1,43,'2026-09-12 17:43:48'),(631,1,44,'2026-09-12 17:43:48'),(632,1,45,'2026-09-12 17:43:48'),(633,1,46,'2026-09-12 17:43:48'),(634,1,47,'2026-09-12 17:43:48'),(635,1,48,'2026-09-12 17:43:48'),(636,1,49,'2026-09-12 17:43:48'),(637,1,50,'2026-09-12 17:43:48'),(638,1,51,'2026-09-12 17:43:48'),(639,1,52,'2026-09-12 17:43:48'),(640,6,53,'2026-09-13 17:06:38'),(641,6,54,'2026-09-13 17:06:38'),(642,3,53,'2026-09-13 17:06:38'),(643,3,54,'2026-09-13 17:06:38'),(644,8,53,'2026-09-13 17:06:38'),(645,8,54,'2026-09-13 17:06:38'),(646,4,53,'2026-09-13 17:06:38'),(647,1,54,'2026-09-14 01:22:04'),(648,1,53,'2026-09-14 01:22:04'),(649,2,54,'2026-09-14 01:22:04'),(650,2,53,'2026-09-14 01:22:04');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,1,'Super Admin','Full access across the entire system',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(2,1,'Company Admin','Full access within their company',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(3,1,'Store Manager','Manages day-to-day store operations',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(4,1,'Cashier','Rings up sales at the POS terminal',1,'2026-08-16 16:41:35','2026-08-31 14:24:31'),(5,1,'Bagger','Assists with packing and stock visibility only',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(6,1,'Store Admin','Full access, typically scoped to specific stores via Store Access',1,'2026-08-19 19:46:00','2026-08-19 19:46:00'),(8,1,'Cashier Supervisor','Supervises cashiers — can void sales and approve returns',1,'2026-08-19 21:33:36','2026-08-19 21:33:36');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `store_product_prices`
--

LOCK TABLES `store_product_prices` WRITE;
/*!40000 ALTER TABLE `store_product_prices` DISABLE KEYS */;
/*!40000 ALTER TABLE `store_product_prices` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `stores`
--

LOCK TABLES `stores` WRITE;
/*!40000 ALTER TABLE `stores` DISABLE KEYS */;
INSERT INTO `stores` VALUES (19,1,'Ermita Branch - Grocery & Bakery','101','8th Floor, Ayala Tower One, Makati City',NULL,'123-456-789-001','SN2024EX00101','MIN-2024-0001-0101','PTU-2026-0001-0101',NULL,NULL,1,NULL,NULL,1,'2026-09-15 15:56:59','2026-09-15 15:56:59'),(20,1,'Head Office','000','6750 Ayala Avenue, Makati',NULL,'123-456-789-000',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,1,'2026-09-15 15:56:59','2026-09-15 15:56:59'),(21,1,'Cebu Branch','102','Lahug, Cebu City',NULL,'123-456-789-002','SN2024EX00102','MIN-2024-0002-0102',NULL,NULL,NULL,1,NULL,NULL,1,'2026-09-15 15:56:59','2026-09-15 15:56:59');
/*!40000 ALTER TABLE `stores` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tax_rates`
--

LOCK TABLES `tax_rates` WRITE;
/*!40000 ALTER TABLE `tax_rates` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_rates` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `transaction_counters`
--

LOCK TABLES `transaction_counters` WRITE;
/*!40000 ALTER TABLE `transaction_counters` DISABLE KEYS */;
/*!40000 ALTER TABLE `transaction_counters` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `units`
--

LOCK TABLES `units` WRITE;
/*!40000 ALTER TABLE `units` DISABLE KEYS */;
INSERT INTO `units` VALUES (1,'Pieces','PCS',0,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(2,'Kilogram','KG',3,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(3,'Gram','G',0,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(4,'Liter','L',3,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(5,'Milliliter','ML',0,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(6,'Meter','M',3,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(7,'Box','BOX',0,'2026-08-16 16:41:35','2026-08-16 16:41:35');
/*!40000 ALTER TABLE `units` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `user_stores`
--

LOCK TABLES `user_stores` WRITE;
/*!40000 ALTER TABLE `user_stores` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_stores` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (4,1,1,'Admininstrator','admin@yahoo.com','admin1','$2y$12$BC26wwQ6qsRPI2cgwFO/gOWl7iMMt7H4oEmxxgAytHL8nzbRm7AiW',1,NULL,'2026-09-14 08:04:15',NULL,NULL,1,'2026-09-14 13:41:27','2026-08-18 21:18:33','2026-09-14 13:41:27'),(5,1,6,'Store Admin 101','storeadmin101@yahoo.com','storeadmin101','$2y$12$AJ1oWcROTXkDkuUoWZ3zJu5RfQmX9FpWWkz6x6jVIedKU5ZDx8PB.',0,NULL,'2026-08-19 21:26:54',NULL,NULL,1,'2026-08-30 15:23:18','2026-08-19 19:53:08','2026-08-30 15:23:18'),(21,1,6,'Store Admin 102','storeadmin102@yahoo.com','storeadmin102','$2y$12$AJ1oWcROTXkDkuUoWZ3zJu5RfQmX9FpWWkz6x6jVIedKU5ZDx8PB.',0,NULL,'2026-08-19 21:48:24',NULL,NULL,1,'2026-08-29 15:10:20','2026-08-19 21:48:24','2026-08-29 15:10:20'),(49,1,NULL,'test','s@ya.co','s','$2y$12$YsAk3IYW3tAGP3TcuTmvR.X8sQP2XiapiBjMr0VHt/ZDind.vGqRK',0,NULL,'2026-08-20 11:00:58',NULL,NULL,0,NULL,'2026-08-20 11:00:57','2026-08-27 20:01:02'),(58,1,4,'Cashier1 101','cashier1_101@yahoo.com','cashier1_101','$2y$12$5FOZTKSV7E.uJiFIPi4pMeHV0Wr0H4tOSkoz8L6D5AudTNYcW8fUK',0,NULL,'2026-08-30 15:26:39','2026-09-14 21:50:32',NULL,1,'2026-09-14 21:50:32','2026-08-20 12:16:58','2026-09-14 21:50:32'),(64,1,4,'Cashier2 101','cashier2_101@yahoo.com','cashier2_101','$2y$12$bLTcoluYxN.ms7M5ns7LbuMiUfPOpn9v5l1HCsz2QiT9idkM5KREa',0,NULL,'2026-08-20 13:24:27',NULL,NULL,1,NULL,'2026-08-20 13:24:27','2026-08-22 15:08:13'),(67,1,4,'cashier3 101','cashier3_101@yahoo.com','cashier3_101','$2y$12$3kecXpP4nZt8qVztXvZA/.TWKTqsl61ybyIREu2.BxIjWmdKI.lNe',0,NULL,'2026-08-22 15:08:47',NULL,NULL,1,NULL,'2026-08-22 15:08:47','2026-08-22 15:08:47'),(68,1,8,'cashiersup1 101','cashiersup1_101@yahoo.com','cashiersup1_101','$2y$12$WyjmgBoXqiajr06Uzc6MsO6GapaqRinFf2X7jw2PWiHCYneUWPLyC',0,NULL,'2026-08-22 15:10:56',NULL,NULL,1,NULL,'2026-08-22 15:10:56','2026-08-23 18:27:41'),(127,1,8,'Cashier Sup2 102','cashiersup2102@yahoo.com','cashiersup2102','$2y$10$6uwOgskoy/CAiK7IGeL2oOsh0Z3PdxxGzLuce/2GQkbu8eHce4ZeO',0,NULL,'2026-08-27 20:50:49',NULL,NULL,1,NULL,'2026-08-27 20:50:49','2026-08-27 20:50:49'),(147,1,1,'QA Regression Tester','qa.regression@pos-system.local','qa_regression','$2y$10$6ur6nFhC4Oajf./tJbGd1.SY61slPoLtCipnx/X4d4XFmC.3YF/Wy',0,NULL,NULL,NULL,NULL,1,'2026-09-11 20:25:01','2026-08-30 02:20:59','2026-09-11 20:25:01'),(198,1,5,'Bagger 1 101','bagger1_101@yahoo.com','bagger1_101','$2y$10$osC76RUBvTZfmqtIZvD6UuRbvCwUUY3Vdwqzu6l4OFDqwhZPX2jii',0,NULL,'2026-08-31 17:09:44',NULL,NULL,1,NULL,'2026-08-31 17:09:44','2026-08-31 17:09:44'),(222,1,4,'Cashier1 102','cashier1_102@yahoo.com','cashier2_102','$2y$10$1M2Aygo4/KdEEzcAepWh3uPaWmSF0B1VPdKvwiBuqS9dgZESewgt6',0,NULL,'2026-09-01 18:26:55',NULL,NULL,1,'2026-09-01 18:27:06','2026-09-01 18:26:55','2026-09-01 18:27:06');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `z_readings`
--

LOCK TABLES `z_readings` WRITE;
/*!40000 ALTER TABLE `z_readings` DISABLE KEYS */;
/*!40000 ALTER TABLE `z_readings` ENABLE KEYS */;
UNLOCK TABLES;

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

-- Dump completed on 2026-09-17  1:29:52
