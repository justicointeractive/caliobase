-- Initialize PostgreSQL databases required by .env.test files
-- This script runs when the PostgreSQL container is first created

-- Create databases for testing
CREATE DATABASE caliobase;
CREATE DATABASE "typeorm-migrations";
CREATE DATABASE caliosbaseexampleapp;

-- Grant all privileges to the test user
GRANT ALL PRIVILEGES ON DATABASE caliobase TO test;
GRANT ALL PRIVILEGES ON DATABASE "typeorm-migrations" TO test;
GRANT ALL PRIVILEGES ON DATABASE caliosbaseexampleapp TO test;
