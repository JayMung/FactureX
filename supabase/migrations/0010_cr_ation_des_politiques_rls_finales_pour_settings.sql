-- S'assurer que RLS est activé
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs authentifiés de lire les paramètres
CREATE POLICY "settings_select_policy" ON public.settings 
FOR SELECT TO authenticated USING (true);

-- Politique pour permettre aux admins d'insérer des paramètres
CREATE POLICY "settings_insert_policy" ON public.settings 
FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Politique pour permettre aux admins de mettre à jour les paramètres
CREATE POLICY "settings_update_policy" ON public.settings 
FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Politique pour permettre aux admins de supprimer les paramètres
CREATE POLICY "settings_delete_policy" ON public.settings 
FOR DELETE TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin');