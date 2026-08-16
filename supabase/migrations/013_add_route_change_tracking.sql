-- Migration: allow editing open routes and keep the reason for the change
-- Purpose: only open routes are editable, and each change must be justified

BEGIN;

ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS last_change_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_changed_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_routes_last_changed_at
  ON public.routes(last_changed_at);

COMMIT;
