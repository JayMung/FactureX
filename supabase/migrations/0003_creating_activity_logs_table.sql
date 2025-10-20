-- Create activity logs table
CREATE TABLE public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  cible TEXT,
  cible_id UUID,
  details JSONB,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "activity_logs_select_policy" ON public.activity_logs 
FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);