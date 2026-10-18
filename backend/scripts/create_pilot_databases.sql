\set ON_ERROR_STOP on

-- Run with psql in autocommit mode, not --single-transaction.
-- Existing databases are left untouched; the connecting role owns new ones.
SELECT format('CREATE DATABASE %I', name)
FROM (VALUES ('menurithm_pilot'), ('routecast_pilot')) AS desired(name)
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = name)
\gexec
