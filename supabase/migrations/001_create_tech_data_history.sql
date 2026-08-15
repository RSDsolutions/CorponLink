-- Migration: create tech_data_history table
-- Run this in Supabase SQL editor or include in your migration workflow
-- Ensure any previous failed version is removed
DROP TABLE IF EXISTS public.tech_data_history;

-- Create with client_id matching clients.id (UUID)
CREATE TABLE public.tech_data_history (
  id BIGSERIAL PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  changed_by UUID,
  old_ca TEXT,
  old_ba TEXT,
  old_npc TEXT,
  new_ca TEXT,
  new_ba TEXT,
  new_npc TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tech_data_history_client_id ON public.tech_data_history(client_id);
