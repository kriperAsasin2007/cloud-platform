-- Creates separate databases for each service.
-- The default POSTGRES_DB (cloud_db) is created automatically by the postgres image.
-- This script runs once on first container start.

CREATE DATABASE deployment_db;
CREATE DATABASE scheduler_db;
CREATE DATABASE metrics_db;
CREATE DATABASE worker_db;
CREATE DATABASE users_db;
