# 💰 Organisation des Modules Financiers - FactureX

## 📋 Vue d'Ensemble

Ce document décrit l'architecture unifiée des modules financiers avec **synchronisation automatique** entre les transactions, comptes et mouvements.

---

## 🏗️ Architecture Globale

```
📁 Module Finances (Unifié)
├── 💰 Encaissements (Factures + Colis)
│   ├── Créer encaissement → Met à jour compte + Crée mouvement
│   ├── Supprimer encaissement → Inverse compte + Crée mouvement annulation
│   └── Table: paiements
│
├── 💸 Opérations Internes
│   ├── Dépenses → Débite compte source + Crée mouvement
│   ├── Revenus → Crédite compte destination + Crée mouvement
│   ├── Swaps (Transferts) → Débite source + Crédite destination + 2 mouvements
│   └── Table: transactions
│
├── 🏦 Comptes Financiers
│   ├── Solde mis à jour automatiquement
│   ├── Historique complet des mouvements
│   └── Table: comptes_financiers
│
└── 📊 Mouvements de Comptes
    ├── Traçabilité complète (solde avant/après)
    ├── Audit trail immuable
    └── Table: mouvements_comptes
```

---

## ✅ Corrections Appliquées

### 1. **Erreur `MODULES_INFO` Non Exporté** ✅

**Problème**: `MODULES_INFO` défini dans `permissions.ts` mais pas exporté depuis `index.ts`

**Solution**:
- ✅ Unifié `ModuleType` entre `permissions.ts` et `index.ts`
- ✅ Exporté `MODULES_INFO` et `PREDEFINED_ROLES` depuis `permissions.ts`
- ✅ Importé dans `index.ts` pour centraliser les exports
- ✅ Supprimé les duplications

**Fichiers modifiés**:
- `src/types/permissions.ts` - Source unique de vérité
- `src/types/index.ts` - Réexporte depuis permissions.ts

---

### 2. **Hook Centralisé `useFinancialOperations`** ✅

**Objectif**: Synchronisation automatique entre transactions, comptes et mouvements

**Fonctionnalités**:

#### 📥 **Encaissements (Factures + Colis)**
```typescript
const { createEncaissement, deleteEncaissement } = useFinancialOperations();

// Créer un encaissement
await createEncaissement({
  type_paiement: 'facture',
  facture_id: 'xxx',
  client_id: 'yyy',
  montant_paye: 1500,
  compte_id: 'zzz',
  mode_paiement: 'cash'
});

// ✅ Automatiquement:
// 1. Crée l'encaissement dans `paiements`
// 2. Crédite le compte (+1500)
// 3. Crée un mouvement de crédit
// 4. Rafraîchit les requêtes React Query
```

#### 💸 **Opérations Internes (Dépenses/Revenus/Swaps)**
```typescript
const { createOperationInterne, deleteOperationInterne } = useFinancialOperations();

// Créer une dépense
await createOperationInterne({
  type_transaction: 'depense',
  motif: 'Achat matériel',
  montant: 500,
  compte_source_id: 'compte_cash',
  devise: 'USD'
});

// ✅ Automatiquement:
// 1. Crée la transaction dans `transactions`
// 2. Débite le compte source (-500)
// 3. Crée un mouvement de débit
// 4. Rafraîchit les requêtes

// Créer un swap (transfert entre comptes)
await createOperationInterne({
  type_transaction: 'transfert',
  motif: 'Transfert Cash → Airtel',
  montant: 1000,
  compte_source_id: 'compte_cash',
  compte_destination_id: 'compte_airtel',
  devise: 'USD'
});

// ✅ Automatiquement:
// 1. Crée la transaction
// 2. Débite compte source (-1000)
// 3. Crédite compte destination (+1000)
// 4. Crée 2 mouvements (débit + crédit)
// 5. Rafraîchit les requêtes
```

---

## 🔄 Flux de Synchronisation

### Création d'Encaissement
```
User Action → createEncaissement()
    ↓
1. INSERT paiements
    ↓
2. UPDATE comptes_financiers (solde_actuel += montant)
    ↓
3. INSERT mouvements_comptes (type: credit)
    ↓
4. Invalidate React Query cache
    ↓
✅ UI se rafraîchit automatiquement
```

### Création de Dépense
```
User Action → createOperationInterne({ type: 'depense' })
    ↓
1. INSERT transactions
    ↓
2. UPDATE comptes_financiers (solde_actuel -= montant)
    ↓
3. INSERT mouvements_comptes (type: debit)
    ↓
4. Invalidate React Query cache
    ↓
✅ UI se rafraîchit automatiquement
```

### Création de Swap (Transfert)
```
User Action → createOperationInterne({ type: 'transfert' })
    ↓
1. INSERT transactions
    ↓
2. UPDATE compte_source (solde -= montant)
    ↓
3. INSERT mouvement_debit (compte_source)
    ↓
4. UPDATE compte_destination (solde += montant)
    ↓
5. INSERT mouvement_credit (compte_destination)
    ↓
6. Invalidate React Query cache
    ↓
✅ UI se rafraîchit automatiquement
```

---

## 📁 Structure des Fichiers

### Types
```
src/types/
├── permissions.ts          # ✅ Source unique: ModuleType, MODULES_INFO, PREDEFINED_ROLES
└── index.ts                # ✅ Réexporte depuis permissions.ts + autres types
```

