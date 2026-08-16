-- Migration: Fix client status check constraint to the canonical lifecycle
-- Allowed values: Ingresado, Activo, Cancelado, Rechazado, Eliminado

BEGIN;

-- Normalize any legacy values before enforcing the new constraint
UPDATE public.clients
SET status = CASE
  WHEN status IN ('Registrado', 'Contactado') THEN 'Ingresado'
  WHEN status IN ('Activo', 'Instalado') THEN 'Activo'
  ELSE status
END
WHERE status IN ('Registrado', 'Contactado', 'Activo', 'Instalado');

-- Replace the old constraint with the required one
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_status_check
  CHECK (status IN ('Ingresado', 'Activo', 'Cancelado', 'Rechazado', 'Eliminado'));

COMMIT;
