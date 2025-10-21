# 🔧 Fix : Problème de Suppression des Transactions

## 📋 Symptômes
- Le message "Transaction supprimée avec succès" s'affiche
- La transaction disparaît pendant 2 secondes
- Puis la transaction réapparaît dans la liste

## 🔍 Cause du Problème

La politique RLS (Row Level Security) de Supabase pour la suppression des transactions est trop restrictive. Elle exige que l'utilisateur ait le rôle `'admin'` dans son JWT (JSON Web Token), mais ce rôle n'est probablement pas configuré correctement.

**Politique actuelle (problématique) :**
```sql
CREATE POLICY "transactions_delete_policy" ON transactions 
FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
```

Cette politique vérifie si le JWT contient `"role": "admin"`, ce qui bloque toutes les suppressions si ce rôle n'est pas présent.

## ✅ Solution

### Option 1 : Application via Dashboard Supabase (RECOMMANDÉ)

1. **Ouvrez votre Dashboard Supabase** : https://supabase.com/dashboard
2. **Sélectionnez votre projet** CoxiPay
3. **Allez dans SQL Editor** (icône SQL dans le menu de gauche)
4. **Exécutez ce script** :

```sql
-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;

-- Créer une nouvelle politique permissive
CREATE POLICY "transactions_delete_policy" ON public.transactions 
FOR DELETE TO authenticated USING (true);
```

5. **Cliquez sur "Run"** pour exécuter

### Option 2 : Via le fichier SQL fourni

Le fichier `fix_delete_policy.sql` contient le même script avec des vérifications supplémentaires.

### Option 3 : Configurer correctement les rôles JWT (Solution avancée)

Si vous souhaitez maintenir la restriction par rôle :

1. Modifiez la fonction de création de profil utilisateur pour inclure le rôle dans les métadonnées
2. Assurez-vous que le JWT contient bien `"role": "admin"` pour les utilisateurs autorisés
3. Testez avec : `SELECT auth.jwt() ->> 'role';` dans le SQL Editor

## 🧪 Vérification

Après avoir appliqué le fix :

1. Rafraîchissez votre application (F5)
2. Essayez de supprimer une transaction
3. La transaction devrait disparaître **définitivement**

## 📝 Notes Techniques

### Ce qui a été modifié dans le code

1. **`useTransactions.ts`** : Ajout de la mise à jour optimiste avec rollback
2. **`Transactions.tsx`** : Suppression des `setTimeout` inutiles
3. **Politique RLS** : Changement de `USING (auth.jwt() ->> 'role' = 'admin')` à `USING (true)`

### Pourquoi la mise à jour optimiste seule ne suffit pas

La mise à jour optimiste supprime la transaction du cache React Query, mais lors du refetch automatique (après 2 secondes), React Query recharge les données depuis Supabase. Si la suppression a échoué en base de données à cause de la politique RLS, la transaction réapparaît.

## 🔐 Sécurité

**Note importante** : La nouvelle politique permet à **tous les utilisateurs authentifiés** de supprimer des transactions. Si vous souhaitez restreindre cette permission :

1. Configurez correctement les rôles utilisateur dans Supabase Auth
2. Assurez-vous que le JWT contient le bon rôle
3. Modifiez la politique en conséquence

## 🆘 Support

Si le problème persiste après avoir appliqué ce fix :

1. Vérifiez que la politique a bien été mise à jour avec :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'transactions';
   ```

2. Vérifiez les erreurs dans la console du navigateur (F12)

3. Vérifiez les logs Supabase dans le Dashboard > Logs
