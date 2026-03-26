-- =============================================
-- Alya Inventory Manager - Supabase Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. SKUs table
CREATE TABLE IF NOT EXISTS public.skus (
  id BIGINT PRIMARY KEY,
  amazon TEXT DEFAULT 'Not Listed',
  flipkart TEXT DEFAULT 'Not Listed',
  meesho TEXT DEFAULT 'Not Listed',
  myntra TEXT DEFAULT 'Not Listed',
  stock INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Updates (audit log) table
CREATE TABLE IF NOT EXISTS public.updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  sku BIGINT,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Profiles table (optional)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT
);

-- 4. Updated_at trigger for skus
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_skus_updated_at
  BEFORE UPDATE ON public.skus
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security
ALTER TABLE public.skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies - Allow authenticated users to CRUD
CREATE POLICY "Authenticated users can view SKUs"
  ON public.skus FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert SKUs"
  ON public.skus FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update SKUs"
  ON public.skus FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view updates"
  ON public.updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert updates"
  ON public.updates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 7. Enable Realtime for skus and updates tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.skus;
ALTER PUBLICATION supabase_realtime ADD TABLE public.updates;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_updates_sku ON public.updates(sku);
CREATE INDEX IF NOT EXISTS idx_updates_created_at ON public.updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skus_stock ON public.skus(stock);
