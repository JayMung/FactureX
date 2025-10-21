# 🚀 Fix Rapide - Suppression de Transactions

## ⚡ Le Problème
Les transactions ne se suppriment pas réellement, elles réapparaissent après 2 secondes.

## ✅ Solution en 3 Étapes

### 1. Aller sur Supabase Dashboard
👉 https://supabase.com/dashboard

### 2. Ouvrir SQL Editor
- Cliquez sur votre projet CoxiPay
- Menu gauche > **SQL Editor** (icône code)
- Cliquez sur **New Query**

### 3. Exécuter ce code SQL

```sql
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;

CREATE POLICY "transactions_delete_policy" ON public.transactions 
FOR DELETE TO authenticated USING (true);
```

Cliquez sur **▶ Run** (ou Ctrl+Enter)

---

## ✨ C'est Tout !

Retournez sur votre application et testez la suppression. Ça devrait fonctionner !

---

## 📚 Plus d'infos ?
Consultez `FIX_SUPPRESSION_TRANSACTIONS.md` pour les détails complets.
