# 🔄 Mise à jour automatique des soldes de comptes

## ✅ Migration appliquée avec succès

La migration `20251101212900_auto_update_compte_solde.sql` a été appliquée. Les soldes des comptes financiers sont maintenant **automatiquement synchronisés** avec les transactions.

## 📋 Comment ça fonctionne

### **1. Création d'une transaction**
Quand vous créez une transaction avec un compte source/destination :

#### **Revenue (Revenu)**
- Le solde du `compte_destination_id` **augmente** du montant de la transaction
- Exemple : Client paie $100 → Airtel Money +$100

#### **Dépense**
- Le solde du `compte_source_id` **diminue** du montant de la transaction
- Exemple : Achat fournitures $50 → Airtel Money -$50

#### **Transfert**
- Le solde du `compte_source_id` **diminue** du montant
- Le solde du `compte_destination_id` **augmente** du montant
- Exemple : Transfert $200 de Airtel → Orange Money
  - Airtel Money -$200
  - Orange Money +$200

### **2. Modification d'une transaction**
Quand vous modifiez une transaction existante :
1. **Annulation** : L'ancien impact sur les comptes est annulé
2. **Application** : Le nouvel impact est appliqué

Exemple :
- Transaction initiale : Revenue $100 → Airtel Money
- Modification : Revenue $150 → Orange Money
- Résultat :
  - Airtel Money -$100 (annulation)
  - Orange Money +$150 (nouvelle valeur)

### **3. Suppression d'une transaction**
Quand vous supprimez une transaction :
- L'impact sur les comptes est **automatiquement annulé**
- Le solde revient à l'état d'avant la transaction

## 🔧 Pour les transactions existantes

### **Option 1 : Mise à jour manuelle via l'interface**
1. Allez dans **Transactions**
2. Pour chaque transaction, cliquez sur **Modifier**
3. Sélectionnez le **compte source** ou **compte destination** approprié
4. Sauvegardez → Le solde du compte sera automatiquement mis à jour

### **Option 2 : Mise à jour en masse via SQL (Recommandé)**
Si vous avez beaucoup de transactions, vous pouvez exécuter un script SQL pour associer automatiquement les transactions aux comptes :

```sql
-- Exemple : Associer toutes les transactions de type "revenue" à un compte spécifique
UPDATE transactions
SET compte_destination_id = 'ID_DU_COMPTE_AIRTEL'
WHERE type_transaction = 'revenue' 
  AND mode_paiement = 'Airtel Money'
  AND compte_destination_id IS NULL;

-- Les triggers vont automatiquement mettre à jour les soldes !
```

### **Option 3 : Recalcul complet des soldes**
Si vous voulez recalculer tous les soldes à partir de zéro :

```sql
-- 1. Réinitialiser tous les soldes à 0
UPDATE comptes_financiers SET solde_actuel = 0;

-- 2. Recalculer les soldes à partir des transactions
-- Pour les revenus
UPDATE comptes_financiers c
SET solde_actuel = solde_actuel + COALESCE((
  SELECT SUM(montant)
  FROM transactions t
  WHERE t.compte_destination_id = c.id
    AND t.type_transaction = 'revenue'
), 0);

-- Pour les dépenses
UPDATE comptes_financiers c
SET solde_actuel = solde_actuel - COALESCE((
  SELECT SUM(montant)
  FROM transactions t
  WHERE t.compte_source_id = c.id
    AND t.type_transaction = 'depense'
), 0);

-- Pour les transferts (source)
UPDATE comptes_financiers c
SET solde_actuel = solde_actuel - COALESCE((
  SELECT SUM(montant)
  FROM transactions t
  WHERE t.compte_source_id = c.id
    AND t.type_transaction = 'transfert'
), 0);

-- Pour les transferts (destination)
UPDATE comptes_financiers c
SET solde_actuel = solde_actuel + COALESCE((
  SELECT SUM(montant)
  FROM transactions t
  WHERE t.compte_destination_id = c.id
    AND t.type_transaction = 'transfert'
), 0);
```

## 🎯 Workflow recommandé

1. **Créez vos comptes financiers** (Airtel, Orange, M-Pesa, Banque, Cash)
2. **Définissez le solde initial** de chaque compte
3. **Associez les transactions existantes** aux comptes appropriés (via modification)
4. **Nouvelles transactions** : Sélectionnez toujours le compte lors de la création
5. Les soldes se mettent à jour **automatiquement** ! ✨

## ⚠️ Important

- Les triggers ne s'appliquent qu'aux transactions qui ont un `compte_source_id` ou `compte_destination_id`
- Les transactions sans compte associé n'affectent pas les soldes
- Les modifications de montant mettent à jour automatiquement les soldes
- La suppression d'une transaction annule son impact sur les soldes

## 🔍 Vérification

Pour vérifier que tout fonctionne :

```sql
-- Voir les soldes actuels
SELECT nom, type_compte, solde_actuel, devise
FROM comptes_financiers
ORDER BY nom;

-- Voir les transactions d'un compte
SELECT t.*, c.nom as compte_nom
FROM transactions t
LEFT JOIN comptes_financiers c ON c.id = t.compte_source_id OR c.id = t.compte_destination_id
WHERE t.compte_source_id = 'ID_DU_COMPTE' 
   OR t.compte_destination_id = 'ID_DU_COMPTE'
ORDER BY t.created_at DESC;
```

## 📊 Exemple complet

```
Situation initiale :
- Airtel Money : $1000
- Orange Money : $500

Transaction 1 : Revenue $200 → Airtel Money
→ Airtel Money : $1200

Transaction 2 : Dépense $50 → Airtel Money
→ Airtel Money : $1150

Transaction 3 : Transfert $300 de Airtel → Orange
→ Airtel Money : $850
→ Orange Money : $800

Modification Transaction 3 : Transfert $400 au lieu de $300
→ Airtel Money : $750 (annule -$300, applique -$400)
→ Orange Money : $900 (annule +$300, applique +$400)
```

## ✅ Statut

- ✅ Triggers créés et actifs
- ✅ Synchronisation automatique activée
- ✅ Fonctionne pour INSERT, UPDATE, DELETE
- ✅ Gère les 3 types de transactions (revenue, dépense, transfert)
- ✅ Production ready

---

**Date de migration** : 1er novembre 2025, 21:29
**Fichier** : `20251101212900_auto_update_compte_solde.sql`
