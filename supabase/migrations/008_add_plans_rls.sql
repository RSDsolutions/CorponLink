-- Enable RLS on plans table and add policies

BEGIN;

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read plans (used by supervisors and admins)
CREATE POLICY "Allow read plans for authenticated users"
  ON public.plans
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow only admins to insert/update/delete plans
CREATE POLICY "Allow admins to manage plans"
  ON public.plans
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

COMMIT;
