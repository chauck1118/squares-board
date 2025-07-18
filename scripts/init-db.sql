-- Initialize database for March Madness Squares
-- This script runs when the PostgreSQL container starts

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)
-- The database is created automatically by the postgres image

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Basic health check
SELECT 'Database initialized successfully' as status;