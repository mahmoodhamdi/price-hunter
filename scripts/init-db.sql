-- ============================================
-- Price Hunter - Database Initialization Script
-- Runs on first PostgreSQL container startup
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Performance settings for the session
SET work_mem = '256MB';
SET maintenance_work_mem = '512MB';

-- Create database if not exists (handled by Docker, but safety check)
-- Database 'price_hunter' is created by POSTGRES_DB env var

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE price_hunter TO postgres;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
END $$;
