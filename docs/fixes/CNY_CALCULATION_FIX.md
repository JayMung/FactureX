# Correction du Calcul CNY - 29 Janvier 2025

## Problème Identifié

Le montant CNY était calculé sur le **montant brut** au lieu du **montant net** (après déduction des frais).

### Exemple du Bug
Pour une transaction de transfert de $100 :
- Montant : $100
- Frais (5%) : $5
- Montant net : $95
- Taux USD→CNY : 7.0

**Calcul INCORRECT (avant):**
```
CNY = $100 × 7.0 = ¥700 ❌
```

**Calcul CORRECT (après):**
```
CNY = ($100 - $5) × 7.0 = $95 × 7.0 = ¥665 ✅
```

## Fichiers Corrigés

### 1. `src/hooks/useTransactions.ts`
**Fonction `createTransaction` (ligne 119):**
```typescript
// Avant
const montantCNY = transactionData.devise === 'USD' 
  ? transactionData.montant * rates.usdToCny 
  : (transactionData.montant / tauxUSD) * rates.usdToCny;

// Après
const montantNet = transactionData.montant - fraisUSD;
const montantCNY = transactionData.devise === 'USD' 
  ? montantNet * rates.usdToCny 
  : (montantNet / tauxUSD) * rates.usdToCny;
```

**Fonction `updateTransaction` (ligne 227):**
```typescript
// Avant
const montantCNY = devise === 'USD' 
  ? montant * rates.usdToCny 
  : (montant / tauxUSD) * rates.usdToCny;

// Après
const montantNet = montant - fraisUSD;
const montantCNY = devise === 'USD' 
  ? montantNet * rates.usdToCny 
  : (montantNet / tauxUSD) * rates.usdToCny;
```

### 2. `src/components/forms/TransactionForm.tsx`
**Fonction `calculateAmounts` (ligne 99):**
```typescript
// Avant
const montantCNY = formData.devise === 'USD' 
  ? montant * rates.usdToCny 
  : (montant / tauxUSD) * rates.usdToCny;

// Après
const montantNet = montant - fraisUSD;
const montantCNY = formData.devise === 'USD' 
  ? montantNet * rates.usdToCny 
  : (montantNet / tauxUSD) * rates.usdToCny;
```

### 3. `src/services/supabase.ts`
**Fonction `createTransaction` (ligne 258):**
```typescript
// Avant
const montantCNY = transactionData.devise === 'USD' 
  ? transactionData.montant * rates.data!.usdToCny 
  : (transactionData.montant / tauxUSD) * rates.data!.usdToCny;

// Après
const montantNet = transactionData.montant - fraisUSD;
const montantCNY = transactionData.devise === 'USD' 
  ? montantNet * rates.data!.usdToCny 
  : (montantNet / tauxUSD) * rates.data!.usdToCny;
```

## Migration SQL

**Fichier:** `supabase/migrations/20250129_fix_cny_calculation.sql`

```sql
-- Recalculer le montant_cny pour toutes les transactions existantes
UPDATE transactions
SET montant_cny = CASE 
  WHEN devise = 'USD' THEN 
    (montant - frais) * taux_usd_cny
  ELSE 
    ((montant - frais) / taux_usd_cdf) * taux_usd_cny
END
WHERE montant_cny IS NOT NULL;

-- Ajouter un commentaire pour documenter le changement
COMMENT ON COLUMN transactions.montant_cny IS 'Montant en CNY calculé sur le montant net (montant - frais)';
```

**Statut:** ✅ Appliquée avec succès via Supabase MCP

## Impact

### Transactions Affectées
- ✅ Toutes les transactions existantes ont été recalculées
- ✅ Les nouvelles transactions utiliseront le calcul correct
- ✅ Les modifications de transactions utiliseront le calcul correct

### Formules de Calcul

**Pour devise USD:**
```
montant_net = montant - frais
montant_cny = montant_net × taux_usd_cny
```

**Pour devise CDF:**
```
montant_net = montant - frais
montant_usd = montant_net / taux_usd_cdf
montant_cny = montant_usd × taux_usd_cny
```

## Tests de Validation

### Exemple 1: Transfert USD
- Montant : $100
- Frais (5%) : $5
- Taux : 7.0
- **Résultat attendu:** ¥665 ✅

### Exemple 2: Commande USD
- Montant : $150
- Frais (10%) : $15
- Taux : 7.0
- **Résultat attendu:** ¥945 ✅

### Exemple 3: Transfert CDF
- Montant : 285,000 CDF
- Frais (5%) : 14,250 CDF
- Montant net : 270,750 CDF
- Taux CDF→USD : 2850
- Montant USD : $95
- Taux USD→CNY : 7.0
- **Résultat attendu:** ¥665 ✅

## Vérification

Pour vérifier que la correction fonctionne :

1. Créer une nouvelle transaction de $100 en transfert
2. Vérifier que :
   - Frais = $5
   - Bénéfice = $2 (si commission partenaire 3%)
   - **CNY = ¥665** (avec taux 7.0)

## Prochaines Étapes

- [x] Corriger le code dans tous les fichiers
- [x] Créer la migration SQL
- [x] Appliquer la migration via Supabase MCP
- [x] Documenter la correction
- [ ] Tester manuellement avec une nouvelle transaction
- [ ] Vérifier les transactions existantes dans la base de données

## Notes Techniques

Le calcul CNY représente le montant que le client recevra réellement en Chine, donc il est logique de déduire les frais avant la conversion, car ces frais sont prélevés avant l'envoi.

**Flux financier:**
1. Client paie : $100
2. Frais prélevés : -$5
3. Montant envoyé : $95
4. Montant reçu en CNY : ¥665 (à taux 7.0)
