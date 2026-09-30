-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: pos_system
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
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2024 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1941,1,4,'Admininstrator','dev-reset','System',NULL,'Transaction data reset','{\"tables\":[\"return_items\",\"returns\",\"cash_movements\",\"payments\",\"sale_items\",\"sales\",\"cash_sessions\",\"loyalty_point_transactions\",\"z_readings\",\"audit_logs\",\"transaction_counters\"]}','192.168.100.78','2026-09-26 12:02:56'),(1942,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.78','2026-09-26 12:19:57'),(1943,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.78','2026-09-26 12:20:04'),(1944,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.78','2026-09-26 12:21:28'),(1945,1,147,'QA Regression Tester','update','User',400,'QA Chat Creator Check','{\"role_id\":{\"old\":\"1\",\"new\":\"12\"},\"is_active\":{\"old\":\"0\",\"new\":\"1\"}}','192.168.100.78','2026-09-26 12:21:28'),(1946,1,147,'QA Regression Tester','create','User',401,'QA Delete Target Clean','{\"id\":\"401\",\"company_id\":\"1\",\"role_id\":\"1\",\"name\":\"QA Delete Target Clean\",\"email\":\"qa.delete.clean@pos-system.local\",\"username\":\"qa_delete_clean\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-26 12:21:44\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-26 12:21:44\",\"updated_at\":\"2026-09-26 12:21:44\"}','192.168.100.78','2026-09-26 12:21:44'),(1947,1,147,'QA Regression Tester','create','User',402,'QA Delete Target History','{\"id\":\"402\",\"company_id\":\"1\",\"role_id\":\"1\",\"name\":\"QA Delete Target History\",\"email\":\"qa.delete.history@pos-system.local\",\"username\":\"qa_delete_history\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-26 12:21:45\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-26 12:21:45\",\"updated_at\":\"2026-09-26 12:21:45\"}','192.168.100.78','2026-09-26 12:21:45'),(1948,1,NULL,'QA Delete Target History','login','User',402,'QA Delete Target History',NULL,'192.168.100.78','2026-09-26 12:21:54'),(1949,1,400,'QA Chat Creator Check','login','User',400,'QA Chat Creator Check',NULL,'192.168.100.78','2026-09-26 12:22:18'),(1950,1,400,'QA Chat Creator Check','login','User',400,'QA Chat Creator Check',NULL,'192.168.100.78','2026-09-26 12:22:47'),(1951,1,400,'QA Chat Creator Check','login','User',400,'QA Chat Creator Check',NULL,'192.168.100.78','2026-09-26 12:23:47'),(1952,1,400,'QA Chat Creator Check','login','User',400,'QA Chat Creator Check',NULL,'192.168.100.78','2026-09-26 12:24:21'),(1953,1,400,'QA Chat Creator Check','login','User',400,'QA Chat Creator Check',NULL,'192.168.100.78','2026-09-26 12:25:16'),(1954,1,400,'QA Chat Creator Check','login','User',400,'QA Chat Creator Check',NULL,'192.168.100.78','2026-09-26 12:26:10'),(1955,1,147,'QA Regression Tester','update','User',401,'QA Delete Target Clean','{\"role_id\":{\"old\":\"1\",\"new\":\"12\"}}','192.168.100.78','2026-09-26 12:26:32'),(1956,1,147,'QA Regression Tester','update','User',402,'QA Delete Target History','{\"role_id\":{\"old\":\"1\",\"new\":\"12\"}}','192.168.100.78','2026-09-26 12:26:32'),(1957,1,400,'QA Chat Creator Check','login','User',400,'QA Chat Creator Check',NULL,'192.168.100.78','2026-09-26 12:26:41'),(1958,1,400,'QA Chat Creator Check','delete','User',401,'QA Delete Target Clean',NULL,'192.168.100.78','2026-09-26 12:26:50'),(1959,1,147,'QA Regression Tester','update','User',402,'QA Delete Target History','{\"is_active\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.78','2026-09-26 12:27:05'),(1960,1,147,'QA Regression Tester','update','User',400,'QA Chat Creator Check','{\"role_id\":{\"old\":\"12\",\"new\":\"1\"},\"is_active\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.78','2026-09-26 12:27:06'),(1961,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.78','2026-09-26 12:27:18'),(1962,1,4,'Admininstrator','delete','User',198,'Bagger 1 101',NULL,'192.168.100.78','2026-09-26 13:19:53'),(1963,1,4,'Admininstrator','delete','User',127,'Cashier Sup2 102',NULL,'192.168.100.78','2026-09-26 13:19:56'),(1964,1,4,'Admininstrator','delete','User',58,'Cashier1 101',NULL,'192.168.100.78','2026-09-26 13:19:59'),(1965,1,4,'Admininstrator','delete','User',222,'Cashier1 102',NULL,'192.168.100.78','2026-09-26 13:20:10'),(1966,1,4,'Admininstrator','delete','User',64,'Cashier2 101',NULL,'192.168.100.78','2026-09-26 13:20:12'),(1967,1,4,'Admininstrator','delete','User',67,'cashier3 101',NULL,'192.168.100.78','2026-09-26 13:20:17'),(1968,1,4,'Admininstrator','delete','User',68,'cashiersup1 101',NULL,'192.168.100.78','2026-09-26 13:20:19'),(1969,1,4,'Admininstrator','login-failed','User',4,'Admininstrator','{\"reason\":\"Incorrect password\"}','10.152.239.20','2026-09-26 14:30:45'),(1970,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'10.152.239.20','2026-09-26 14:30:52'),(1971,1,4,'Admininstrator','delete','User',49,'test',NULL,'10.152.239.20','2026-09-26 14:31:10'),(1972,1,4,'Admininstrator','delete','User',5,'Store Admin 101',NULL,'10.152.239.20','2026-09-26 14:44:56'),(1973,1,4,'Admininstrator','delete','User',21,'Store Admin 102',NULL,'10.152.239.20','2026-09-26 14:44:59'),(1974,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'10.152.239.20','2026-09-26 14:48:46'),(1975,1,4,'Admininstrator','delete','User',402,'QA Delete Target History',NULL,'10.152.239.20','2026-09-26 14:51:22'),(1976,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'10.152.239.20','2026-09-26 15:15:56'),(1977,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'10.152.239.20','2026-09-26 16:41:06'),(1978,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.78','2026-09-27 08:19:01'),(1979,1,4,'Admininstrator','create','User',403,'company admin','{\"id\":\"403\",\"company_id\":\"1\",\"role_id\":\"2\",\"name\":\"company admin\",\"email\":null,\"username\":\"companyadmin\",\"failed_login_attempts\":\"0\",\"locked_until\":null,\"password_changed_at\":\"2026-09-27 10:22:13\",\"session_valid_from\":null,\"phone\":null,\"is_active\":\"1\",\"last_login_at\":null,\"created_at\":\"2026-09-27 10:22:13\",\"updated_at\":\"2026-09-27 10:22:13\"}','192.168.100.78','2026-09-27 10:22:14'),(1980,1,403,'company admin','login','User',403,'company admin',NULL,'192.168.100.78','2026-09-27 10:22:34'),(1981,1,4,'Admininstrator','update','Role',2,'Company Admin','{\"description\":{\"old\":\"Full access within their company\",\"new\":\"Full access within their company and system\"}}','192.168.100.78','2026-09-27 10:30:03'),(1982,1,403,'company admin','logout','User',403,NULL,NULL,'192.168.100.78','2026-09-27 10:32:33'),(1983,1,403,'company admin','login','User',403,'company admin',NULL,'192.168.100.78','2026-09-27 10:32:41'),(1984,1,403,'company admin','login','User',403,'company admin',NULL,'192.168.100.78','2026-09-27 12:23:56'),(1985,1,403,'company admin','update','Company',1,NULL,'{\"legal_name\":{\"old\":null,\"new\":\"PUREGOLD PRICE CLUB INC\"},\"tax_id\":{\"old\":null,\"new\":\"11111\"},\"is_vat_registered\":{\"old\":\"0\",\"new\":\"1\"},\"vat_registration_number\":{\"old\":null,\"new\":\"22222\"}}','192.168.100.78','2026-09-27 14:11:36'),(1986,1,403,'company admin','create','Store',27,'PUREGOLD DAU','{\"id\":\"27\",\"company_id\":\"1\",\"name\":\"PUREGOLD DAU\",\"code\":\"101\",\"opening_float_mode\":\"fixed\",\"default_opening_float\":\"3000.00\",\"address\":null,\"receipt_footer_note\":\"Thank you, come again\",\"vat_reg_tin\":\"22222\",\"pos_serial_no\":\"222\",\"min_no\":\"22\",\"ptu_number\":\"22\",\"ptu_date_issued\":null,\"ptu_valid_until\":null,\"show_bir_details\":\"1\",\"phone\":null,\"email\":null,\"is_active\":\"1\",\"created_at\":\"2026-09-27 14:12:43\",\"updated_at\":\"2026-09-27 14:12:43\"}','192.168.100.78','2026-09-27 14:12:43'),(1987,1,403,'company admin','create','Store',28,'PUREGOLD SHAW','{\"id\":\"28\",\"company_id\":\"1\",\"name\":\"PUREGOLD SHAW\",\"code\":\"102\",\"opening_float_mode\":\"fixed\",\"default_opening_float\":\"5000.00\",\"address\":\"SHAW\",\"receipt_footer_note\":\"Thank you, come again\",\"vat_reg_tin\":\"222\",\"pos_serial_no\":\"33\",\"min_no\":\"S\",\"ptu_number\":null,\"ptu_date_issued\":null,\"ptu_valid_until\":null,\"show_bir_details\":\"1\",\"phone\":null,\"email\":null,\"is_active\":\"1\",\"created_at\":\"2026-09-27 14:19:19\",\"updated_at\":\"2026-09-27 14:19:19\"}','192.168.100.78','2026-09-27 14:19:19'),(1988,1,403,'company admin','create','Store',29,'PUREGOLD CAFE FERNANDINO','{\"id\":\"29\",\"company_id\":\"1\",\"name\":\"PUREGOLD CAFE FERNANDINO\",\"code\":\"232\",\"opening_float_mode\":\"manual\",\"default_opening_float\":null,\"address\":\"SANNN FERNANDO\",\"receipt_footer_note\":\"Thank you, come again\",\"vat_reg_tin\":\"222\",\"pos_serial_no\":\"333\",\"min_no\":null,\"ptu_number\":null,\"ptu_date_issued\":null,\"ptu_valid_until\":null,\"show_bir_details\":\"1\",\"phone\":null,\"email\":null,\"is_active\":\"1\",\"created_at\":\"2026-09-27 14:20:08\",\"updated_at\":\"2026-09-27 14:20:08\"}','192.168.100.78','2026-09-27 14:20:08'),(1989,1,403,'company admin','create','Store',30,'PUREGOLD ARAYAT','{\"id\":\"30\",\"company_id\":\"1\",\"name\":\"PUREGOLD ARAYAT\",\"code\":\"180\",\"opening_float_mode\":\"fixed\",\"default_opening_float\":\"5000.00\",\"address\":\"ARAYAT\",\"receipt_footer_note\":\"Thank you, come again\",\"vat_reg_tin\":\"55\",\"pos_serial_no\":\"33\",\"min_no\":\"11\",\"ptu_number\":\"553\",\"ptu_date_issued\":null,\"ptu_valid_until\":null,\"show_bir_details\":\"1\",\"phone\":\"999\",\"email\":null,\"is_active\":\"1\",\"created_at\":\"2026-09-27 14:28:44\",\"updated_at\":\"2026-09-27 14:28:44\"}','192.168.100.78','2026-09-27 14:28:44'),(1990,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.78','2026-09-27 16:09:02'),(1991,1,147,'QA Regression Tester','create','Register',22,'POS 1','{\"id\":\"22\",\"store_id\":\"27\",\"name\":\"POS 1\",\"code\":\"POS-1\",\"grand_total\":\"0.00\",\"z_counter\":\"0\",\"reset_counter\":\"0\",\"is_training_mode\":\"0\",\"is_active\":\"1\",\"created_at\":\"2026-09-27 16:09:02\",\"updated_at\":\"2026-09-27 16:09:02\"}','192.168.100.78','2026-09-27 16:09:02'),(1992,1,147,'QA Regression Tester','create','Register',23,'POS 1','{\"id\":\"23\",\"store_id\":\"28\",\"name\":\"POS 1\",\"code\":\"POS-1\",\"grand_total\":\"0.00\",\"z_counter\":\"0\",\"reset_counter\":\"0\",\"is_training_mode\":\"0\",\"is_active\":\"1\",\"created_at\":\"2026-09-27 16:09:02\",\"updated_at\":\"2026-09-27 16:09:02\"}','192.168.100.78','2026-09-27 16:09:02'),(1993,1,147,'QA Regression Tester','create','Register',24,'POS 1','{\"id\":\"24\",\"store_id\":\"29\",\"name\":\"POS 1\",\"code\":\"POS-1\",\"grand_total\":\"0.00\",\"z_counter\":\"0\",\"reset_counter\":\"0\",\"is_training_mode\":\"0\",\"is_active\":\"1\",\"created_at\":\"2026-09-27 16:09:02\",\"updated_at\":\"2026-09-27 16:09:02\"}','192.168.100.78','2026-09-27 16:09:02'),(1994,1,147,'QA Regression Tester','create','Register',25,'POS 1','{\"id\":\"25\",\"store_id\":\"30\",\"name\":\"POS 1\",\"code\":\"POS-1\",\"grand_total\":\"0.00\",\"z_counter\":\"0\",\"reset_counter\":\"0\",\"is_training_mode\":\"0\",\"is_active\":\"1\",\"created_at\":\"2026-09-27 16:09:02\",\"updated_at\":\"2026-09-27 16:09:02\"}','192.168.100.78','2026-09-27 16:09:02'),(1995,1,403,'company admin','update','Register',22,'POS 1','{\"code\":{\"old\":\"POS-1\",\"new\":\"001\"}}','192.168.100.78','2026-09-27 16:15:15'),(1996,1,403,'company admin','update','Register',23,'POS 1','{\"code\":{\"old\":\"POS-1\",\"new\":\"001\"}}','192.168.100.78','2026-09-27 16:15:20'),(1997,1,403,'company admin','update','Register',24,'POS 1','{\"code\":{\"old\":\"POS-1\",\"new\":\"001\"}}','192.168.100.78','2026-09-27 16:15:26'),(1998,1,403,'company admin','update','Register',25,'POS 1','{\"code\":{\"old\":\"POS-1\",\"new\":\"001\"}}','192.168.100.78','2026-09-27 16:15:31'),(1999,1,403,'company admin','create','Register',26,'POS 2','{\"id\":\"26\",\"store_id\":\"30\",\"name\":\"POS 2\",\"code\":\"002\",\"grand_total\":\"0.00\",\"z_counter\":\"0\",\"reset_counter\":\"0\",\"is_training_mode\":\"0\",\"is_active\":\"1\",\"created_at\":\"2026-09-27 16:15:44\",\"updated_at\":\"2026-09-27 16:15:44\"}','192.168.100.78','2026-09-27 16:15:44'),(2000,1,403,'company admin','create','Register',27,'POS 2','{\"id\":\"27\",\"store_id\":\"29\",\"name\":\"POS 2\",\"code\":\"002\",\"grand_total\":\"0.00\",\"z_counter\":\"0\",\"reset_counter\":\"0\",\"is_training_mode\":\"0\",\"is_active\":\"1\",\"created_at\":\"2026-09-27 16:16:01\",\"updated_at\":\"2026-09-27 16:16:01\"}','192.168.100.78','2026-09-27 16:16:01'),(2001,1,403,'company admin','create','Register',30,'POS 2','{\"id\":\"30\",\"store_id\":\"27\",\"name\":\"POS 2\",\"code\":\"002\",\"grand_total\":\"0.00\",\"z_counter\":\"0\",\"reset_counter\":\"0\",\"is_training_mode\":\"0\",\"is_active\":\"1\",\"created_at\":\"2026-09-27 16:16:24\",\"updated_at\":\"2026-09-27 16:16:24\"}','192.168.100.78','2026-09-27 16:16:24'),(2002,1,403,'company admin','create','Register',31,'POS 2','{\"id\":\"31\",\"store_id\":\"28\",\"name\":\"POS 2\",\"code\":\"002\",\"grand_total\":\"0.00\",\"z_counter\":\"0\",\"reset_counter\":\"0\",\"is_training_mode\":\"0\",\"is_active\":\"1\",\"created_at\":\"2026-09-27 16:16:47\",\"updated_at\":\"2026-09-27 16:16:47\"}','192.168.100.78','2026-09-27 16:16:47'),(2003,1,403,'company admin','update','Register',22,'POS2','{\"name\":{\"old\":\"POS 1\",\"new\":\"POS2\"}}','192.168.100.78','2026-09-27 16:17:09'),(2004,1,403,'company admin','update','Register',22,'POS 1','{\"name\":{\"old\":\"POS2\",\"new\":\"POS 1\"}}','192.168.100.78','2026-09-27 16:17:17'),(2005,1,403,'company admin','update','Company',1,NULL,'{\"loyalty_enabled\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.78','2026-09-27 16:29:18'),(2006,1,403,'company admin','update','Company',1,NULL,'{\"loyalty_enabled\":{\"old\":\"0\",\"new\":\"1\"}}','192.168.100.78','2026-09-27 16:29:23'),(2007,1,4,'Admininstrator','login','User',4,'Admininstrator',NULL,'192.168.100.78','2026-09-27 16:30:24'),(2008,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.78','2026-09-27 16:32:26'),(2009,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.78','2026-09-27 16:43:26'),(2010,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.78','2026-09-27 16:49:45'),(2011,1,4,'Admininstrator','update','Company',1,NULL,'{\"loyalty_enabled\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.78','2026-09-27 16:55:13'),(2012,1,403,'company admin','logout','User',403,NULL,NULL,'192.168.100.78','2026-09-27 16:58:04'),(2013,1,403,'company admin','login','User',403,'company admin',NULL,'192.168.100.78','2026-09-27 16:58:15'),(2014,1,4,'Admininstrator','update','Company',1,NULL,'{\"loyalty_enabled\":{\"old\":\"0\",\"new\":\"1\"}}','192.168.100.78','2026-09-27 17:16:05'),(2015,1,4,'Admininstrator','update','Company',1,NULL,'{\"loyalty_enabled\":{\"old\":\"1\",\"new\":\"0\"}}','192.168.100.78','2026-09-27 17:16:25'),(2016,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.78','2026-09-27 17:26:08'),(2017,1,147,'QA Regression Tester','login','User',147,'QA Regression Tester',NULL,'192.168.100.78','2026-09-29 16:42:03'),(2018,1,4,'Admininstrator','create','Invoice Series',10,NULL,'{\"id\":\"10\",\"company_id\":\"1\",\"store_id\":\"30\",\"invoice_type\":\"Sales Invoice\",\"series_code\":\"2026\",\"prefix\":\"SI-\",\"suffix\":null,\"starting_number\":\"1\",\"current_number\":\"0\",\"maximum_number\":\"99999999\",\"number_length\":\"8\",\"warning_threshold\":\"10000\",\"critical_threshold\":\"1000\",\"effective_from\":\"2026-09-29\",\"effective_to\":null,\"status\":\"active\",\"created_by\":\"4\",\"updated_by\":\"4\",\"created_at\":\"2026-09-29 18:35:10\",\"updated_at\":\"2026-09-29 18:35:10\"}','192.168.100.78','2026-09-29 18:35:10'),(2019,1,4,'Admininstrator','update','Company',1,NULL,'{\"transaction_no_reset_rule\":{\"old\":\"per_session\",\"new\":\"per_day\"},\"transaction_no_length\":{\"old\":\"0\",\"new\":\"4\"}}','192.168.100.78','2026-09-29 18:36:31'),(2020,1,4,'Admininstrator','logout','User',4,NULL,NULL,'192.168.100.78','2026-09-30 07:19:37'),(2021,1,403,'company admin','login','User',403,'company admin',NULL,'192.168.100.78','2026-09-30 07:19:50'),(2022,1,403,'company admin','logout','User',403,NULL,NULL,'192.168.100.78','2026-09-30 07:19:58'),(2023,1,403,'company admin','login','User',403,'company admin',NULL,'10.152.239.20','2026-09-30 07:42:19');
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
  CONSTRAINT `cash_movements_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  CONSTRAINT `cash_sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (10,1,NULL,'Beverages','Soft drinks, juices, water, and other drinks',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(11,1,NULL,'Snacks & Chips','Chips, crackers, and packaged snacks',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(12,1,NULL,'Grocery & Canned Goods','Rice, canned goods, condiments, and pantry staples',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(13,1,NULL,'Personal Care','Toiletries, hygiene, and personal care products',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(14,1,NULL,'Household Supplies','Cleaning supplies and household essentials',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(15,1,NULL,'Frozen & Chilled','Frozen goods, dairy, and chilled items',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(16,1,NULL,'Bakery','Bread, pastries, and baked goods',1,'2026-08-24 01:01:32','2026-09-15 16:32:01'),(17,1,NULL,'School & Office Supplies','Stationery and office essentials',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(18,1,NULL,'Tobacco & Alcohol','Cigarettes, beer, and alcoholic beverages',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(19,1,NULL,'Others','Miscellaneous items not covered by other categories',1,'2026-08-24 01:01:32','2026-08-24 01:01:32'),(38,1,NULL,'Test Category','Test',1,'2026-09-21 17:29:01','2026-09-21 17:29:01'),(39,1,NULL,'Tissue',NULL,1,'2026-09-21 17:41:20','2026-09-21 17:43:00');
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
-- Table structure for table `chat_conversation_participants`
--

DROP TABLE IF EXISTS `chat_conversation_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_conversation_participants` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `joined_at` datetime DEFAULT NULL,
  `left_at` datetime DEFAULT NULL,
  `last_read_message_id` bigint(20) unsigned DEFAULT NULL,
  `added_by` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `conversation_id_user_id` (`conversation_id`,`user_id`),
  KEY `user_id_left_at` (`user_id`,`left_at`),
  KEY `conversation_id_left_at` (`conversation_id`,`left_at`),
  KEY `chat_conversation_participants_added_by_foreign` (`added_by`),
  CONSTRAINT `chat_conversation_participants_added_by_foreign` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chat_conversation_participants_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chat_conversation_participants_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_conversation_participants`
--

LOCK TABLES `chat_conversation_participants` WRITE;
/*!40000 ALTER TABLE `chat_conversation_participants` DISABLE KEYS */;
INSERT INTO `chat_conversation_participants` VALUES (9,4,147,'2026-09-23 19:41:12','2026-09-23 19:45:58',NULL,147),(10,4,400,'2026-09-23 19:41:12','2026-09-23 19:45:58',NULL,147),(11,5,147,'2026-09-23 19:44:25','2026-09-23 19:45:59',NULL,147),(12,5,400,'2026-09-23 19:44:25','2026-09-23 19:45:59',NULL,147),(13,6,147,'2026-09-23 19:46:07','2026-09-23 19:46:21',NULL,147),(14,6,400,'2026-09-23 19:46:07','2026-09-23 19:46:21',NULL,147),(15,7,147,'2026-09-23 19:47:22','2026-09-23 19:47:35',NULL,147),(16,7,400,'2026-09-23 19:47:22','2026-09-23 19:47:35',NULL,147),(18,8,147,'2026-09-23 19:49:43','2026-09-23 19:49:56',NULL,147),(19,8,400,'2026-09-23 19:49:43','2026-09-23 19:49:56',NULL,147);
/*!40000 ALTER TABLE `chat_conversation_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_conversations`
--

DROP TABLE IF EXISTS `chat_conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_conversations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `type` enum('direct','group') NOT NULL DEFAULT 'direct',
  `name` varchar(191) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `last_message_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_id_type` (`company_id`,`type`),
  KEY `chat_conversations_created_by_foreign` (`created_by`),
  CONSTRAINT `chat_conversations_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chat_conversations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_conversations`
--

LOCK TABLES `chat_conversations` WRITE;
/*!40000 ALTER TABLE `chat_conversations` DISABLE KEYS */;
INSERT INTO `chat_conversations` VALUES (4,1,'group','Creator Rule Check',147,NULL,'2026-09-23 19:41:12','2026-09-23 19:41:12'),(5,1,'group','Creator Rule Check',147,NULL,'2026-09-23 19:44:25','2026-09-23 19:44:25'),(6,1,'group','Creator Rule Check',147,NULL,'2026-09-23 19:46:07','2026-09-23 19:46:07'),(7,1,'group','Creator Rule Check 1790192841896',147,NULL,'2026-09-23 19:47:22','2026-09-23 19:47:22'),(8,1,'group','Debug Dialog 1790192983058',147,NULL,'2026-09-23 19:49:43','2026-09-23 19:49:43');
/*!40000 ALTER TABLE `chat_conversations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `conversation_id` bigint(20) unsigned NOT NULL,
  `sender_id` bigint(20) unsigned NOT NULL,
  `body` text NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `conversation_id_created_at` (`conversation_id`,`created_at`),
  KEY `chat_messages_sender_id_foreign` (`sender_id`),
  CONSTRAINT `chat_messages_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chat_messages_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chat_messages_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
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
  `logo_path` varchar(255) DEFAULT NULL,
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
  `loyalty_enabled` tinyint(1) unsigned DEFAULT 1,
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
INSERT INTO `companies` VALUES (1,'Default Company','uploads/companies/1_7683a1266cbe6b87.jpg','PUREGOLD PRICE CLUB INC','11111',1,'22222',1,NULL,NULL,NULL,'PHP','vat',0,'per_day',NULL,4,'UTC',0,0,0,1,1,NULL,NULL,NULL,NULL,NULL,1,'2026-08-16 16:41:35','2026-09-29 18:44:44');
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
) ENGINE=InnoDB AUTO_INCREMENT=219 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
  CONSTRAINT `inventory_transactions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
  KEY `company_id` (`company_id`),
  KEY `store_id` (`store_id`),
  KEY `status` (`status`),
  KEY `invoice_series_created_by_foreign` (`created_by`),
  KEY `invoice_series_updated_by_foreign` (`updated_by`),
  CONSTRAINT `invoice_series_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoice_series_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoice_series_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_series_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_series`
--

LOCK TABLES `invoice_series` WRITE;
/*!40000 ALTER TABLE `invoice_series` DISABLE KEYS */;
INSERT INTO `invoice_series` VALUES (10,1,30,'Sales Invoice','2026','SI-',NULL,1,0,99999999,8,10000,1000,'2026-09-29',NULL,'active',4,4,'2026-09-29 18:35:10','2026-09-29 18:35:10');
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
  CONSTRAINT `loyalty_point_transactions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
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
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2026-08-15-000001','App\\Database\\Migrations\\CreateCompanies','default','App',1786898482,1),(2,'2026-08-15-000002','App\\Database\\Migrations\\CreateStores','default','App',1786898482,1),(3,'2026-08-15-000003','App\\Database\\Migrations\\CreateRoles','default','App',1786898482,1),(4,'2026-08-15-000004','App\\Database\\Migrations\\CreatePermissions','default','App',1786898482,1),(5,'2026-08-15-000005','App\\Database\\Migrations\\CreateRolePermissions','default','App',1786898482,1),(6,'2026-08-15-000006','App\\Database\\Migrations\\CreateUsers','default','App',1786898482,1),(7,'2026-08-15-000007','App\\Database\\Migrations\\CreateUserStores','default','App',1786898482,1),(8,'2026-08-15-000008','App\\Database\\Migrations\\CreateRegisters','default','App',1786898482,1),(9,'2026-08-15-000009','App\\Database\\Migrations\\CreateCashSessions','default','App',1786898482,1),(10,'2026-08-15-000010','App\\Database\\Migrations\\CreateUnits','default','App',1786898482,1),(11,'2026-08-15-000011','App\\Database\\Migrations\\CreateCategories','default','App',1786898482,1),(12,'2026-08-15-000012','App\\Database\\Migrations\\CreateTaxRates','default','App',1786898482,1),(13,'2026-08-15-000013','App\\Database\\Migrations\\CreateProducts','default','App',1786898482,1),(14,'2026-08-15-000014','App\\Database\\Migrations\\CreateProductPrices','default','App',1786898482,1),(15,'2026-08-15-000015','App\\Database\\Migrations\\CreateInventory','default','App',1786898482,1),(16,'2026-08-15-000016','App\\Database\\Migrations\\CreateInventoryTransactions','default','App',1786898482,1),(17,'2026-08-15-000017','App\\Database\\Migrations\\CreateCustomers','default','App',1786898482,1),(18,'2026-08-15-000018','App\\Database\\Migrations\\CreateLoyaltyCards','default','App',1786898482,1),(19,'2026-08-15-000019','App\\Database\\Migrations\\CreateSuppliers','default','App',1786898482,1),(20,'2026-08-15-000020','App\\Database\\Migrations\\CreatePurchaseOrders','default','App',1786898482,1),(21,'2026-08-15-000021','App\\Database\\Migrations\\CreatePurchaseOrderItems','default','App',1786898482,1),(22,'2026-08-15-000022','App\\Database\\Migrations\\CreateSales','default','App',1786898482,1),(23,'2026-08-15-000023','App\\Database\\Migrations\\CreateSaleItems','default','App',1786898482,1),(24,'2026-08-15-000024','App\\Database\\Migrations\\CreatePayments','default','App',1786898482,1),(25,'2026-08-15-000025','App\\Database\\Migrations\\CreateReturns','default','App',1786898482,1),(26,'2026-08-15-000026','App\\Database\\Migrations\\CreateReturnItems','default','App',1786898482,1),(27,'2026-08-15-000027','App\\Database\\Migrations\\CreateInvoiceSequences','default','App',1786898482,1),(28,'2026-08-15-000028','App\\Database\\Migrations\\AddLoginSecurityToUsers','default','App',1786898482,1),(29,'2026-08-15-000029','App\\Database\\Migrations\\CreateRevokedTokens','default','App',1786898482,1),(30,'2026-08-15-000030','App\\Database\\Migrations\\UpdateCompanyFields','default','App',1786898482,1),(31,'2026-08-15-000031','App\\Database\\Migrations\\EnforceCompanyTradeNameNotNull','default','App',1786898482,1),(32,'2026-08-16-000032','App\\Database\\Migrations\\AddPasswordChangedAtToUsers','default','App',1786898482,1),(33,'2026-08-16-000033','App\\Database\\Migrations\\AddPrecisionToUnits','default','App',1786898482,1),(34,'2026-08-16-000034','App\\Database\\Migrations\\AddSellingPriceAndMinStockToProducts','default','App',1786898482,1),(35,'2026-08-16-000035','App\\Database\\Migrations\\AddTaxRateIdToLineItems','default','App',1786898483,1),(36,'2026-08-16-000036','App\\Database\\Migrations\\SplitTransferTransactionType','default','App',1786898483,1),(37,'2026-08-16-000037','App\\Database\\Migrations\\UpdateCustomerFields','default','App',1786898483,1),(38,'2026-08-16-000038','App\\Database\\Migrations\\UpdateLoyaltyCardFields','default','App',1786898483,1),(39,'2026-08-16-000039','App\\Database\\Migrations\\EnforceCustomerNameFieldsNotNull','default','App',1786898483,1),(40,'2026-08-16-000040','App\\Database\\Migrations\\AddApprovalToPurchaseOrders','default','App',1786898483,1),(41,'2026-08-16-000041','App\\Database\\Migrations\\AddBaggerIdToSales','default','App',1786898483,1),(42,'2026-08-16-000042','App\\Database\\Migrations\\UpdatePaymentMethods','default','App',1786898483,1),(43,'2026-08-16-000043','App\\Database\\Migrations\\CreateCashMovements','default','App',1786898483,1),(44,'2026-08-16-000044','App\\Database\\Migrations\\AddInvoiceSnapshotFields','default','App',1786898483,1),(45,'2026-08-16-000045','App\\Database\\Migrations\\AddApprovalToReturns','default','App',1786898483,1),(46,'2026-08-16-000046','App\\Database\\Migrations\\AddPerformanceIndexes','default','App',1786898483,1),(47,'2026-08-16-000047','App\\Database\\Migrations\\MakeSalesReportIndexCovering','default','App',1786898483,1),(48,'2026-08-16-000048','App\\Database\\Migrations\\MakeSaleItemsJoinIndexCovering','default','App',1786898483,1),(49,'2026-08-18-000049','App\\Database\\Migrations\\DropUnusedProductPrices','default','App',1787055928,2),(50,'2026-08-18-000050','App\\Database\\Migrations\\CreateStoreProductPrices','default','App',1787055928,2),(51,'2026-08-18-000051','App\\Database\\Migrations\\DropProductPriceColumns','default','App',1787055928,2),(52,'2026-08-23-000052','App\\Database\\Migrations\\CreateLoyaltyPointTransactions','default','App',1787420901,3),(54,'2026-08-25-000053','App\\Database\\Migrations\\AddImagePathToProducts','default','App',1787727557,4),(55,'2026-08-27-000054','App\\Database\\Migrations\\AddLoyaltyPointsRateToCompanies','default','App',1787858638,5),(56,'2026-08-28-000055','App\\Database\\Migrations\\CreateAuditLogs','default','App',1787945267,6),(57,'2026-08-30-000056','App\\Database\\Migrations\\CreatePaymentMethods','default','App',1788099865,7),(58,'2026-08-30-000057','App\\Database\\Migrations\\SeedPaymentMethodsAndWidenPaymentsMethod','default','App',1788099865,7),(59,'2026-08-30-000058','App\\Database\\Migrations\\GrantPaymentMethodPermissionsToExistingRoles','default','App',1788099926,8),(60,'2026-08-31-000059','App\\Database\\Migrations\\MakeSaleItemsProductIdNullable','default','App',1788110247,9),(61,'2026-08-31-000060','App\\Database\\Migrations\\GrantCategoriesViewToExistingCashierRole','default','App',1788110247,9),(62,'2026-09-01-000061','App\\Database\\Migrations\\AddRequireVoidApprovalToCompanies','default','App',1788290078,10),(63,'2026-09-01-000062','App\\Database\\Migrations\\SplitVoidApprovalSettings','default','App',1788297876,11),(64,'2026-09-02-000063','App\\Database\\Migrations\\AddSessionValidFromToUsers','default','App',1788339179,12),(65,'2026-09-02-000064','App\\Database\\Migrations\\AddReceiptHeaderNoteToStores','default','App',1788363316,13),(66,'2026-09-02-000065','App\\Database\\Migrations\\AddBirPosFieldsToStores','default','App',1788365698,14),(67,'2026-09-02-000066','App\\Database\\Migrations\\AddShowBirDetailsToStores','default','App',1788366054,15),(68,'2026-09-02-000067','App\\Database\\Migrations\\AddShowBirDetailsToSales','default','App',1788367132,16),(69,'2026-09-02-000068','App\\Database\\Migrations\\RenameReceiptHeaderNoteToFooter','default','App',1788370013,17),(70,'2026-09-07-000069','App\\Database\\Migrations\\AddDiscountTypeToSaleItems','default','App',1788711204,18),(71,'2026-09-07-000070','App\\Database\\Migrations\\AddDiscountHolderToSales','default','App',1788711204,18),(72,'2026-09-07-000071','App\\Database\\Migrations\\AddRequireManualDiscountApprovalToCompanies','default','App',1788711204,18),(73,'2026-09-07-000072','App\\Database\\Migrations\\AddSalesDiscountPermission','default','App',1788711204,18),(74,'2026-09-07-000073','App\\Database\\Migrations\\AddDiscountDefaultsToCompanies','default','App',1788713073,19),(75,'2026-09-08-000074','App\\Database\\Migrations\\CreateDiscountEligibilityTables','default','App',1788714790,20),(77,'2026-09-09-000075','App\\Database\\Migrations\\AddTaxSystemToCompanies','default','App',1788960395,21),(78,'2026-09-09-000076','App\\Database\\Migrations\\AddTaxSystemToTaxRates','default','App',1789031958,22),(79,'2026-09-11-000077','App\\Database\\Migrations\\AddOpeningFloatToRegisters','default','App',1789077440,23),(80,'2026-09-12-000078','App\\Database\\Migrations\\AddPosLockIdleMinutesToCompanies','default','App',1789142917,24),(81,'2026-09-13-000079','App\\Database\\Migrations\\CreateInvoiceSeries','default','App',1789232699,25),(82,'2026-09-13-000080','App\\Database\\Migrations\\BackfillInvoiceSeriesFromSequences','default','App',1789232699,25),(83,'2026-09-13-000081','App\\Database\\Migrations\\GrantInvoiceSeriesPermissionsToExistingRoles','default','App',1789232699,25),(84,'2026-09-13-000082','App\\Database\\Migrations\\AddTransactionNoToSalesAndCashSessions','default','App',1789312725,26),(85,'2026-09-13-000083','App\\Database\\Migrations\\AddTransactionNumberSettingsToCompanies','default','App',1789315017,27),(86,'2026-09-13-000084','App\\Database\\Migrations\\CreateTransactionCounters','default','App',1789315017,27),(87,'2026-09-13-000085','App\\Database\\Migrations\\ReworkTransactionNoOnSales','default','App',1789315017,27),(88,'2026-09-14-000086','App\\Database\\Migrations\\AddBirAccreditationFields','default','App',1789318866,28),(89,'2026-09-14-000087','App\\Database\\Migrations\\CreateZReadings','default','App',1789318866,28),(90,'2026-09-14-000088','App\\Database\\Migrations\\GrantReadingPermissionsToExistingRoles','default','App',1789319198,29),(91,'2026-09-14-000089','App\\Database\\Migrations\\AddBirRegisteredToCompanies','default','App',1789390677,30),(96,'2026-09-21-000090','App\\Database\\Migrations\\AddIsSystemToTaxRates','default','App',1789924770,31),(97,'2026-09-21-000091','App\\Database\\Migrations\\SeedProtectedDefaultTaxRates','default','App',1789924770,31),(98,'2026-09-21-000092','App\\Database\\Migrations\\SeedRemainingVatClassificationRates','default','App',1789925224,32),(99,'2026-09-22-000093','App\\Database\\Migrations\\CreateStoreProductFavorites','default','App',1790023788,33),(100,'2026-09-23-000094','App\\Database\\Migrations\\AddLogoPathToCompanies','default','App',1790106486,34),(101,'2026-09-24-000095','App\\Database\\Migrations\\CreateChatMessages','default','App',1790187365,35),(102,'2026-09-24-000096','App\\Database\\Migrations\\GrantChatPermissionToExistingRoles','default','App',1790187365,35),(103,'2026-09-24-000097','App\\Database\\Migrations\\AddDeletedAtToChatMessages','default','App',1790189308,36),(104,'2026-09-24-000098','App\\Database\\Migrations\\CreateChatConversations','default','App',1790191149,37),(105,'2026-09-24-000099','App\\Database\\Migrations\\RestructureChatMessagesForConversations','default','App',1790191149,37),(106,'2026-09-25-000100','App\\Database\\Migrations\\AddOpeningFloatToStores','default','App',1790286115,38),(107,'2026-09-25-000101','App\\Database\\Migrations\\ChangeRegistersOpeningFloatDefaultToInherit','default','App',1790286115,38),(108,'2026-09-25-000102','App\\Database\\Migrations\\DropOpeningFloatFromRegisters','default','App',1790288500,39),(109,'2026-09-25-000103','App\\Database\\Migrations\\FixUsersForeignKeyDeleteRules','default','App',1790424850,40),(110,'2026-09-25-000104','App\\Database\\Migrations\\AddUsersDeletePermission','default','App',1790425188,41),(111,'2026-09-26-000105','App\\Database\\Migrations\\MakeUsersEmailNullable','default','App',1790435111,42),(112,'2026-09-26-000106','App\\Database\\Migrations\\MakeUsersPasswordHashNullable','default','App',1790435670,43),(113,'2026-09-28-000107','App\\Database\\Migrations\\AddLoyaltyEnabledToCompanies','default','App',1790526193,44);
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
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES (23,1,'Cash','cash',1,'2026-09-26 12:02:44','2026-09-26 12:02:44');
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
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'View Products','products.view','Can view product records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(2,'Create Products','products.create','Can create new products','2026-08-16 16:41:35','2026-08-16 16:41:35'),(3,'Update Products','products.update','Can edit existing products','2026-08-16 16:41:35','2026-08-16 16:41:35'),(4,'Delete Products','products.delete','Can delete products','2026-08-16 16:41:35','2026-08-16 16:41:35'),(5,'View Inventory','inventory.view','Can view stock levels','2026-08-16 16:41:35','2026-08-16 16:41:35'),(6,'Adjust Inventory','inventory.adjust','Can make manual stock adjustments','2026-08-16 16:41:35','2026-08-16 16:41:35'),(7,'Transfer Inventory','inventory.transfer','Can transfer stock between stores','2026-08-16 16:41:35','2026-08-16 16:41:35'),(8,'Create Sales','sales.create','Can ring up new sales','2026-08-16 16:41:35','2026-08-16 16:41:35'),(9,'View Sales','sales.view','Can view sales history','2026-08-16 16:41:35','2026-08-16 16:41:35'),(10,'Void Sales','sales.void','Can void a sale','2026-08-16 16:41:35','2026-08-16 16:41:35'),(11,'Refund Sales','sales.refund','Can process a refund','2026-08-16 16:41:35','2026-08-16 16:41:35'),(12,'View Customers','customers.view','Can view customer records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(13,'Create Customers','customers.create','Can create new customers','2026-08-16 16:41:35','2026-08-16 16:41:35'),(14,'Update Customers','customers.update','Can edit existing customers','2026-08-16 16:41:35','2026-08-16 16:41:35'),(15,'View Loyalty','loyalty.view','Can view loyalty card balances and points','2026-08-16 16:41:35','2026-08-16 16:41:35'),(16,'Manage Loyalty','loyalty.manage','Can issue cards and adjust points/balance','2026-08-16 16:41:35','2026-08-16 16:41:35'),(17,'View Reports','reports.view','Can view sales and inventory reports','2026-08-16 16:41:35','2026-08-16 16:41:35'),(18,'View Users','users.view','Can view user accounts','2026-08-16 16:41:35','2026-08-16 16:41:35'),(19,'Create Users','users.create','Can create new user accounts','2026-08-16 16:41:35','2026-08-16 16:41:35'),(20,'Update Users','users.update','Can edit existing user accounts','2026-08-16 16:41:35','2026-08-16 16:41:35'),(21,'View Stores','stores.view','Can view store records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(22,'Manage Stores','stores.manage','Can create and edit stores','2026-08-16 16:41:35','2026-08-16 16:41:35'),(23,'View Companies','companies.view','Can view company records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(24,'Manage Companies','companies.manage','Can create and edit companies','2026-08-16 16:41:35','2026-08-16 16:41:35'),(25,'View Roles','roles.view','Can view roles and their permissions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(26,'Manage Roles','roles.manage','Can create/edit roles and assign permissions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(27,'View Categories','categories.view','Can view product categories','2026-08-16 16:41:35','2026-08-16 16:41:35'),(28,'Manage Categories','categories.manage','Can create and edit categories','2026-08-16 16:41:35','2026-08-16 16:41:35'),(29,'View Units','units.view','Can view units of measure','2026-08-16 16:41:35','2026-08-16 16:41:35'),(30,'Manage Units','units.manage','Can create and edit units of measure','2026-08-16 16:41:35','2026-08-16 16:41:35'),(31,'View Taxes','taxes.view','Can view tax rate configuration','2026-08-16 16:41:35','2026-08-16 16:41:35'),(32,'Manage Taxes','taxes.manage','Can create and edit tax rates','2026-08-16 16:41:35','2026-08-16 16:41:35'),(33,'View Suppliers','suppliers.view','Can view supplier records','2026-08-16 16:41:35','2026-08-16 16:41:35'),(34,'Manage Suppliers','suppliers.manage','Can create and edit suppliers','2026-08-16 16:41:35','2026-08-16 16:41:35'),(35,'View Purchases','purchases.view','Can view purchase orders','2026-08-16 16:41:35','2026-08-16 16:41:35'),(36,'Create Purchases','purchases.create','Can create purchase orders','2026-08-16 16:41:35','2026-08-16 16:41:35'),(37,'Manage Purchases','purchases.manage','Can edit and receive purchase orders','2026-08-16 16:41:35','2026-08-16 16:41:35'),(38,'View POS Terminals','registers.view','Can view POS terminals','2026-08-16 16:41:35','2026-08-31 14:23:03'),(39,'Manage POS Terminals','registers.manage','Can create and edit POS terminals','2026-08-16 16:41:35','2026-08-31 14:23:03'),(40,'View Cash Sessions','cash-sessions.view','Can view cash drawer sessions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(41,'Manage Cash Sessions','cash-sessions.manage','Can open and close cash drawer sessions','2026-08-16 16:41:35','2026-08-16 16:41:35'),(42,'View Payments','payments.view','Can view sale payments','2026-08-16 16:41:35','2026-08-16 16:41:35'),(43,'View Returns','returns.view','Can view sales returns','2026-08-16 16:41:35','2026-08-16 16:41:35'),(44,'Create Returns','returns.create','Can request a sales return','2026-08-16 16:41:35','2026-08-16 16:41:35'),(45,'Approve Returns','returns.approve','Can approve a pending return, issuing the refund and restocking inventory','2026-08-16 16:41:35','2026-08-16 16:41:35'),(46,'View Dashboard','dashboard.view','Can view the dashboard\'s daily snapshot','2026-08-22 16:01:35','2026-08-22 16:01:35'),(47,'View Audit Trail','audit.view','Can view the audit trail of who did what, and when','2026-08-28 19:27:52','2026-08-28 19:27:52'),(48,'View Payment Methods','payment-methods.view','Can view the payment methods offered at checkout','2026-08-30 14:24:37','2026-08-30 14:24:37'),(49,'Manage Payment Methods','payment-methods.manage','Can add, rename, and activate/deactivate payment methods','2026-08-30 14:24:37','2026-08-30 14:24:37'),(50,'Approve Discounts','sales.discount','Can approve a manual/discretionary discount that falls outside the standard discount types','2026-09-06 16:13:24','2026-09-06 16:13:24'),(51,'View Invoice Series','invoice-series.view','Can view sales invoice numbering series and their configuration','2026-09-12 17:04:59','2026-09-12 17:04:59'),(52,'Manage Invoice Series','invoice-series.manage','Can create, edit, activate, and deactivate sales invoice numbering series','2026-09-12 17:04:59','2026-09-12 17:04:59'),(53,'View X/Z Readings','readings.view','Can take an X-reading and view issued Z-readings','2026-09-13 17:06:38','2026-09-13 17:06:38'),(54,'Generate Z-Readings','readings.manage','Can close the period and issue a Z-reading','2026-09-13 17:06:38','2026-09-13 17:06:38'),(56,'Access Chat','chat.access','Can send and receive Back Office direct messages','2026-09-23 18:16:05','2026-09-23 18:16:05'),(57,'Delete Users','users.delete','Can permanently delete a user account (not deactivate) — bypasses the normal deactivate-only workflow','2026-09-26 12:19:48','2026-09-26 12:19:48');
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
  CONSTRAINT `purchase_orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registers`
--

LOCK TABLES `registers` WRITE;
/*!40000 ALTER TABLE `registers` DISABLE KEYS */;
INSERT INTO `registers` VALUES (22,27,'POS 1','001',0.00,0,0,0,1,'2026-09-27 16:09:02','2026-09-27 16:17:17'),(23,28,'POS 1','001',0.00,0,0,0,1,'2026-09-27 16:09:02','2026-09-27 16:15:20'),(24,29,'POS 1','001',0.00,0,0,0,1,'2026-09-27 16:09:02','2026-09-27 16:15:26'),(25,30,'POS 1','001',0.00,0,0,0,1,'2026-09-27 16:09:02','2026-09-27 16:15:31'),(26,30,'POS 2','002',0.00,0,0,0,1,'2026-09-27 16:15:44','2026-09-27 16:15:44'),(27,29,'POS 2','002',0.00,0,0,0,1,'2026-09-27 16:16:01','2026-09-27 16:16:01'),(30,27,'POS 2','002',0.00,0,0,0,1,'2026-09-27 16:16:24','2026-09-27 16:16:24'),(31,28,'POS 2','002',0.00,0,0,0,1,'2026-09-27 16:16:47','2026-09-27 16:16:47');
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
  CONSTRAINT `returns_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
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
INSERT INTO `revoked_tokens` VALUES ('0260be55748291fa65b4f251b8f1a5c1',4,'2026-08-20 11:08:54','2026-08-20 10:09:31'),('029088be0dba60d59739e1fdc945417d',4,'2026-10-13 17:53:44','2026-09-29 18:53:47'),('036197f89e33e06b489f51a8f3303277',4,'2026-09-14 19:31:47','2026-09-01 08:31:30'),('0686e47d3230131b551e6376f84e498a',4,'2026-09-07 22:06:24','2026-08-26 07:01:59'),('07d0f6e83ad80b80c4097eb6868ab0e1',4,'2026-09-10 19:01:19','2026-08-27 20:01:19'),('09469f6a2c1643ec2a9f6db1485b644d',4,'2026-09-11 22:47:09','2026-08-28 22:47:09'),('0d355afd091f5e188d8d91f898fb9e82',4,'2026-10-09 00:17:10','2026-09-25 01:17:10'),('0d80d564127d3d8f7c2a4d79bea2c397',4,'2026-09-10 15:37:35','2026-08-27 16:57:08'),('11ba4e31bd19fe6027edbdaafda97ce4',4,'2026-09-02 19:11:31','2026-08-19 20:13:55'),('1318cafc4f1f81264dd0b56e9e0504dc',4,'2026-10-09 05:16:18','2026-09-25 06:16:18'),('13869b139a0f5d51f6b5a5edc2ec600c',4,'2026-09-01 21:19:07','2026-08-19 19:57:19'),('13d38e47c99c1ee315f15f3ff351d703',4,'2026-10-10 14:30:52','2026-09-26 15:31:06'),('145c7c76cdd90e7234e9c541b8675169',4,'2026-09-25 13:13:39','2026-09-11 14:47:46'),('15302113b71760742e01470b986edb4a',4,'2026-09-30 16:32:43','2026-09-16 22:25:32'),('161b6b95e6fe18057e46f228890ce2b5',4,'2026-10-05 19:27:43','2026-09-21 21:00:34'),('174b39c0b449f6980df0b0137e3182d0',4,'2026-09-10 16:57:08','2026-08-27 18:00:59'),('176b863b5350d7c7b9a041bb7b987a6e',4,'2026-09-24 22:45:32','2026-09-11 13:13:39'),('180ed4548aa3952d3912005f6ac5abda',4,'2026-10-10 09:37:35','2026-09-26 10:37:51'),('1a7baf03fca17ff2397ce214187d711c',4,'2026-09-27 16:01:46','2026-09-13 17:25:38'),('1c1d1f719d6c2e7cceaae655ee949239',4,'2026-10-10 08:49:42','2026-09-26 09:49:44'),('1c400f793ab8c976021294cdbab87e93',4,'2026-08-28 19:07:09','2026-08-28 18:08:16'),('1ca2634f84e9c9b3dd022fc527049363',4,'2026-10-09 00:16:18','2026-09-25 01:16:18'),('1d5f1e1c31e7c5469c8388c7980f436c',4,'2026-08-28 21:50:57','2026-08-28 20:51:28'),('1db3f89b1d0f22e8783cae037970a756',403,'2026-10-11 14:33:21','2026-09-27 15:33:21'),('1f2c97c6330812be8125625194d889fe',4,'2026-10-09 05:17:10','2026-09-25 06:17:10'),('1fd4e6170f83743c023930cb5db1e09a',4,'2026-10-08 20:15:18','2026-09-24 21:16:18'),('216d12608f8be227f509531d66dc64f9',4,'2026-09-03 18:49:44','2026-09-03 17:49:53'),('21dbc7db2a020af9813576ccfbfee6df',4,'2026-09-02 21:20:35','2026-08-19 21:25:47'),('233c03a5e023d062f00a427884f2fdb1',403,'2026-10-13 15:24:10','2026-09-29 16:24:11'),('23ef460bd3590b8352f95f1ba299b94c',4,'2026-10-10 16:31:11','2026-09-26 16:31:14'),('26f44746092557d4a728a768f78acf46',4,'2026-09-26 11:50:04','2026-09-26 11:19:02'),('2895382771d897242a0c3bf873a46b1a',4,'2026-09-12 15:07:49','2026-08-29 16:11:58'),('28b070be4cebb471166861f9bed19f62',4,'2026-09-14 06:45:05','2026-08-31 07:56:37'),('2916db2da30533e672d52e3402f2c541',4,'2026-10-13 18:53:48','2026-09-29 19:53:52'),('2a256f18986ecb5dfb0afafb9c73622b',4,'2026-09-10 18:01:00','2026-08-27 19:01:19'),('2a4e3d25504b5356bb91e565937b1164',4,'2026-10-13 15:24:57','2026-09-29 16:25:17'),('2e11d7f3aa3d21a61e390c46e63b590d',4,'2026-10-09 03:17:10','2026-09-25 04:17:10'),('2e839305409f4dc0a86c03d19235aa63',4,'2026-09-02 18:08:53','2026-09-02 17:19:15'),('2f39bafa3ade9e5768a48f31bbccc0a8',403,'2026-10-13 14:24:09','2026-09-29 15:24:10'),('3005c160998db7f6e94293d47e99052e',4,'2026-10-06 09:51:16','2026-09-22 16:45:19'),('306236dc43f9e43865af6ed3eba3575b',4,'2026-09-06 17:40:53','2026-09-06 16:41:38'),('318f72e3ba9a081c23a65b9c5f4fa623',4,'2026-10-06 20:33:53','2026-09-22 20:33:55'),('31d87a6e28d5680f2c261164f004643d',4,'2026-09-03 12:03:46','2026-08-20 13:19:57'),('3372c6925afb89d52a9b1048bb6b9bcf',4,'2026-09-02 20:20:10','2026-08-19 21:20:35'),('34676c108c4b663bdfd55d84dbbd9bec',4,'2026-09-02 20:18:40','2026-08-19 20:19:11'),('36401dd2d139cd270a891e139564001a',403,'2026-10-11 13:33:02','2026-09-27 14:33:21'),('36c64747c13beda60c0669cc8f3d4db0',4,'2026-09-26 09:57:43','2026-09-12 16:12:14'),('396d8e2c246d57be915b2af0a75e17ec',4,'2026-09-30 08:05:55','2026-09-30 07:19:37'),('3a028434dfccf5a7640c7ec7f3d4e55e',4,'2026-10-04 16:28:42','2026-09-20 17:31:01'),('3b10845a0dc690f98dcfa5e616d6cc4c',4,'2026-09-28 11:52:40','2026-09-14 13:21:08'),('3b97ffd3bbc8b618f8c44c2a8bcc69ca',4,'2026-09-23 18:27:30','2026-09-23 18:25:28'),('3d46148666400ed156864e4e9e5ee4c9',4,'2026-09-06 17:08:56','2026-09-06 16:16:33'),('3edb637d57551c23990abfd96c8d78d2',4,'2026-09-12 17:16:06','2026-08-29 18:26:22'),('3f03a58378f2347c092b1e8c5453029a',4,'2026-08-30 15:04:50','2026-08-30 14:59:47'),('3f2a6785955fdc2379b120a6f06e8c8d',4,'2026-10-08 18:16:24','2026-09-24 19:16:43'),('40a33048bffe4d646888e45177109f3f',4,'2026-09-14 16:51:56','2026-08-31 18:19:17'),('4147e9a147e085e35e47c0585d859e8f',4,'2026-09-12 18:26:23','2026-08-30 09:24:49'),('417a91ce9d091be83a709a9a18cb886e',4,'2026-10-04 15:27:55','2026-09-20 16:28:42'),('422973debc2c5d0618b7cb1d9cecc1ee',4,'2026-09-09 09:27:40','2026-08-27 06:52:24'),('442a81a78e04c0e794708f889b816427',4,'2026-10-10 09:49:44','2026-09-26 10:50:04'),('44858e6bfa3bba85f9becab025fbbbb4',4,'2026-09-21 17:11:43','2026-09-07 18:12:59'),('44b449321d9eb86b7ed24927c32fb950',4,'2026-10-05 21:00:34','2026-09-22 09:51:16'),('461c7cf24acac2e2025a9e6fb50f4d73',4,'2026-10-13 20:53:52','2026-09-30 07:05:55'),('4983ad2d84e0dc4548e362960ba0fd0a',4,'2026-09-11 21:35:59','2026-08-28 22:47:07'),('4dd6001e3f98fa48cf9c90fd0c2e33eb',4,'2026-09-03 13:19:57','2026-08-22 14:41:46'),('4df904584960f19371e3f03742d5c99b',4,'2026-10-13 14:24:48','2026-09-29 15:24:57'),('4e1b0dbe9dbf8b48fe374f45458927a2',403,'2026-09-30 08:04:52','2026-09-30 07:19:58'),('532155d0febbb658598d0a5a7328d33a',4,'2026-10-13 16:25:17','2026-09-29 17:53:44'),('539f3c0689de2b64be487b76f538ec18',4,'2026-10-08 21:16:49','2026-09-24 22:16:58'),('54de5826de2416aec08c8684575789ff',4,'2026-10-07 19:25:43','2026-09-24 16:16:22'),('559df8b5999603856d444f5dda3b8de4',4,'2026-09-16 23:25:32','2026-09-16 22:27:13'),('5608f0e6c590ccebef2245f4e735f56b',403,'2026-10-11 15:25:37','2026-09-27 16:25:49'),('56562c58c2d050e47e0ee3e5993fedde',4,'2026-09-26 12:37:58','2026-09-26 11:58:58'),('5662022d6a05dfeda6ff541520fd5b70',4,'2026-09-10 09:31:25','2026-08-29 08:34:05'),('5683633585ff9e1d35fd3dadf0aa9fb2',4,'2026-09-13 11:28:22','2026-08-30 14:04:50'),('57ad27b4589e5d586ad4bded7ea6d4d4',4,'2026-09-28 13:21:09','2026-09-14 13:21:09'),('59696481bdf4627afacd3da2dbec9023',4,'2026-09-16 19:07:07','2026-09-02 20:55:37'),('5a5f2ff9148c0a7f72fa31739d3e15c7',4,'2026-09-11 12:17:32','2026-08-28 13:45:08'),('5b85392f1b3d0eafeb5256b0b63f02f1',4,'2026-09-28 13:21:09','2026-09-16 12:58:14'),('5c132641e3e91a519a34121f40fa7e36',4,'2026-10-11 09:19:13','2026-09-27 10:19:49'),('5cf345714ae2fb84a2ab9e3227c4347c',403,'2026-10-13 21:24:37','2026-09-29 22:24:37'),('6161433130eb9eede24d2d57f9a2bb32',4,'2026-09-16 17:20:56','2026-09-02 19:07:07'),('61d909fe770b516fb011a3641b5a0c50',4,'2026-10-09 09:00:20','2026-09-25 10:00:21'),('61f3071e050dae3425754b36df28f844',4,'2026-08-27 15:12:53','2026-08-27 14:34:14'),('63d1fda281607af5b5fa7d7e71b97e24',4,'2026-09-21 19:33:41','2026-09-07 21:48:56'),('66b645bc785d6e8f237a56cc174f93fc',4,'2026-09-11 13:45:08','2026-08-28 13:45:09'),('67107a0fe5a8714886edcb234ccf17f6',4,'2026-09-09 07:01:59','2026-08-26 09:27:40'),('67b7b65f2c487a9a04617e168ea2d233',4,'2026-10-09 01:17:10','2026-09-25 02:17:10'),('6968c2ac9a1fdb49063ebffa4e09d6b8',403,'2026-10-13 17:24:16','2026-09-29 18:24:16'),('6a27a2087be52210a12b54f89c260e9a',4,'2026-08-22 16:47:41','2026-08-22 16:34:40'),('6a578d6ee249278ee8134940e6d9e77c',4,'2026-10-08 21:16:18','2026-09-24 22:16:18'),('6ce48c5b2fe4ff590516c6ef8c06a863',4,'2026-09-06 18:04:25','2026-08-23 19:23:58'),('6d45dec7b9b398ac1958db08e5b55724',403,'2026-10-12 11:48:51','2026-09-28 12:48:51'),('7007eb7e741630318e904fbabd853d89',403,'2026-10-13 22:24:37','2026-09-30 07:04:51'),('72063ddfc042deb8728e15c8b377275e',4,'2026-08-22 15:41:46','2026-08-22 14:43:08'),('72d6569c54edacc90b4f3b4dd6f57f3f',4,'2026-08-28 19:25:13','2026-08-28 18:27:10'),('7463457c37fb0810566090959069d265',4,'2026-09-11 15:38:28','2026-08-28 16:50:06'),('762dfca45b928535b3d441865fc69e11',4,'2026-09-10 20:01:19','2026-08-28 12:17:32'),('769695e7cadd8b80e0f52a296e70c0df',4,'2026-09-14 11:59:15','2026-08-31 11:59:15'),('784accf08da7577e9d0ac16c4badba96',403,'2026-10-12 08:48:48','2026-09-28 09:48:51'),('78c972f0295e5be85ecb471f409df96a',4,'2026-09-15 16:27:26','2026-09-01 17:58:57'),('7a5759b4be0a5666d9d1a217f9519912',4,'2026-08-31 12:59:15','2026-08-31 12:37:51'),('7a857b3d38513735bebadc4d762ab266',4,'2026-09-11 22:47:08','2026-08-28 22:47:09'),('7a8e81f80db2d8945f027912fc79a7e1',4,'2026-09-02 21:25:48','2026-08-20 08:23:19'),('7a983906dad3c830850bb0f5e18c597a',4,'2026-09-10 09:11:19','2026-08-29 08:31:25'),('7c5456dab9c0690f0f676cbbd43b4193',4,'2026-09-15 19:10:01','2026-09-01 20:17:24'),('7e05c6d89199e66178ac917b46450c86',4,'2026-09-10 08:18:03','2026-08-27 09:31:25'),('7e44e1357cc4ebda8dcd7f15d8b2dac4',4,'2026-09-14 14:51:48','2026-09-01 08:46:52'),('83dc09ac7f102509a99549e84a01c3d9',4,'2026-09-03 08:23:19','2026-08-20 09:26:47'),('843adc96a389e47c9705d72203b50815',4,'2026-10-09 06:17:10','2026-09-25 09:00:19'),('8533c5e6def1df14bec140e426b55e84',403,'2026-10-11 11:32:42','2026-09-27 12:33:01'),('86124118a579de275a52f058138cfcc6',4,'2026-09-30 12:58:14','2026-09-16 16:32:43'),('8656e6fdc8be2b79f7e315477ec41aca',4,'2026-09-11 22:47:07','2026-08-28 22:47:08'),('86c34ee69c1c8996fc07b4d9aa31ebc8',4,'2026-10-08 22:16:18','2026-09-24 23:16:18'),('876320e6387f90718c8396bad0d8a29d',4,'2026-10-09 04:16:18','2026-09-25 05:16:18'),('87822e68e7d05b81e067a4c685da45e6',4,'2026-10-09 04:17:10','2026-09-25 05:17:10'),('89972aad1f7bf876d710a908bd70bfef',403,'2026-10-11 10:32:41','2026-09-27 11:32:42'),('8ada61223090b89d40f522cdeb53e21b',4,'2026-10-08 20:16:44','2026-09-24 21:16:49'),('8af2d904654db646befbd95790ef7067',4,'2026-08-19 20:57:19','2026-08-19 19:57:33'),('8c0a1eb6023fecc602e9ce8611393236',4,'2026-09-25 16:18:08','2026-09-12 09:57:43'),('8df990a670ce27e38cc914a29512b9cc',4,'2026-10-06 19:28:10','2026-09-22 20:33:53'),('91213e29005232ffd49049e5ebce465a',4,'2026-09-23 13:21:23','2026-09-10 12:46:43'),('9176f249b5a1af8c086125d4a185778b',4,'2026-09-10 19:01:19','2026-08-27 19:01:19'),('92bee2373fe48c7308563e9716c8e490',4,'2026-09-14 18:19:17','2026-08-31 19:31:47'),('93646cee59c635826a6603f682f649ba',4,'2026-09-27 14:50:50','2026-09-13 16:01:46'),('93f690de543f978a2f673661f4c994a5',4,'2026-09-03 09:26:47','2026-08-20 10:27:01'),('942442fa8b1a4b65562d707b48128bb5',4,'2026-10-08 16:16:22','2026-09-24 17:16:24'),('952c7994494a3c11a4d052e015aae86a',4,'2026-09-27 17:25:38','2026-09-14 07:44:21'),('960ed3cd2b2e0f42f0f927dd4e2dc54b',403,'2026-10-13 20:24:36','2026-09-29 21:24:37'),('96620a8254aaaa3e4af080b84ea133b2',4,'2026-10-08 23:16:18','2026-09-25 00:16:18'),('96eb4b2955855211e1a8ca01013a2fe7',4,'2026-09-06 19:23:58','2026-08-24 18:46:41'),('97f967e43b9419d6b1ebc50cdc2b78b0',4,'2026-09-12 16:11:58','2026-08-29 17:16:06'),('992126b0e48520ea3cf249696f5ac609',403,'2026-10-11 13:24:49','2026-09-27 14:25:25'),('992635ab3cb71a74150b2c0d88cd3868',403,'2026-10-11 16:58:15','2026-09-28 08:48:48'),('99765ac82c468b9fe4086b0fe4b70da3',4,'2026-09-25 14:47:46','2026-09-11 16:18:08'),('9b0f2ca7f2c0ef6a622c00d3e6a93a78',4,'2026-09-02 20:19:32','2026-08-19 20:20:10'),('9c0fa5ed4d119bc7103c267f94827d6f',4,'2026-09-03 10:27:01','2026-08-20 12:03:46'),('9c36342cbea4e34c2b58b3faf341a1d9',403,'2026-10-13 16:24:11','2026-09-29 17:24:16'),('9dbdb718d7d308bb09c7fe9e485756d6',4,'2026-09-20 18:31:01','2026-09-20 18:21:21'),('9e8e33f793f34650bb4d3832c7184a6c',4,'2026-10-09 02:17:10','2026-09-25 03:17:10'),('9fa5159a51e6f9767cc796cbd17ca3de',4,'2026-10-11 13:28:49','2026-09-27 14:59:18'),('9fae762963f5eb8e27148de2841d6996',4,'2026-09-06 18:01:05','2026-09-06 17:27:58'),('a19799afd95e50557e848e787f9ed7c6',403,'2026-10-12 10:48:51','2026-09-28 11:48:51'),('a1cd7e2d9fd054faf5070b1c6a8b9309',4,'2026-09-27 17:25:38','2026-09-13 17:25:38'),('a2c77e7d4751e81d45c6e40fe3ea4dad',4,'2026-09-21 09:04:34','2026-09-07 10:58:38'),('a5bcbd5d11e2d621b8bff8ce38138bb3',4,'2026-10-06 20:33:55','2026-09-23 17:27:30'),('a61fa52378d4ad1ab75c717163973a62',4,'2026-10-08 23:17:10','2026-09-25 00:17:10'),('a6c12aa6edb3e4ea47d1b32d76bda088',4,'2026-10-08 22:16:58','2026-09-24 23:17:10'),('a7f143e36e93d3c51550770e87a92fa7',4,'2026-09-11 22:47:10','2026-08-28 22:47:10'),('a7f50027f709abdc993afbf6f6830658',4,'2026-08-27 07:55:04','2026-08-27 07:34:58'),('a7fdf89dd8f44615f1daa1d980655624',4,'2026-09-09 20:32:49','2026-08-27 14:12:53'),('a9b8930ab5809578d4f3bb2211ea3ef8',4,'2026-09-07 21:00:54','2026-08-24 22:06:24'),('aa39d817315e113645851fe3af29b418',4,'2026-09-08 08:54:33','2026-09-08 08:20:34'),('aa59587c09f776f34f19d719af557a86',4,'2026-09-26 16:12:14','2026-09-12 17:14:37'),('aaee5d563a709dd396205b308f18b1e4',4,'2026-09-12 18:26:22','2026-08-29 18:26:23'),('ac370e0bf4928622b154a4c7d04cf58c',4,'2026-09-11 19:09:35','2026-08-28 20:50:57'),('adaf40be3983afd3b06b3aa896678218',4,'2026-10-09 06:16:18','2026-09-26 09:37:35'),('adf874598e4ec0492e07913eebedd5e7',4,'2026-09-12 18:14:37','2026-09-12 17:43:54'),('af11f836249c2d63bfe20a344aef3544',4,'2026-08-29 09:34:05','2026-08-29 08:43:56'),('af363a26b7ea5bb0d7ba2f007e431624',4,'2026-09-15 08:46:52','2026-09-01 12:34:16'),('af4651026fe920259f0f2b0ce4b27f84',4,'2026-09-11 22:47:08','2026-08-28 22:47:08'),('af91c8a491e54544b9568a82ccb43a34',4,'2026-09-28 08:04:26','2026-09-14 11:52:40'),('afc04d560f1a0c21bb763af800551792',4,'2026-09-09 09:26:33','2026-08-27 06:55:04'),('b2ff23378ee90756ce7047e51746b7e1',4,'2026-10-11 08:19:01','2026-09-27 09:19:13'),('b3b85ab1c59770c941e32af251f84beb',4,'2026-10-08 19:16:43','2026-09-24 20:16:44'),('b57937eb5b88888e923a8ee913295ff9',4,'2026-08-20 11:34:08','2026-08-20 10:34:46'),('b76cd282cbf89b1897355c4f5126a2cc',4,'2026-10-08 19:14:33','2026-09-24 20:15:18'),('b8007e9473bc334e102c23d0fc3e3d75',4,'2026-10-09 03:16:18','2026-09-25 04:16:18'),('b9d3594fe599eefcf62eb39ec1579cc6',4,'2026-10-02 20:58:05','2026-09-19 16:40:33'),('ba2a25c1b32bff19ad006ac94b546c15',4,'2026-09-14 09:04:15','2026-09-14 08:04:20'),('bba96520785f29312876348c71aff5bb',4,'2026-09-15 17:58:57','2026-09-01 19:10:01'),('bcf52736ef3aa861b739ceed52109aa2',4,'2026-09-10 07:54:15','2026-08-27 07:54:16'),('be02a8d316350dbb83bdac643e583923',4,'2026-09-11 17:07:07','2026-08-28 18:07:09'),('be1283b3112e855236a68c7c73f38d8c',4,'2026-09-07 18:46:41','2026-08-24 21:00:54'),('be2527549e2411ab59d2f08e3a0586bf',4,'2026-09-09 07:09:44','2026-08-26 09:26:33'),('c02ca44aae6b55818864988838431112',403,'2026-10-11 12:33:01','2026-09-27 13:33:02'),('c0f0d66acbdfb786372d5216067f64bf',4,'2026-09-05 14:46:43','2026-08-22 15:47:41'),('c15027b22068ef458941e37e29e2de4f',4,'2026-09-05 16:34:50','2026-08-22 17:37:28'),('c2580c3301092620438a1e8e014e5a04',403,'2026-10-13 18:24:16','2026-09-29 19:24:21'),('c25f5c8e065845850df51770b12d4c91',4,'2026-09-11 16:50:06','2026-08-28 17:51:45'),('c3cacbb45425284578a6c2c7a70930f8',4,'2026-09-06 17:20:17','2026-09-06 16:40:42'),('c44f1de684c82e8d3e273c6550e6b1d0',4,'2026-10-11 12:28:48','2026-09-27 13:28:49'),('c479357ba74fcd67d34ea5db4f371730',403,'2026-10-12 12:48:51','2026-09-29 14:24:09'),('c49cb926cfdd44927d01923b6bb28cce',4,'2026-08-19 15:23:21','2026-08-19 14:31:32'),('c5c97ba2cf1a13e39b8dc1c1f8df10f8',4,'2026-10-09 10:00:21','2026-09-25 11:00:41'),('c716a025070c52278cbc8260fe48d06c',4,'2026-08-20 11:07:54','2026-08-20 10:08:05'),('c8407de1ec37133e7c3a6892bd9076ec',4,'2026-10-05 17:11:16','2026-09-21 19:27:43'),('c85e681e6d2088dabf7d781a277babc0',4,'2026-09-16 20:55:37','2026-09-03 17:49:44'),('ca3013662e57539d0490cf5703fc7c60',4,'2026-10-06 16:45:19','2026-09-22 18:23:56'),('ca3f8076330ee697511dcb7db321f04f',4,'2026-10-09 02:16:18','2026-09-25 03:16:18'),('ca989c2bb756c57306b09ce1266e2d0b',4,'2026-09-07 22:48:56','2026-09-07 21:57:00'),('cc8f87b2d7ad236ba37f87b8c0700210',4,'2026-10-11 16:30:24','2026-09-29 14:24:48'),('cd0c9af4d23af13be4f61a351ef16507',4,'2026-10-07 18:25:36','2026-09-23 19:25:42'),('cd14dfe265fe5d8fb38a926969141056',4,'2026-09-28 16:15:46','2026-09-14 16:15:48'),('ce45211a0da7a16d6592c9ad1c828b3e',4,'2026-09-13 09:24:49','2026-08-30 11:28:22'),('cf6e3583f834f89a8f631b5b9f440bf0',4,'2026-10-13 19:53:52','2026-09-29 20:53:52'),('d0f9f712524d9984407925223d977195',4,'2026-09-14 17:15:50','2026-09-14 16:16:22'),('d2f5d17cdd2a3d83183d29cde8364c77',4,'2026-10-08 17:16:24','2026-09-24 18:16:24'),('d32f76d2eae9db53d6d88fe0bc107179',403,'2026-10-11 12:23:56','2026-09-27 13:24:49'),('d5151f2cd93fe0b01140955ff44b73c1',4,'2026-10-06 19:28:09','2026-09-22 19:28:10'),('d557f6699b79758ccb90264a90a8944b',4,'2026-09-28 16:15:45','2026-09-14 16:15:46'),('d603ec3515c7fa2c1800dc918b232fa3',4,'2026-09-13 14:59:56','2026-08-30 16:06:26'),('d6e3ccfa9e5af6509532a939dcad9ff8',4,'2026-09-06 16:58:30','2026-08-23 18:04:25'),('d74760feb8bc0c81457c61aab48c7606',4,'2026-08-22 15:47:59','2026-08-22 15:05:31'),('d8c247f83da145d2f924df11a7188d46',4,'2026-10-06 18:23:56','2026-09-22 19:28:09'),('d91f5816c0ef71cda146abe841e652e8',4,'2026-09-14 11:59:14','2026-08-31 11:59:15'),('dbb7cab31e2e20c3303485390505b14a',403,'2026-10-12 09:48:51','2026-09-28 10:48:51'),('dc6d46f1bd525e73fb2cd0d0a2415b92',4,'2026-09-16 14:34:15','2026-09-02 15:40:52'),('e02c2dfb79fadab7ea197089bd3e2ede',4,'2026-10-10 15:31:06','2026-09-26 16:31:11'),('e12fa025aa465c161e2b880a3c3dc0c3',4,'2026-09-11 22:47:10','2026-08-28 22:47:11'),('e1c89837b70190c2f3ddd4b033828bd3',4,'2026-09-10 13:53:58','2026-08-27 15:37:35'),('e2850892c9a2d7138e808af46c226a4f',4,'2026-09-05 17:34:34','2026-09-05 16:34:58'),('e35b0ab93590dd57d3c1673270b16c1d',403,'2026-10-11 14:25:25','2026-09-27 15:25:37'),('e6327b791b500ae6a07e925a54daecc9',4,'2026-09-15 20:17:24','2026-09-01 21:35:50'),('e67657cb853f6eab93f110468d51ef1e',4,'2026-09-06 17:45:01','2026-09-06 17:00:54'),('e733ba0a9bec8f6cac6c7de8940dd337',4,'2026-08-19 21:13:55','2026-08-19 20:16:47'),('e774dcbdf27eb124fab195ba96628f5b',4,'2026-09-14 07:56:37','2026-08-31 11:59:14'),('e7c95e4544c706aec819251a7768c8da',4,'2026-09-28 13:41:27','2026-09-14 16:15:45'),('e9424c71ce5b247f7dbbd3288f7aaadd',4,'2026-09-10 06:52:25','2026-08-27 07:54:15'),('ea63651b07fafb28337c5116b057cd31',4,'2026-09-21 07:21:09','2026-09-07 09:04:34'),('eb0f449767e5b26ee9f9321be1882bfb',4,'2026-10-09 11:00:41','2026-09-26 08:49:42'),('eb649ff0cad579ec6593ecf384874b07',4,'2026-10-09 01:16:18','2026-09-25 02:16:18'),('ec6021514262b289818a78ea8f58b312',4,'2026-09-12 08:31:25','2026-08-29 10:07:26'),('ec73a646f4ef7396b85ec9bc854f38a7',4,'2026-09-01 15:40:20','2026-09-01 14:45:43'),('ecaf895d24599dc3fe958827df3bfc84',403,'2026-09-27 11:22:34','2026-09-27 10:32:33'),('f0482b110d8090999cfc9d0e962f0112',4,'2026-08-28 21:51:37','2026-08-28 21:35:45'),('f070bf8c19c0194b9e9a137c40b21565',4,'2026-09-11 13:45:09','2026-08-28 15:38:28'),('f09f0299b3afd53426ec6c8b789276ed',4,'2026-09-21 18:12:59','2026-09-07 19:33:41'),('f16d3db0c3bfdfe94d243002cd2ab790',4,'2026-09-13 16:35:30','2026-08-30 17:49:54'),('f23b42d860a92bf60fc852de956fdec5',4,'2026-09-11 17:51:45','2026-08-28 19:09:35'),('f25328e9780e4e0981a3303c087322fc',4,'2026-09-06 19:03:21','2026-09-06 18:05:45'),('f2897d6a510adfd78463d437bdbd4cd8',4,'2026-09-16 15:40:52','2026-09-02 17:08:53'),('f295bfa26eeef6ec764e0b8212e75141',4,'2026-10-10 12:01:55','2026-09-26 13:02:06'),('f2ea55f3253c0507b37b3b69869d751a',4,'2026-09-13 17:49:54','2026-08-31 06:45:05'),('f3ad27ea9158ee91c90688e24d8db5fd',4,'2026-09-07 09:01:22','2026-09-07 08:01:36'),('f4a848eae16f7136f16ccf351e720cc5',403,'2026-10-13 19:24:21','2026-09-29 20:24:36'),('f527cc5979bdca973d286e29e10e9a90',4,'2026-09-24 12:46:43','2026-09-10 22:45:32'),('f52d561b5cdff7fea527722bdd055ab8',4,'2026-09-21 10:58:38','2026-09-07 17:11:43'),('f7df65e3066729ee0d5b0aec6b72703b',4,'2026-09-28 16:15:48','2026-09-14 16:15:50'),('fa7281b8d0c05db8857d61a7fa231224',4,'2026-10-10 16:31:15','2026-09-26 16:31:18'),('fbcb59f5adf5ba9bd8c8c43a6ea9129f',4,'2026-09-19 17:40:33','2026-09-19 17:06:03'),('fbd60e70ebe2e0483a64f32a1da19599',403,'2026-09-27 17:33:33','2026-09-27 16:58:04'),('fd050d94c7f95ddf1e3b07c6f4d75a0f',4,'2026-09-28 13:21:08','2026-09-14 13:21:09'),('fd632a36ca682f0fe11a734f50067919',4,'2026-10-10 10:37:51','2026-09-26 11:37:58'),('ff158b63d8bb152039b98ed56eeb168f',403,'2026-10-11 15:33:21','2026-09-27 16:33:33'),('ff2598ce665c73f455635ded6a425231',4,'2026-10-11 10:19:49','2026-09-27 12:28:48'),('ff3314ea24516fa6a30d1cce4f16f3ef',4,'2026-09-14 14:58:18','2026-08-31 16:51:56');
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
) ENGINE=InnoDB AUTO_INCREMENT=820 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (91,3,1,'2026-08-16 16:41:35'),(92,3,5,'2026-08-16 16:41:35'),(93,3,6,'2026-08-16 16:41:35'),(94,3,7,'2026-08-16 16:41:35'),(95,3,8,'2026-08-16 16:41:35'),(96,3,9,'2026-08-16 16:41:35'),(97,3,10,'2026-08-16 16:41:35'),(98,3,11,'2026-08-16 16:41:35'),(99,3,12,'2026-08-16 16:41:35'),(100,3,13,'2026-08-16 16:41:35'),(101,3,14,'2026-08-16 16:41:35'),(102,3,15,'2026-08-16 16:41:35'),(103,3,16,'2026-08-16 16:41:35'),(104,3,17,'2026-08-16 16:41:35'),(105,3,18,'2026-08-16 16:41:35'),(106,3,21,'2026-08-16 16:41:35'),(107,3,22,'2026-08-16 16:41:35'),(108,3,27,'2026-08-16 16:41:35'),(109,3,28,'2026-08-16 16:41:35'),(110,3,29,'2026-08-16 16:41:35'),(111,3,31,'2026-08-16 16:41:35'),(112,3,33,'2026-08-16 16:41:35'),(113,3,34,'2026-08-16 16:41:35'),(114,3,35,'2026-08-16 16:41:35'),(115,3,36,'2026-08-16 16:41:35'),(116,3,37,'2026-08-16 16:41:35'),(117,3,38,'2026-08-16 16:41:35'),(118,3,39,'2026-08-16 16:41:35'),(119,3,40,'2026-08-16 16:41:35'),(120,3,41,'2026-08-16 16:41:35'),(121,3,42,'2026-08-16 16:41:35'),(122,3,43,'2026-08-16 16:41:35'),(123,3,44,'2026-08-16 16:41:35'),(124,3,45,'2026-08-16 16:41:35'),(143,5,1,'2026-08-16 16:41:35'),(144,5,5,'2026-08-16 16:41:35'),(238,8,1,'2026-08-19 21:33:36'),(239,8,5,'2026-08-19 21:33:36'),(240,8,8,'2026-08-19 21:33:36'),(241,8,9,'2026-08-19 21:33:36'),(242,8,10,'2026-08-19 21:33:36'),(243,8,12,'2026-08-19 21:33:36'),(244,8,13,'2026-08-19 21:33:36'),(245,8,15,'2026-08-19 21:33:36'),(246,8,16,'2026-08-19 21:33:36'),(247,8,27,'2026-08-19 21:33:36'),(248,8,29,'2026-08-19 21:33:36'),(249,8,31,'2026-08-19 21:33:36'),(250,8,21,'2026-08-19 21:33:36'),(251,8,38,'2026-08-19 21:33:36'),(252,8,40,'2026-08-19 21:33:36'),(253,8,41,'2026-08-19 21:33:36'),(254,8,42,'2026-08-19 21:33:36'),(255,8,43,'2026-08-19 21:33:36'),(256,8,44,'2026-08-19 21:33:36'),(257,8,45,'2026-08-19 21:33:36'),(392,3,46,'2026-08-22 16:01:35'),(539,3,48,'2026-08-30 14:25:26'),(540,3,49,'2026-08-30 14:25:26'),(541,8,48,'2026-08-30 14:25:26'),(543,6,1,'2026-08-30 15:22:58'),(544,6,18,'2026-08-30 15:22:58'),(545,6,19,'2026-08-30 15:22:58'),(546,6,20,'2026-08-30 15:22:58'),(547,6,21,'2026-08-30 15:22:58'),(548,6,25,'2026-08-30 15:22:58'),(549,6,27,'2026-08-30 15:22:58'),(550,6,29,'2026-08-30 15:22:58'),(551,6,31,'2026-08-30 15:22:58'),(552,6,38,'2026-08-30 15:22:58'),(553,6,39,'2026-08-30 15:22:58'),(554,6,46,'2026-08-30 15:22:58'),(555,6,48,'2026-08-30 15:22:58'),(556,4,1,'2026-08-30 15:25:06'),(557,4,5,'2026-08-30 15:25:06'),(558,4,8,'2026-08-30 15:25:06'),(559,4,9,'2026-08-30 15:25:06'),(560,4,12,'2026-08-30 15:25:06'),(561,4,13,'2026-08-30 15:25:06'),(562,4,14,'2026-08-30 15:25:06'),(563,4,15,'2026-08-30 15:25:06'),(564,4,16,'2026-08-30 15:25:06'),(565,4,21,'2026-08-30 15:25:06'),(566,4,29,'2026-08-30 15:25:06'),(567,4,31,'2026-08-30 15:25:06'),(568,4,38,'2026-08-30 15:25:06'),(569,4,40,'2026-08-30 15:25:06'),(570,4,41,'2026-08-30 15:25:06'),(571,4,42,'2026-08-30 15:25:06'),(572,4,43,'2026-08-30 15:25:06'),(573,4,44,'2026-08-30 15:25:06'),(574,4,48,'2026-08-30 15:25:06'),(575,4,27,'2026-08-30 17:17:27'),(578,3,50,'2026-09-06 16:13:24'),(579,6,50,'2026-09-06 16:13:24'),(580,8,50,'2026-09-06 16:13:24'),(581,6,51,'2026-09-12 17:04:59'),(582,6,52,'2026-09-12 17:04:59'),(583,3,51,'2026-09-12 17:04:59'),(584,3,52,'2026-09-12 17:04:59'),(588,1,1,'2026-09-12 17:43:48'),(589,1,2,'2026-09-12 17:43:48'),(590,1,3,'2026-09-12 17:43:48'),(591,1,4,'2026-09-12 17:43:48'),(592,1,5,'2026-09-12 17:43:48'),(593,1,6,'2026-09-12 17:43:48'),(594,1,7,'2026-09-12 17:43:48'),(595,1,8,'2026-09-12 17:43:48'),(596,1,9,'2026-09-12 17:43:48'),(597,1,10,'2026-09-12 17:43:48'),(598,1,11,'2026-09-12 17:43:48'),(599,1,12,'2026-09-12 17:43:48'),(600,1,13,'2026-09-12 17:43:48'),(601,1,14,'2026-09-12 17:43:48'),(602,1,15,'2026-09-12 17:43:48'),(603,1,16,'2026-09-12 17:43:48'),(604,1,17,'2026-09-12 17:43:48'),(605,1,18,'2026-09-12 17:43:48'),(606,1,19,'2026-09-12 17:43:48'),(607,1,20,'2026-09-12 17:43:48'),(608,1,21,'2026-09-12 17:43:48'),(609,1,22,'2026-09-12 17:43:48'),(610,1,23,'2026-09-12 17:43:48'),(611,1,24,'2026-09-12 17:43:48'),(612,1,25,'2026-09-12 17:43:48'),(613,1,26,'2026-09-12 17:43:48'),(614,1,27,'2026-09-12 17:43:48'),(615,1,28,'2026-09-12 17:43:48'),(616,1,29,'2026-09-12 17:43:48'),(617,1,30,'2026-09-12 17:43:48'),(618,1,31,'2026-09-12 17:43:48'),(619,1,32,'2026-09-12 17:43:48'),(620,1,33,'2026-09-12 17:43:48'),(621,1,34,'2026-09-12 17:43:48'),(622,1,35,'2026-09-12 17:43:48'),(623,1,36,'2026-09-12 17:43:48'),(624,1,37,'2026-09-12 17:43:48'),(625,1,38,'2026-09-12 17:43:48'),(626,1,39,'2026-09-12 17:43:48'),(627,1,40,'2026-09-12 17:43:48'),(628,1,41,'2026-09-12 17:43:48'),(629,1,42,'2026-09-12 17:43:48'),(630,1,43,'2026-09-12 17:43:48'),(631,1,44,'2026-09-12 17:43:48'),(632,1,45,'2026-09-12 17:43:48'),(633,1,46,'2026-09-12 17:43:48'),(634,1,47,'2026-09-12 17:43:48'),(635,1,48,'2026-09-12 17:43:48'),(636,1,49,'2026-09-12 17:43:48'),(637,1,50,'2026-09-12 17:43:48'),(638,1,51,'2026-09-12 17:43:48'),(639,1,52,'2026-09-12 17:43:48'),(640,6,53,'2026-09-13 17:06:38'),(641,6,54,'2026-09-13 17:06:38'),(642,3,53,'2026-09-13 17:06:38'),(643,3,54,'2026-09-13 17:06:38'),(644,8,53,'2026-09-13 17:06:38'),(645,8,54,'2026-09-13 17:06:38'),(646,4,53,'2026-09-13 17:06:38'),(647,1,54,'2026-09-14 01:22:04'),(648,1,53,'2026-09-14 01:22:04'),(651,1,56,'2026-09-23 18:16:05'),(653,3,56,'2026-09-23 18:16:05'),(654,6,56,'2026-09-23 18:16:05'),(710,12,1,'2026-09-26 12:19:58'),(711,12,2,'2026-09-26 12:19:58'),(712,12,3,'2026-09-26 12:19:58'),(713,12,4,'2026-09-26 12:19:58'),(714,12,5,'2026-09-26 12:19:58'),(715,12,6,'2026-09-26 12:19:58'),(716,12,7,'2026-09-26 12:19:58'),(717,12,8,'2026-09-26 12:19:58'),(718,12,9,'2026-09-26 12:19:58'),(719,12,10,'2026-09-26 12:19:58'),(720,12,11,'2026-09-26 12:19:58'),(721,12,12,'2026-09-26 12:19:58'),(722,12,13,'2026-09-26 12:19:58'),(723,12,14,'2026-09-26 12:19:58'),(724,12,15,'2026-09-26 12:19:58'),(725,12,16,'2026-09-26 12:19:58'),(726,12,17,'2026-09-26 12:19:58'),(727,12,18,'2026-09-26 12:19:58'),(728,12,19,'2026-09-26 12:19:58'),(729,12,20,'2026-09-26 12:19:58'),(730,12,21,'2026-09-26 12:19:58'),(731,12,22,'2026-09-26 12:19:58'),(732,12,23,'2026-09-26 12:19:58'),(733,12,24,'2026-09-26 12:19:58'),(734,12,25,'2026-09-26 12:19:58'),(735,12,26,'2026-09-26 12:19:58'),(736,12,27,'2026-09-26 12:19:58'),(737,12,28,'2026-09-26 12:19:58'),(738,12,29,'2026-09-26 12:19:58'),(739,12,30,'2026-09-26 12:19:58'),(740,12,31,'2026-09-26 12:19:58'),(741,12,32,'2026-09-26 12:19:58'),(742,12,33,'2026-09-26 12:19:58'),(743,12,34,'2026-09-26 12:19:58'),(744,12,35,'2026-09-26 12:19:58'),(745,12,36,'2026-09-26 12:19:58'),(746,12,37,'2026-09-26 12:19:58'),(747,12,38,'2026-09-26 12:19:58'),(748,12,39,'2026-09-26 12:19:58'),(749,12,40,'2026-09-26 12:19:58'),(750,12,41,'2026-09-26 12:19:58'),(751,12,42,'2026-09-26 12:19:58'),(752,12,43,'2026-09-26 12:19:58'),(753,12,44,'2026-09-26 12:19:58'),(754,12,45,'2026-09-26 12:19:58'),(755,12,46,'2026-09-26 12:19:58'),(756,12,47,'2026-09-26 12:19:58'),(757,12,48,'2026-09-26 12:19:58'),(758,12,49,'2026-09-26 12:19:58'),(759,12,50,'2026-09-26 12:19:58'),(760,12,51,'2026-09-26 12:19:58'),(761,12,52,'2026-09-26 12:19:58'),(762,12,53,'2026-09-26 12:19:58'),(763,12,54,'2026-09-26 12:19:58'),(764,12,56,'2026-09-26 12:19:58'),(765,12,57,'2026-09-26 12:19:58'),(766,2,1,'2026-09-27 10:32:21'),(767,2,2,'2026-09-27 10:32:21'),(768,2,3,'2026-09-27 10:32:21'),(769,2,4,'2026-09-27 10:32:21'),(770,2,5,'2026-09-27 10:32:21'),(771,2,6,'2026-09-27 10:32:21'),(772,2,7,'2026-09-27 10:32:21'),(773,2,8,'2026-09-27 10:32:21'),(774,2,9,'2026-09-27 10:32:21'),(775,2,10,'2026-09-27 10:32:21'),(776,2,11,'2026-09-27 10:32:21'),(777,2,12,'2026-09-27 10:32:21'),(778,2,13,'2026-09-27 10:32:21'),(779,2,14,'2026-09-27 10:32:21'),(780,2,15,'2026-09-27 10:32:21'),(781,2,16,'2026-09-27 10:32:21'),(782,2,17,'2026-09-27 10:32:21'),(783,2,18,'2026-09-27 10:32:21'),(784,2,19,'2026-09-27 10:32:21'),(785,2,20,'2026-09-27 10:32:21'),(786,2,21,'2026-09-27 10:32:21'),(787,2,22,'2026-09-27 10:32:21'),(788,2,23,'2026-09-27 10:32:21'),(789,2,24,'2026-09-27 10:32:21'),(790,2,25,'2026-09-27 10:32:21'),(791,2,27,'2026-09-27 10:32:21'),(792,2,28,'2026-09-27 10:32:21'),(793,2,29,'2026-09-27 10:32:21'),(794,2,30,'2026-09-27 10:32:21'),(795,2,31,'2026-09-27 10:32:21'),(796,2,32,'2026-09-27 10:32:21'),(797,2,33,'2026-09-27 10:32:21'),(798,2,34,'2026-09-27 10:32:21'),(799,2,35,'2026-09-27 10:32:21'),(800,2,36,'2026-09-27 10:32:21'),(801,2,37,'2026-09-27 10:32:21'),(802,2,38,'2026-09-27 10:32:21'),(803,2,39,'2026-09-27 10:32:21'),(804,2,40,'2026-09-27 10:32:21'),(805,2,41,'2026-09-27 10:32:21'),(806,2,42,'2026-09-27 10:32:21'),(807,2,43,'2026-09-27 10:32:21'),(808,2,44,'2026-09-27 10:32:21'),(809,2,45,'2026-09-27 10:32:21'),(810,2,46,'2026-09-27 10:32:21'),(811,2,47,'2026-09-27 10:32:21'),(812,2,48,'2026-09-27 10:32:21'),(813,2,49,'2026-09-27 10:32:21'),(814,2,50,'2026-09-27 10:32:21'),(815,2,51,'2026-09-27 10:32:21'),(816,2,52,'2026-09-27 10:32:21'),(817,2,53,'2026-09-27 10:32:21'),(818,2,54,'2026-09-27 10:32:21'),(819,2,56,'2026-09-27 10:32:21');
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,1,'Super Admin','Full access across the entire system',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(2,1,'Company Admin','Full access within their company and system',1,'2026-08-16 16:41:35','2026-09-27 10:30:03'),(3,1,'Store Manager','Manages day-to-day store operations',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(4,1,'Cashier','Rings up sales at the POS terminal',1,'2026-08-16 16:41:35','2026-08-31 14:24:31'),(5,1,'Bagger','Assists with packing and stock visibility only',1,'2026-08-16 16:41:35','2026-08-16 16:41:35'),(6,1,'Store Admin','Full access, typically scoped to specific stores via Store Access',1,'2026-08-19 19:46:00','2026-08-19 19:46:00'),(8,1,'Cashier Supervisor','Supervises cashiers — can void sales and approve returns',1,'2026-08-19 21:33:36','2026-08-19 21:33:36'),(12,1,'Dev Admin','Full access across the entire system, for dev/testing accounts - same permissions as Super Admin, but Custom (not System) so it can be freely edited or deleted.',0,'2026-09-26 11:25:08','2026-09-26 11:25:08');
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
) ENGINE=InnoDB AUTO_INCREMENT=89 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
  CONSTRAINT `sales_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_product_favorites`
--

DROP TABLE IF EXISTS `store_product_favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `store_product_favorites` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `store_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `store_id_product_id` (`store_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `store_product_favorites_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `store_product_favorites_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_product_favorites`
--

LOCK TABLES `store_product_favorites` WRITE;
/*!40000 ALTER TABLE `store_product_favorites` DISABLE KEYS */;
/*!40000 ALTER TABLE `store_product_favorites` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=450 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
  `opening_float_mode` varchar(20) NOT NULL DEFAULT 'manual',
  `default_opening_float` decimal(15,2) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stores`
--

LOCK TABLES `stores` WRITE;
/*!40000 ALTER TABLE `stores` DISABLE KEYS */;
INSERT INTO `stores` VALUES (27,1,'PUREGOLD DAU','101','fixed',3000.00,NULL,'Thank you, come again','22222','222','22','22',NULL,NULL,1,NULL,NULL,1,'2026-09-27 14:12:43','2026-09-27 14:12:43'),(28,1,'PUREGOLD SHAW','102','fixed',5000.00,'SHAW','Thank you, come again','222','33','S',NULL,NULL,NULL,1,NULL,NULL,1,'2026-09-27 14:19:19','2026-09-27 14:19:19'),(29,1,'PUREGOLD CAFE FERNANDINO','232','manual',NULL,'SANNN FERNANDO','Thank you, come again','222','333',NULL,NULL,NULL,NULL,1,NULL,NULL,1,'2026-09-27 14:20:08','2026-09-27 14:20:08'),(30,1,'PUREGOLD ARAYAT','180','fixed',5000.00,'ARAYAT','Thank you, come again','55','33','11','553',NULL,NULL,1,'999',NULL,1,'2026-09-27 14:28:44','2026-09-27 14:28:44');
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
  `is_system` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id_name` (`company_id`,`name`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `tax_rates_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_rates`
--

LOCK TABLES `tax_rates` WRITE;
/*!40000 ALTER TABLE `tax_rates` DISABLE KEYS */;
INSERT INTO `tax_rates` VALUES (10,1,'VAT','vat',12.0000,1,1,1,'2026-09-20 17:19:30','2026-09-20 17:19:30'),(11,1,'GST','gst',10.0000,1,1,1,'2026-09-20 17:19:30','2026-09-20 17:19:30'),(12,1,'VAT EXEMPT','vat',0.0000,0,1,1,'2026-09-20 17:27:04','2026-09-20 17:27:04'),(13,1,'ZERO RATED','vat',0.0000,0,1,1,'2026-09-20 17:27:04','2026-09-20 17:27:04'),(14,1,'NON VAT','vat',0.0000,0,1,1,'2026-09-20 17:27:04','2026-09-20 17:27:04');
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
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=267 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
  `email` varchar(150) DEFAULT NULL,
  `username` varchar(60) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=404 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (4,1,12,'Admininstrator','admin@yahoo.com','admin1','$2y$10$YHjf3rLlPqrdjsH32Fo3HOCxXf9yzE31K7ZsP0KeIAidFpzqVwEpW',0,NULL,'2026-09-14 08:04:15',NULL,NULL,1,'2026-09-27 16:30:24','2026-08-18 21:18:33','2026-09-27 16:30:24'),(147,1,1,'QA Regression Tester','qa.regression@pos-system.local','qa_regression','$2y$10$6ur6nFhC4Oajf./tJbGd1.SY61slPoLtCipnx/X4d4XFmC.3YF/Wy',0,NULL,NULL,NULL,NULL,1,'2026-09-29 16:42:03','2026-08-30 02:20:59','2026-09-29 16:42:03'),(399,1,1,'QA Chat Fixture','qa.chat.fixture.e3cd6f@pos-system.local','qa_chat_fixture_e3cd6f','$2y$10$eNf8pGBuzgCqcHQf0ep3juRmuWUOAdAIUAiEXBTyAbEhWxqGlbiJS',0,NULL,'2026-09-23 18:21:11',NULL,NULL,0,'2026-09-23 18:23:16','2026-09-23 18:21:11','2026-09-23 19:02:55'),(400,1,1,'QA Chat Creator Check','qa.chat.creator.check@pos-system.local','qa_chat_creator_check','$2y$10$4t1cPGGdk4ZqzTXNzM9TTOO.FAmLrG3NiXNWY3aBpyiq47A4N1DsG',0,NULL,'2026-09-23 19:40:46',NULL,NULL,0,'2026-09-26 12:26:41','2026-09-23 19:40:46','2026-09-26 12:27:06'),(403,1,2,'company admin',NULL,'companyadmin','$2y$10$sZ3t08D6gD/BSmD0m9RX7.XAwqHNjzXp75JSlirr3KTEdEGHuF4TG',0,NULL,'2026-09-27 10:22:13',NULL,NULL,1,'2026-09-30 07:42:19','2026-09-27 10:22:13','2026-09-30 07:42:19');
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
  KEY `company_id` (`company_id`),
  KEY `register_id_business_date` (`register_id`,`business_date`),
  KEY `z_readings_generated_by_foreign` (`generated_by`),
  CONSTRAINT `z_readings_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `z_readings_generated_by_foreign` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
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

-- Dump completed on 2026-09-30 21:17:17
