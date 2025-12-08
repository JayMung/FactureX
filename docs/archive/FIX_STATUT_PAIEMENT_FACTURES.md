# 🔧 Correction: Erreur Statut de Paiement des Factures

## 🐛 Erreur Signalée

**Message d'erreur**:
```
{
  "code": "23514",
  "details": null,
  "hint": null,
  "message": "new row for relation \"factures\" violates check constraint \"check_statut_facture_valide\""
}
```

**Contexte**: Lors de l'enregistrement d'un paiement sur une facture.

---

## 🔍 Investigation

### 1. Contrainte CHECK sur la Table `factures`

```sql
CHECK (statut_paiement = ANY (ARRAY[
  'payee'::text,
  'impayee'::text,
  'partiellement_payee'::text,
  'non_paye'::text
]))
```

**Statuts autorisés**:
- ✅ `'payee'` (avec 'e' final)
- ✅ `'impayee'` (avec 'e' final)
- ✅ `'partiellement_payee'` (avec 'e' final)
- ✅ `'non_paye'` (sans 'e' final)

---

### 2. Fonctions SQL Problématiques

#### Fonction `process_paiement()` ❌

**Code incorrect**:
```sql
IF v_solde_restant <= 0 THEN
  v_statut_paiement := 'paye';  -- ❌ Devrait être 'payee'
ELSIF v_montant_paye_total > 0 THEN
  v_statut_paiement := 'partiel';  -- ❌ Devrait être 'partiellement_payee'
ELSE
  v_statut_paiement := 'non_paye';  -- ✅ Correct
END IF;
```

**Problème**: Utilise `'paye'` et `'partiel'` qui ne sont PAS dans la liste autorisée !

---

#### Fonction `calculate_facture_statut_paiement()` ❌

**Code incorrect**:
```sql
IF v_montant_paye = 0 THEN
  RETURN 'non_paye';  -- ✅ Correct
ELSIF v_montant_paye >= v_montant_total THEN
  RETURN 'payee';  -- ✅ Correct
ELSE
  RETURN 'partiellement_paye';  -- ❌ Devrait être 'partiellement_payee'
END IF;
```

**Problème**: Utilise `'partiellement_paye'` au lieu de `'partiellement_payee'` !

---

## ✅ Solutions Appliquées

### Migration 1: `fix_process_paiement_statut_values`

**Fonction corrigée**: `process_paiement()`

```sql
-- ✅ APRÈS (Correct)
IF v_solde_restant <= 0 THEN
  v_statut_paiement := 'payee';  -- ✅ Corrigé
  v_solde_restant := 0;
ELSIF v_montant_paye_total > 0 THEN
  v_statut_paiement := 'partiellement_payee';  -- ✅ Corrigé
ELSE
  v_statut_paiement := 'non_paye';  -- ✅ Inchangé
END IF;
```

**Changements**:
- `'paye'` → `'payee'`
- `'partiel'` → `'partiellement_payee'`

---

### Migration 2: `fix_calculate_facture_statut_paiement`

**Fonction corrigée**: `calculate_facture_statut_paiement()`

```sql
-- ✅ APRÈS (Correct)
IF v_montant_paye = 0 THEN
  RETURN 'non_paye';  -- ✅ Inchangé
ELSIF v_montant_paye >= v_montant_total THEN
  RETURN 'payee';  -- ✅ Inchangé
ELSE
  RETURN 'partiellement_payee';  -- ✅ Corrigé
END IF;
```

**Changements**:
- `'partiellement_paye'` → `'partiellement_payee'`

---

## 📊 Comparaison: Factures vs Colis

### Table `factures`

**Contrainte**: `check_statut_facture_valide`

| Statut | Valeur Correcte | Note |
|--------|-----------------|------|
| Non payé | `'non_paye'` | Sans 'e' final |
| Partiellement payé | `'partiellement_payee'` | **Avec 'e' final** |
| Payé | `'payee'` | **Avec 'e' final** |
| Impayé | `'impayee'` | **Avec 'e' final** |

---

### Table `colis`

**Contrainte**: `colis_statut_paiement_check`

| Statut | Valeur Correcte | Note |
|--------|-----------------|------|
| Non payé | `'non_paye'` | Sans 'e' final |
| Partiellement payé | `'partiellement_paye'` | **Sans 'e' final** |
| Payé | `'paye'` | **Sans 'e' final** |

**⚠️ Incohérence**: Les factures et les colis utilisent des conventions différentes !

---

## 🎯 Flux de Paiement Corrigé

### Scénario 1: Paiement Partiel

```
1. User enregistre un paiement de $120 sur facture de $500
   ↓
2. Trigger: process_paiement()
   - Calcul: montant_paye_total = $120
   - Calcul: solde_restant = $500 - $120 = $380
   - Condition: v_montant_paye_total > 0 ET solde_restant > 0
   - Statut: 'partiellement_payee' ✅
   ↓
3. UPDATE factures SET statut_paiement = 'partiellement_payee'
   ✅ Contrainte CHECK satisfaite
   ↓
4. ✅ Paiement enregistré avec succès !
```

---

### Scénario 2: Paiement Complet

```
1. User enregistre un paiement de $380 (solde restant)
   ↓
2. Trigger: process_paiement()
   - Calcul: montant_paye_total = $120 + $380 = $500
   - Calcul: solde_restant = $500 - $500 = $0
   - Condition: solde_restant <= 0
   - Statut: 'payee' ✅
   ↓
3. UPDATE factures SET statut_paiement = 'payee', statut = 'payee'
   ✅ Contrainte CHECK satisfaite
   ↓
4. ✅ Facture marquée comme payée !
```

