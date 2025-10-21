-- Corriger la politique de suppression des transactions pour permettre à tous les utilisateurs authentifiés de supprimer
-- Le problème actuel : la politique exige le rôle 'admin' du JWT, ce qui empêche la suppression

-- Supprimer l'ancienne politique de suppression restrictive
DROP POLICY IF EXISTS "transactions_delete_policy" ON transactions;

-- Créer une nouvelle politique de suppression permissive pour tous les utilisateurs authentifiés
CREATE POLICY "transactions_delete_policy" ON transactions 
FOR DELETE TO authenticated USING (true);

-- Note: Si vous souhaitez restreindre la suppression uniquement aux admins plus tard,
-- assurez-vous d'abord que le JWT contient bien le rôle approprié en vérifiant:
-- SELECT auth.jwt() ->> 'role' pour voir ce qui est réellement dans le token
