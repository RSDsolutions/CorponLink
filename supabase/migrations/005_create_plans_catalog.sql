BEGIN;

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family TEXT NOT NULL,
  plan TEXT NOT NULL,
  speed TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (family, plan)
);

CREATE INDEX IF NOT EXISTS idx_plans_family
  ON public.plans(family);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS plan TEXT;

UPDATE public.clients
SET plan = plan_name
WHERE plan IS NULL AND plan_name IS NOT NULL;

COMMIT;