### Hooks
```
src/hooks/
├── useFinancialOperations.ts  # ✅ NOUVEAU: Hook centralisé
├── usePaiements.ts            # Encaissements (factures + colis)
├── useTransactions.ts         # Transactions clients
├── useMouvementsComptes.ts    # Mouvements de comptes
└── index.ts                   # ✅ Export useFinancialOperations
```

### Pages
```
src/pages/
├── Encaissements.tsx          # 💰 Encaissements (factures + colis)
├── Operations-Financieres.tsx # 💸 Dépenses/Revenus/Swaps
├── Comptes-Finances.tsx       # 🏦 Vue des comptes
└── Mouvements-Comptes.tsx     # 📊 Historique des mouvements
```

---

## 🎯 Utilisation dans les Pages

### Page Encaissements
```typescript
import { useFinancialOperations } from '@/hooks';

export default function Encaissements() {
  const { createEncaissement } = useFinancialOperations();
  
  const handleSubmit = async (formData) => {
    await createEncaissement(formData);
    // ✅ Compte et mouvements mis à jour automatiquement
  };
}
```

### Page Opérations Financières
```typescript
import { useFinancialOperations } from '@/hooks';

export default function OperationsFinancieres() {
  const { createOperationInterne } = useFinancialOperations();
  
  const handleSubmit = async (formData) => {
    await createOperationInterne(formData);
    // ✅ Comptes et mouvements mis à jour automatiquement
  };
}
```

---

## 🔒 Sécurité et Permissions

### Module `finances`
- **Super Admin**: Accès complet
- **Admin**: Accès complet
- **Opérateur**: Aucun accès (module invisible)
- **Comptable**: Lecture seule (optionnel)

### RLS Policies
- Isolation par `organization_id`
- Vérification des permissions via `has_finances_access()`
- Audit trail complet dans `security_logs`

---

## 📊 Tables de Base de Données

### `paiements` (Encaissements)
```sql
- id (uuid)
- type_paiement ('facture' | 'colis')
- facture_id (uuid, nullable)
- colis_id (uuid, nullable)
- client_id (uuid)
- montant_paye (numeric)
- compte_id (uuid) -- ✅ Lien vers comptes_financiers
- mode_paiement (text)
- date_paiement (timestamptz)
- notes (text)
- organization_id (uuid)
```

### `transactions` (Opérations Internes)
```sql
- id (uuid)
- type_transaction ('revenue' | 'depense' | 'transfert')
- motif (text)
- montant (numeric)
- compte_source_id (uuid, nullable) -- ✅ Pour dépenses/transferts
- compte_destination_id (uuid, nullable) -- ✅ Pour revenus/transferts
- devise (text)
- organization_id (uuid)
```

### `comptes_financiers` (Comptes)
```sql
- id (uuid)
- nom (text)
- type_compte ('mobile_money' | 'banque' | 'cash')
- solde_actuel (numeric) -- ✅ Mis à jour automatiquement
- devise ('USD' | 'CDF')
- is_active (boolean)
- organization_id (uuid)
```

### `mouvements_comptes` (Mouvements)
```sql
- id (uuid)
- compte_id (uuid)
- transaction_id (uuid, nullable) -- ✅ Lien vers paiements ou transactions
- type_mouvement ('debit' | 'credit')
- montant (numeric)
- solde_avant (numeric) -- ✅ Traçabilité
- solde_apres (numeric) -- ✅ Traçabilité
- description (text)
- date_mouvement (timestamptz)
- organization_id (uuid)
```

---

## ✅ Avantages de cette Architecture

1. **Synchronisation Automatique** 🔄
   - Plus besoin de mettre à jour manuellement les comptes
   - Mouvements créés automatiquement
   - Cohérence garantie

2. **Traçabilité Complète** 📊
   - Chaque mouvement enregistre solde avant/après
   - Audit trail immuable
   - Historique complet pour compliance

3. **Code DRY** 🎯
   - Logique centralisée dans `useFinancialOperations`
   - Réutilisable dans toutes les pages
   - Maintenance simplifiée

4. **Performance Optimisée** ⚡
   - React Query cache intelligent
   - Invalidation ciblée des requêtes
   - Rafraîchissement automatique de l'UI

5. **Sécurité Renforcée** 🔒
   - Permissions granulaires
   - RLS policies multi-tenant
   - Audit trail complet

---

## 🚀 Prochaines Étapes

### Phase 3 - Priorité 3: Multi-Devise Côté Serveur
- Extension tables pour multi-devises (USD, EUR, CDF, CNY)
- Conversion automatique via API taux
- Rapports par devise

### Phase 3 - Priorité 4: Notifications par Email
- Système d'alertes email pour workflow
- Templates email (approbation, rejet)
- Préférences utilisateur

### Phase 3 - Priorité 5: Audit Trail Avancé
- Logs immuables avec checksum
- Export pour audit (GDPR, SOC2)
- Tableaux de bord d'audit

---

## 📝 Notes Importantes

⚠️ **Attention**: Les triggers SQL existants peuvent parfois échouer. Le hook `useFinancialOperations` garantit la cohérence même si les triggers ne fonctionnent pas.

✅ **Recommandation**: Utiliser `useFinancialOperations` pour toutes les nouvelles opérations financières au lieu d'appeler directement Supabase.

🔄 **Migration**: Les pages existantes peuvent être migrées progressivement vers `useFinancialOperations` sans casser le code existant.

---

**Dernière mise à jour**: 11 janvier 2025  
**Version**: 1.0.0  
**Statut**: ✅ Production Ready
