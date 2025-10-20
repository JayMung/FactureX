-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "settings_select_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_update_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_upsert_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_policy" ON public.settings;

-- Créer des politiques plus permissives pour le développement
CREATE POLICY "Enable read access for all authenticated users" ON public.settings
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.settings
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.settings
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.settings
FOR DELETE USING (auth.role() = 'authenticated');