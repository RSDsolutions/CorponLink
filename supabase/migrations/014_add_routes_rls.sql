BEGIN;

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_can_manage_all_routes" ON public.routes;
CREATE POLICY "admins_can_manage_all_routes"
ON public.routes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "supervisors_can_manage_own_routes" ON public.routes;
CREATE POLICY "supervisors_can_manage_own_routes"
ON public.routes
FOR ALL
TO authenticated
USING (
  auth.uid() = supervisor_id
)
WITH CHECK (
  auth.uid() = supervisor_id
);

COMMIT;
