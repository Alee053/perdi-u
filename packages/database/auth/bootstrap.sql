-- Idempotent bootstrap for Supabase Auth (GoTrue) on the existing PostgreSQL cluster.
-- Creates only the auth role/database; PerdiU data in perdiu_dev is never read or modified.
\set ON_ERROR_STOP on

SELECT format('CREATE ROLE perdiu_auth LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'auth_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'perdiu_auth') \gexec
SELECT format('ALTER ROLE perdiu_auth WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'auth_password') \gexec
ALTER ROLE perdiu_auth SET search_path = auth;

-- GoTrue migrations grant read access to a role named postgres; it cannot log in.
SELECT 'CREATE ROLE postgres NOLOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') \gexec

SELECT 'CREATE DATABASE perdiu_auth OWNER perdiu_auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'perdiu_auth') \gexec
REVOKE ALL ON DATABASE perdiu_auth FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE perdiu_auth TO perdiu_auth;

\connect perdiu_auth
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION perdiu_auth;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
