-- Migration: Add activation date and blocking fields to clients table
-- Purpose: Track service activation dates and prevent status changes once activated

BEGIN;

-- Add activation_date column (nullable, only populated when status = 'Activo')
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS activation_date DATE,
ADD COLUMN IF NOT EXISTS status_blocked BOOLEAN DEFAULT false;

-- Create index for filtering by activation date
CREATE INDEX IF NOT EXISTS idx_clients_activation_date
  ON public.clients(activation_date)
  WHERE activation_date IS NOT NULL;

-- Create index for filtering blocked clients
CREATE INDEX IF NOT EXISTS idx_clients_status_blocked
  ON public.clients(status_blocked)
  WHERE status_blocked = true;

COMMIT;