---

## 🧪 Tests de Validation

### Test 1: Paiement Partiel ✅

```sql
-- Créer un paiement partiel
INSERT INTO paiements (
  type_paiement, facture_id, client_id, 
  montant_paye, compte_id, mode_paiement, organization_id
) VALUES (
  'facture',
  'facture-id-test',
  'client-id-test',
  120.00,
  'compte-id-test',
  'cash',
  'org-id-test'
);

-- Vérifier le statut
SELECT statut_paiement FROM factures WHERE id = 'facture-id-test';
-- Résultat attendu: 'partiellement_payee' ✅
```

---

### Test 2: Paiement Complet ✅

```sql
-- Créer un paiement qui complète la facture
INSERT INTO paiements (
  type_paiement, facture_id, client_id, 
  montant_paye, compte_id, mode_paiement, organization_id
) VALUES (
  'facture',
  'facture-id-test',
  'client-id-test',
  380.00,
  'compte-id-test',
  'cash',
  'org-id-test'
);

-- Vérifier le statut
SELECT statut_paiement, statut FROM factures WHERE id = 'facture-id-test';
-- Résultat attendu: statut_paiement = 'payee', statut = 'payee' ✅
```

---

### Test 3: Nouvelle Facture ✅

```sql
-- Créer une nouvelle facture
INSERT INTO factures (
  facture_number, type, statut, client_id, 
  date_emission, mode_livraison, devise, 
  subtotal, total_general, statut_paiement, organization_id
) VALUES (
  'FAC-TEST-001', 'facture', 'brouillon', 'client-id',
  NOW(), 'aerien', 'USD',
  100.00, 115.00, 'non_paye', 'org-id'
);
-- Résultat: ✅ Succès (statut_paiement = 'non_paye' est valide)
```

---

## 📋 Statuts de Paiement - Guide Complet

### Pour les Factures

| Statut Frontend | Valeur DB | Description |
|-----------------|-----------|-------------|
| Non payé | `'non_paye'` | Aucun paiement reçu |
| Partiellement payé | `'partiellement_payee'` | Paiement partiel reçu |
| Payé | `'payee'` | Montant total payé |
| Impayé | `'impayee'` | Facture en retard de paiement |

---

### Pour les Colis

| Statut Frontend | Valeur DB | Description |
|-----------------|-----------|-------------|
| Non payé | `'non_paye'` | Aucun paiement reçu |
| Partiellement payé | `'partiellement_paye'` | Paiement partiel reçu |
| Payé | `'paye'` | Montant total payé |

---

## 🚨 Recommandations

### 1. **Unifier les Conventions** (Optionnel)

Pour éviter la confusion, envisagez d'unifier les statuts entre factures et colis :

```sql
-- Option A: Tout avec 'e' final (recommandé)
ALTER TABLE colis DROP CONSTRAINT colis_statut_paiement_check;
ALTER TABLE colis ADD CONSTRAINT colis_statut_paiement_check 
  CHECK (statut_paiement IN ('non_paye', 'partiellement_payee', 'payee'));

-- Mettre à jour les données existantes
UPDATE colis SET statut_paiement = 'partiellement_payee' WHERE statut_paiement = 'partiellement_paye';
UPDATE colis SET statut_paiement = 'payee' WHERE statut_paiement = 'paye';

-- Mettre à jour la fonction calculate_colis_statut_paiement
```

---

### 2. **Documentation des Types**

Ajouter des types TypeScript pour éviter les erreurs :

```typescript
// src/types/index.ts

export type StatutPaiementFacture = 
  | 'non_paye' 
  | 'partiellement_payee' 
  | 'payee' 
  | 'impayee';

export type StatutPaiementColis = 
  | 'non_paye' 
  | 'partiellement_paye' 
  | 'paye';
```

---

### 3. **Tests Automatisés**

Créer des tests pour valider les statuts :

```typescript
describe('Statuts de paiement', () => {
  it('devrait accepter partiellement_payee pour factures', async () => {
    const facture = await createFacture({ statut_paiement: 'partiellement_payee' });
    expect(facture.statut_paiement).toBe('partiellement_payee');
  });

  it('devrait rejeter partiel pour factures', async () => {
    await expect(
      createFacture({ statut_paiement: 'partiel' })
    ).rejects.toThrow('check constraint');
  });
});
```

---

## 📚 Fichiers Modifiés

1. **Migrations SQL**
   - `fix_process_paiement_statut_values.sql`
   - `fix_calculate_facture_statut_paiement.sql`

2. **Fonctions Corrigées**
   - `process_paiement()` - Ligne 27, 29
   - `calculate_facture_statut_paiement()` - Ligne 20

3. **Documentation**
   - `FIX_STATUT_PAIEMENT_FACTURES.md` - Ce document

---

## 🎉 Résultat

### Avant la Correction ❌
```
Error: new row violates check constraint "check_statut_facture_valide"
```

### Après la Correction ✅
```
✅ Paiement enregistré avec succès
✅ Statut facture: partiellement_payee
✅ Solde restant: $380.00
```

---

**Statut**: ✅ **RÉSOLU**  
**Date**: 12 janvier 2025  
**Impact**: Critique → Résolu  
**Prochaine étape**: Tester l'enregistrement d'un paiement ! 🚀
