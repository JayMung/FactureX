-- Create clients table
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  ville TEXT NOT NULL,
  total_paye DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "clients_select_policy" ON public.clients 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "clients_insert_policy" ON public.clients 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "clients_update_policy" ON public.clients 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "clients_delete_policy" ON public.clients 
FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');