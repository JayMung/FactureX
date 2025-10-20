-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "settings_select_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_upsert_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_update_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_policy" ON public.settings;