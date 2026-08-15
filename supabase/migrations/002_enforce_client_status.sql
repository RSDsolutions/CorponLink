-- Migration: Map legacy client statuses to the new canonical set
BEGIN;

-- 1) Map legacy statuses to new values
UPDATE public.clients
SET status = CASE
  WHEN status = 'Registrado' THEN 'Contactado'
  WHEN status = 'Activo' THEN 'Instalado'
  WHEN status = 'Programado' THEN 'Aprobado'
  ELSE status
END
WHERE status IN ('Registrado','Activo','Programado');

-- 2) Ensure no stray values (optional check)
-- This will fail if there are values outside the allowed set. Run this check before adding the constraint.
-- SELECT DISTINCT status FROM public.clients WHERE status NOT IN ('Contactado','Aprobado','Instalado','Cancelado','Rechazado','Eliminado');

-- 3) Add/replace CHECK constraint to enforce allowed statuses (including 'Eliminado' for soft-deletes)
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_status_check CHECK (status IN ('Contactado','Aprobado','Instalado','Cancelado','Rechazado','Eliminado'));

COMMIT;
