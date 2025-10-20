-- Supprimer toutes les politiques existantes pour la table settings
DROP POLICY IF EXISTS "settings_select_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_update_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_upsert_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_policy" ON public.settings;