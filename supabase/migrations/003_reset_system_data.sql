-- Migration: Reset system data (clean all data except users/profiles)
-- This migration clears all business data while preserving user accounts and profiles

BEGIN;

-- 1) Delete tech_data_history records (clears all history)
DELETE FROM public.tech_data_history;
ALTER SEQUENCE tech_data_history_id_seq RESTART WITH 1;

-- 2) Delete all routes
DELETE FROM public.routes;

-- 3) Delete all clients
DELETE FROM public.clients;

-- 4) Delete all advisors
DELETE FROM public.advisors;

-- 5) Keep profiles and auth.users intact - they are preserved as-is

-- Reset any ID sequences (if they exist)
-- Uncomment if needed based on your table structure
-- ALTER SEQUENCE clients_id_seq RESTART WITH 1;
-- ALTER SEQUENCE routes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE advisors_id_seq RESTART WITH 1;

COMMIT;
