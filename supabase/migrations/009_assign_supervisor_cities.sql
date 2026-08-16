-- Assign cities to supervisors Jose and Hever
BEGIN;

-- Update supervisor Jose to Santo Domingo
UPDATE public.profiles
SET city = 'Santo Domingo',
    code = 'SUP-SDO-001'
WHERE role = 'supervisor'
  AND full_name ILIKE '%Jose%';

-- Update supervisor Hever to Manta
UPDATE public.profiles
SET city = 'Manta',
    code = 'SUP-MTA-001'
WHERE role = 'supervisor'
  AND full_name ILIKE '%Hever%';

COMMIT;
