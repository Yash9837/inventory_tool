-- =============================================
-- RBAC Migration - Run this in Supabase SQL Editor
-- Adds role-based access control to existing setup
-- =============================================

-- 1. Add role column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('admin', 'user'));

-- 2. Auto-create profile on user signup (so new users get 'user' role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Update RLS policies for updates table (admin-only read)
DROP POLICY IF EXISTS "Authenticated users can view updates" ON public.updates;
CREATE POLICY "Admins can view updates"
  ON public.updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 4. Fix profiles SELECT policies to avoid infinite recursion
-- Drop the old policy that causes recursion, then recreate as a single policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 5. Create index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 6. Ensure existing profiles have the 'user' role set
-- Then manually set your admin user(s):
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_UUID';
