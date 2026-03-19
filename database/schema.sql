-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: ccio
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `API`
--

DROP TABLE IF EXISTS `API`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `API` (
  `ke` varchar(50) DEFAULT NULL,
  `uid` varchar(50) DEFAULT NULL,
  `ip` varchar(255) DEFAULT NULL,
  `code` varchar(100) DEFAULT NULL,
  `details` text,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Alarms`
--

DROP TABLE IF EXISTS `Alarms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Alarms` (
  `ke` varchar(50) DEFAULT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `videos` text,
  `notes` varchar(100) DEFAULT NULL,
  `status` tinyint(1) DEFAULT '0',
  `editedBy` varchar(50) DEFAULT NULL,
  `details` text,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `end` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CameraGroups`
--

DROP TABLE IF EXISTS `CameraGroups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CameraGroups` (
  `id` varchar(20) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `group_key` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `camera_ids` json NOT NULL COMMENT 'Array de hasta 6 IDs de cámaras',
  `grid_size` int DEFAULT '4' COMMENT 'Tamaño del grid: 1, 2, 4, 6',
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_group` (`group_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Cloud Timelapse Frames`
--

DROP TABLE IF EXISTS `Cloud Timelapse Frames`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Cloud Timelapse Frames` (
  `ke` varchar(50) DEFAULT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `href` text,
  `filename` varchar(50) DEFAULT NULL,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `size` bigint DEFAULT NULL,
  `details` text,
  `type` varchar(15) DEFAULT 's3'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Cloud Videos`
--

DROP TABLE IF EXISTS `Cloud Videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Cloud Videos` (
  `ke` varchar(50) DEFAULT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `href` text,
  `size` bigint DEFAULT NULL,
  `details` text,
  `status` int DEFAULT '0',
  `archive` tinyint(1) DEFAULT '0',
  `objects` varchar(510) DEFAULT NULL,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `end` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `type` varchar(15) DEFAULT 's3',
  `ext` varchar(10) DEFAULT 'mp4'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Custom Settings`
--

DROP TABLE IF EXISTS `Custom Settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Custom Settings` (
  `ke` varchar(50) DEFAULT NULL,
  `uid` varchar(50) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `details` text,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Events`
--

DROP TABLE IF EXISTS `Events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Events` (
  `ke` varchar(50) DEFAULT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `details` text,
  `archive` tinyint(1) DEFAULT '0',
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `events_index` (`ke`,`mid`,`time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Events Counts`
--

DROP TABLE IF EXISTS `Events Counts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Events Counts` (
  `ke` varchar(50) DEFAULT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `tag` varchar(30) DEFAULT NULL,
  `details` text,
  `name` varchar(255) DEFAULT NULL,
  `count` int DEFAULT '1',
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `end` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Files`
--

DROP TABLE IF EXISTS `Files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Files` (
  `ke` varchar(50) DEFAULT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `size` bigint DEFAULT NULL,
  `details` text,
  `status` int DEFAULT '0',
  `archive` tinyint(1) DEFAULT '0',
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `type` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LoginTokens`
--

DROP TABLE IF EXISTS `LoginTokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LoginTokens` (
  `loginId` varchar(255) DEFAULT NULL,
  `type` varchar(25) DEFAULT NULL,
  `ke` varchar(50) DEFAULT NULL,
  `uid` varchar(50) DEFAULT NULL,
  `name` varchar(50) DEFAULT 'Unknown',
  UNIQUE KEY `logintokens_loginid_unique` (`loginId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Logs`
--

DROP TABLE IF EXISTS `Logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Logs` (
  `ke` varchar(50) DEFAULT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `info` text,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `logs_index` (`ke`,`mid`,`time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Monitors`
--

DROP TABLE IF EXISTS `Monitors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Monitors` (
  `ke` varchar(50) DEFAULT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `details` longtext,
  `type` varchar(25) DEFAULT 'h264',
  `ext` varchar(10) DEFAULT 'mp4',
  `protocol` varchar(10) DEFAULT 'rtsp',
  `host` varchar(255) DEFAULT '0.0.0.0',
  `path` varchar(255) DEFAULT NULL,
  `port` int DEFAULT '554',
  `fps` int DEFAULT NULL,
  `mode` varchar(15) DEFAULT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `saveDir` varchar(255) DEFAULT NULL,
  `tags` varchar(500) DEFAULT NULL,
  KEY `monitors_index` (`ke`,`mid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Permission Sets`
--

DROP TABLE IF EXISTS `Permission Sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Permission Sets` (
  `ke` varchar(50) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `details` text,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Presets`
--

DROP TABLE IF EXISTS `Presets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Presets` (
  `ke` varchar(50) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `details` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Schedules`
--

DROP TABLE IF EXISTS `Schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Schedules` (
  `ke` varchar(50) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `details` text,
  `start` varchar(10) DEFAULT NULL,
  `end` varchar(10) DEFAULT NULL,
  `enabled` int DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Timelapse Frames`
--

DROP TABLE IF EXISTS `Timelapse Frames`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Timelapse Frames` (
  `ke` varchar(50) DEFAULT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `filename` varchar(50) DEFAULT NULL,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `size` bigint DEFAULT NULL,
  `archive` tinyint(1) DEFAULT '0',
  `saveDir` varchar(255) DEFAULT NULL,
  `details` text,
  KEY `timelapseframes_index` (`ke`,`mid`,`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `ke` varchar(50) DEFAULT NULL,
  `uid` varchar(50) DEFAULT NULL,
  `auth` varchar(50) DEFAULT NULL,
  `mail` varchar(100) DEFAULT NULL,
  `pass` varchar(100) DEFAULT NULL,
  `accountType` int DEFAULT '0',
  `details` longtext,
  UNIQUE KEY `users_mail_unique` (`mail`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Videos`
--

DROP TABLE IF EXISTS `Videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Videos` (
  `ke` varchar(50) DEFAULT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `ext` varchar(10) DEFAULT 'mp4',
  `size` bigint DEFAULT NULL,
  `status` tinyint(1) DEFAULT '0',
  `archive` tinyint(1) DEFAULT '0',
  `objects` varchar(510) DEFAULT NULL,
  `saveDir` varchar(255) DEFAULT NULL,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `end` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `details` text,
  KEY `videos_index` (`time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `camera_instance_mapping`
--

DROP TABLE IF EXISTS `camera_instance_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `camera_instance_mapping` (
  `camera_id` varchar(50) NOT NULL,
  `instance_id` int NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`camera_id`),
  KEY `idx_instance_id` (`instance_id`),
  CONSTRAINT `camera_instance_mapping_ibfk_1` FOREIGN KEY (`instance_id`) REFERENCES `mediamtx_instances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mediamtx_instances`
--

DROP TABLE IF EXISTS `mediamtx_instances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mediamtx_instances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `instance_id` int NOT NULL,
  `host` varchar(255) NOT NULL DEFAULT 'localhost',
  `port` int NOT NULL,
  `max_cameras` int DEFAULT '25',
  `enabled` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `instance_id` (`instance_id`),
  KEY `idx_instance_id` (`instance_id`),
  KEY `idx_enabled` (`enabled`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-19 20:15:58
