# Correction - Liste d'Encaissements Vide

## Problème
La liste des encaissements dans la page `/encaissements` était vide alors que des données existaient dans la base de données.

## Cause Identifiée
**Incohérence des noms de colonnes** entre le code TypeScript et la structure réelle de la table `factures` dans Supabase.

### Noms Incorrects Utilisés
- ❌ `numero_facture` → ✅ `facture_number`
- ❌ `montant_total` → ✅ `total_general`

## Diagnostic Effectué

### 1. Vérification des Données
```sql
-- Confirmation : 1 paiement existe dans la base
SELECT COUNT(*) FROM paiements;
-- Résultat : 1 enregistrement (type: colis, montant: $90)
```

### 2. Vérification des RLS Policies
- ✅ Policies correctes sur la table `paiements`
- ✅ `organization_id` correspond entre `profiles` et `paiements`
- ✅ Utilisateur a accès aux données de son organisation

### 3. Identification du Problème
```sql
-- Vérification de la structure de la table factures
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'factures';
-- Résultat : La colonne s'appelle 'facture_number', pas 'numero_facture'
```

## Solution Appliquée

### Fichiers Modifiés

#### 1. `src/hooks/usePaiements.ts`
**Lignes 69, 25-26, 92** - Corrections multiples :

```typescript
// AVANT
facture:factures(numero_facture, montant_total)
facture?: {
  numero_facture: string;
  montant_total: number;
}
query.or(`facture.numero_facture.ilike.%${filters.search}%...`)

// APRÈS
facture:factures(facture_number, total_general)
facture?: {
  facture_number: string;
  total_general: number;
}
query.or(`facture.facture_number.ilike.%${filters.search}%...`)
```

#### 2. `src/pages/Encaissements.tsx`
**Lignes 107, 560** - Affichage et export :

```typescript
// AVANT
p.facture?.numero_facture || p.colis_id

// APRÈS
p.facture?.facture_number || p.colis_id
```

## Résultat
✅ Liste des encaissements maintenant visible
✅ Export CSV fonctionnel
✅ Filtre de recherche opérationnel
✅ Affichage correct des numéros de facture

## Données Visibles
- 1 encaissement de type "Colis"
- Montant : $90.00
- Date : 02/11/2025
- Client et compte associés affichés correctement

## Points Techniques

### Structure Réelle de la Table `factures`
```
facture_number (varchar)    ← Numéro de facture
total_general (numeric)     ← Montant total
statut_paiement (text)      ← Statut de paiement
montant_paye (numeric)      ← Montant déjà payé
solde_restant (numeric)     ← Solde restant
```

### Requête Supabase Corrigée
```typescript
supabase
  .from('paiements')
  .select(`
    *,
    client:clients(nom, telephone),
    facture:factures(facture_number, total_general),
    compte:comptes_financiers(nom, type_compte)
  `)
```

## Prévention
Pour éviter ce type d'erreur à l'avenir :
1. Toujours vérifier la structure réelle des tables via SQL
2. Utiliser TypeScript strict pour détecter les incohérences
3. Tester les requêtes Supabase avec des données réelles
4. Documenter les noms de colonnes dans les interfaces TypeScript

## Statut
✅ **RÉSOLU** - Production Ready

Date : 05/11/2025
