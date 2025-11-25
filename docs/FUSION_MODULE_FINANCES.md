# Fusion Module Finances - Documentation

## Objectif

Unifier les 3 pages financières en **1 seule page avec 3 tabs** et **1 formulaire unique**.

## État Avant Fusion

### Pages à fusionner :
1. **Transactions-Protected.tsx** - Transactions clients (Commande, Transfert)
2. **Operations-Financieres.tsx** - Dépenses et Revenus internes
3. **Encaissements.tsx** - Paiements factures et colis

### Problèmes identifiés :
- Redondance des interfaces
- Confusion utilisateur (où enregistrer quoi ?)
- 2 tables différentes (`transactions` vs `paiements`)
- Formulaires différents pour des opérations similaires

---

## État Après Fusion

### Structure Finale :

```
┌─────────────────────────────────────────────────────────────┐
│                    TRANSACTIONS                              │
├─────────────────────────────────────────────────────────────┤
│  [Transactions Client]  [Opérations Internes]  [Transferts] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tab "Transactions Client" :                                 │
│  - Commande (= Facture) → FRAIS APPLIQUÉS                   │
│  - Transfert → FRAIS APPLIQUÉS                              │
│  - Paiement Colis → PAS DE FRAIS                            │
│  Colonnes: Client | Motif | Montant | Frais | Bénéfice      │
│                                                              │
│  Tab "Opérations Internes" :                                 │
│  - Dépenses (catégories configurables)                       │
│  - Autres Revenus (sans client)                              │
│  Colonnes: Date | Type | Description | Compte | Montant     │
│                                                              │
│  Tab "Transferts" :                                          │
│  - Swap entre comptes                                        │
│  Colonnes: Date | Compte Source | Compte Dest | Montant     │
│                                                              │
│  [+ Nouvelle Transaction] → TransactionFormFinancial        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Catégories par Type

### REVENUE (type_transaction = 'revenue')

| Catégorie | Frais | Client Requis | Champ Spécial |
|-----------|-------|---------------|---------------|
| Commande | ✅ Oui | ✅ Oui | facture_id (optionnel) |
| Transfert | ✅ Oui | ✅ Oui | - |
| Paiement Colis | ❌ Non | ✅ Oui | colis_id |

### DÉPENSE (type_transaction = 'depense')

| Catégorie | Compte | Notes |
|-----------|--------|-------|
| Paiement Fournisseur | Source | - |
| Paiement Shipping | Source | - |
| Loyer | Source | - |
| Salaires | Source | - |
| Transport | Source | - |
| Carburant | Source | - |
| Maintenance | Source | - |
| Autre | Source | Configurable dans Paramètres |

### TRANSFERT (type_transaction = 'transfert')

| Type | Compte Source | Compte Destination |
|------|---------------|-------------------|
| Swap | ✅ Requis | ✅ Requis |

---

## Flux des Données

```
Transaction créée
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  TRIGGER: update_compte_solde_after_transaction()        │
│  - Revenue: compte_destination +montant                  │
│  - Dépense: compte_source -montant                       │
│  - Transfert: source -montant, destination +montant      │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  TABLE: comptes_financiers                               │
│  - solde_actuel mis à jour automatiquement               │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  TABLE: mouvements_comptes                               │
│  - Historique crédit/débit                               │
│  - solde_avant / solde_apres                             │
└──────────────────────────────────────────────────────────┘
```

---

## Fichiers Modifiés

### À Modifier :
- `src/pages/Transactions-Protected.tsx` - Ajouter tabs et vues
- `src/components/forms/TransactionFormFinancial.tsx` - Ajouter catégories

### À Supprimer :
- `src/pages/Operations-Financieres.tsx`
- `src/pages/Encaissements.tsx`
- `src/pages/Encaissements-Protected.tsx`

### Routes à Mettre à Jour :
- Rediriger `/operations-financieres` → `/transactions`
- Rediriger `/encaissements` → `/transactions`

### Menu à Mettre à Jour :
- Supprimer entrées "Opérations Financières" et "Encaissements"
- Garder uniquement "Transactions"

---

## Plan d'Implémentation

### Phase 1 : Modifier TransactionFormFinancial
1. Ajouter nouvelles catégories pour Revenue
2. Implémenter logique des frais (0 pour Paiement Colis)
3. Ajouter sélecteur de colis conditionnel

### Phase 2 : Modifier Transactions-Protected
1. Ajouter système de tabs
2. Créer vue "Opérations Internes" (dépenses/revenus sans client)
3. Créer vue "Transferts" (swap entre comptes)
4. Adapter les stats cards par tab

### Phase 3 : Nettoyage
1. Supprimer pages obsolètes
2. Mettre à jour routes
3. Mettre à jour menu navigation

### Phase 4 : Tests
1. Tester création de chaque type
2. Vérifier mise à jour des soldes
3. Vérifier mouvements créés

---

## Avantages de la Fusion

1. ✅ **1 seul point d'entrée** pour toutes les opérations financières
2. ✅ **1 seul formulaire** à maintenir
3. ✅ **Moins de confusion** pour l'utilisateur
4. ✅ **Code plus maintenable**
5. ✅ **Cohérence des données** (1 seule table `transactions`)

---

## Date de Création
25 Novembre 2025

## Statut
✅ Phase 1 et 2 complétées

## Modifications Effectuées

### Phase 1 : TransactionFormFinancial.tsx ✅
- Ajout catégorie "Paiement Colis" avec `hasFees: false`
- Constante `CATEGORIES_WITH_FEES` pour logique des frais
- Import hook `useColisList`
- Champ `colis_id` dans formData
- Effet pour réinitialiser frais à 0 quand catégorie sans frais
- Validation `colis_id` pour Paiement Colis
- Sélecteur de colis conditionnel dans le formulaire

### Phase 2 : Transactions-Protected.tsx ✅
- État `activeTab` pour gérer les 3 onglets
- Import composants Tabs
- Filtres dynamiques selon l'onglet actif
- TabsList avec 3 onglets : Clients, Internes, Transferts
- Reset pagination et sélection au changement d'onglet

### Phase 3 : À faire
- Supprimer `Operations-Financieres.tsx`
- Supprimer `Encaissements.tsx` et `Encaissements-Protected.tsx`
- Mettre à jour les routes
- Mettre à jour le menu de navigation

Tableau Transactions : 

- ID
- NOm
- Date
- Montant
- motif
- Statut
- Frais
- Benefice
- Cny
- Compte
 