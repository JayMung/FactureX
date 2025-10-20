-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'operateur' CHECK (role IN ('admin', 'operateur')),
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "profiles_select_policy" ON public.profiles 
FOR SELECT TO authenticated USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "profiles_insert_policy" ON public.profiles 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON public.profiles 
FOR UPDATE TO authenticated USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "profiles_delete_policy" ON public.profiles 
FOR DELETE TO authenticated USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');