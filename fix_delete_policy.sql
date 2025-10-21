-- =====================================================
-- FIX POUR LE PROBLÈME DE SUPPRESSION DES TRANSACTIONS
-- =====================================================
-- 
-- Ce script corrige la politique RLS qui empêche la suppression des transactions.
-- 
-- INSTRUCTIONS:
-- 1. Allez sur votre Dashboard Supabase (https://supabase.com/dashboard)
-- 2. Sélectionnez votre projet CoxiPay
-- 3. Allez dans l'éditeur SQL (SQL Editor dans le menu de gauche)
-- 4. Créez une nouvelle requête
-- 5. Copiez-collez ce script et exécutez-le
-- 
-- =====================================================

-- Supprimer l'ancienne politique de suppression restrictive
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;

-- Créer une nouvelle politique de suppression permissive pour tous les utilisateurs authentifiés
CREATE POLICY "transactions_delete_policy" ON public.transactions 
FOR DELETE TO authenticated USING (true);

-- Vérifier que la politique a été créée correctement
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'transactions' AND policyname = 'transactions_delete_policy';

-- Le résultat devrait montrer:
-- policyname: transactions_delete_policy
-- cmd: DELETE
-- roles: {authenticated}
-- permissive: PERMISSIVE
