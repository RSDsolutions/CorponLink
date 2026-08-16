-- Migration: Enhance advisors table and create supervisor_advisors junction table
-- This migration adds complete advisor data and a relationship table for supervisor-advisor assignments

BEGIN;

-- 1) Add missing columns to advisors table
ALTER TABLE public.advisors
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS second_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS first_surname VARCHAR(100),
ADD COLUMN IF NOT EXISTS second_surname VARCHAR(100),
ADD COLUMN IF NOT EXISTS document_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT false;

-- 2) Create supervisor_advisors junction table (one-to-many relationship)
-- This ensures an advisor can only be assigned to ONE supervisor at a time
CREATE TABLE IF NOT EXISTS public.supervisor_advisors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL REFERENCES public.advisors(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  -- Ensure each advisor is assigned to only one supervisor
  UNIQUE(advisor_id)
);

-- 3) Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_supervisor_advisors_supervisor_id
  ON public.supervisor_advisors(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_advisors_advisor_id
  ON public.supervisor_advisors(advisor_id);

-- 4) Add index to advisors for code uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisors_code
  ON public.advisors(code);

COMMIT;
