# 🔄 Restructuration du Module Finances - Progression

## 📋 Vue d'ensemble

Refonte complète de l'architecture financière pour :
- Consolider 3 menus en 1 seul menu "Finances"
- Séparer clairement les opérations commerciales des opérations internes
- Centraliser tous les encaissements (factures + colis)
- Simplifier la navigation

---

---

## 🔐 Permissions et Sécurité

### Principe de sécurité
Le module **Finances** est **sensible** et ne doit être accessible qu'aux personnes autorisées par les administrateurs.

### Hiérarchie des accès

#### **Super Admin**
- ✅ Accès complet à tout le module Finances
- ✅ Peut voir, créer, modifier, supprimer tous les éléments
- ✅ Peut configurer les permissions pour les autres rôles
- ✅ Accès à tous les sous-menus :
  - Transactions Clients
  - Dépenses & Revenus
  - Encaissements
  - Comptes & Mouvements

#### **Admin**
- ✅ Accès complet au module Finances (par défaut)
- ✅ Peut déléguer l'accès à certains sous-modules
- ✅ Peut voir tous les comptes et mouvements
- ✅ Peut enregistrer des encaissements

#### **Opérateur** (par défaut)
- ❌ **AUCUN accès** au module Finances
- ❌ Le menu "Finances" n'apparaît pas dans le sidebar
- ❌ Routes protégées (redirection si accès direct)
- ✅ Peut seulement voir les factures/colis (sans infos paiement sensibles)

#### **Comptable** (nouveau rôle optionnel)
- ✅ Accès en lecture seule à tout le module
- ✅ Peut voir les encaissements
- ✅ Peut voir les comptes et mouvements
- ✅ Peut exporter les données
- ❌ Ne peut pas créer/modifier/supprimer

### Configuration dans Settings

#### **Page Settings → Permissions**

**Nouveau module à ajouter** : `finances`

**Permissions granulaires** :
```typescript
Module: finances
  ├── finances.view              // Voir le module
  ├── finances.transactions      // Gérer transactions clients
  ├── finances.depenses_revenus  // Gérer dépenses & revenus
  ├── finances.encaissements     // Enregistrer encaissements
  │   ├── finances.encaissements.create
  │   ├── finances.encaissements.view
  │   └── finances.encaissements.delete
  ├── finances.comptes           // Gérer comptes
  │   ├── finances.comptes.view
  │   ├── finances.comptes.create
  │   ├── finances.comptes.edit
  │   └── finances.comptes.delete
  └── finances.mouvements        // Voir historique mouvements
      ├── finances.mouvements.view
      └── finances.mouvements.export
```

#### **Permissions par défaut**

**Super Admin** :
- ✅ Toutes les permissions finances.*

**Admin** :
- ✅ finances.view
- ✅ finances.transactions
- ✅ finances.depenses_revenus
- ✅ finances.encaissements.*
- ✅ finances.comptes.*
- ✅ finances.mouvements.*

**Opérateur** :
- ❌ Aucune permission finances

**Comptable** (si créé) :
- ✅ finances.view
- ✅ finances.encaissements.view
- ✅ finances.comptes.view
- ✅ finances.mouvements.view
- ✅ finances.mouvements.export

### Implémentation technique

#### **1. Mise à jour de la table `modules`**
```sql
INSERT INTO modules (id, nom, description, is_active)
VALUES (
  'finances',
  'Finances',
  'Gestion financière complète : transactions, encaissements, comptes',
  true
);
```

#### **2. Création des permissions**
```sql
INSERT INTO permissions (module_id, action, description) VALUES
('finances', 'view', 'Voir le module Finances'),
('finances', 'transactions', 'Gérer les transactions clients'),
('finances', 'depenses_revenus', 'Gérer les dépenses et revenus'),
('finances', 'encaissements.create', 'Créer des encaissements'),
('finances', 'encaissements.view', 'Voir les encaissements'),
('finances', 'encaissements.delete', 'Supprimer des encaissements'),
('finances', 'comptes.view', 'Voir les comptes'),
('finances', 'comptes.create', 'Créer des comptes'),
('finances', 'comptes.edit', 'Modifier des comptes'),
('finances', 'comptes.delete', 'Supprimer des comptes'),
('finances', 'mouvements.view', 'Voir l\'historique des mouvements'),
('finances', 'mouvements.export', 'Exporter les mouvements');
```

#### **3. Attribution par défaut aux admins**
```sql
-- Attribuer toutes les permissions finances aux super_admin et admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions WHERE module_id = 'finances';

INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE module_id = 'finances';
```

#### **4. Protection des routes**
```typescript
// Dans App.tsx
<Route path="/finances/*" element={
  <ProtectedRouteEnhanced requiredModule="finances">
    <FinancesLayout />
  </ProtectedRouteEnhanced>
} />
```

#### **5. Protection du menu Sidebar**
```typescript
// Dans Sidebar.tsx
const financesMenu = {
  icon: DollarSign,
  label: 'Finances',
  path: '/finances',
  module: 'finances', // Vérifie la permission
  subMenus: [...]
};

// Le menu n'apparaît que si l'utilisateur a la permission
const hasFinancesAccess = hasPermission('finances', 'view');
```

#### **6. Protection des actions**
```typescript
// Dans chaque page
const { hasPermission } = usePermissions();

// Bouton "Enregistrer paiement"
{hasPermission('finances', 'encaissements.create') && (
  <Button onClick={handleCreatePaiement}>
    Enregistrer paiement
  </Button>
)}

// Bouton "Supprimer"
{hasPermission('finances', 'encaissements.delete') && (
  <Button onClick={handleDelete}>
    Supprimer
  </Button>
)}
```

### Masquage des informations sensibles

#### **Page Factures (pour opérateurs)**
Si l'utilisateur n'a PAS la permission `finances.view` :
- ❌ Masquer colonnes : Montant payé, Solde restant
- ❌ Masquer badge statut paiement
- ❌ Pas de bouton "Voir paiements"
- ✅ Afficher uniquement : Numéro, Client, Date, Statut facture

#### **Page Colis (pour opérateurs)**
Même logique que factures.

### Audit et traçabilité

Tous les accès et actions sur le module Finances sont loggés :
```typescript
// Dans security_logs
{
  event_type: 'finances_access',
  user_id: '...',
  action: 'view_encaissements',
  resource_id: 'paiement_id',
  severity: 'info',
  metadata: {
    module: 'finances',
    sub_module: 'encaissements',
    ip_address: '...'
  }
}
```

### Alertes de sécurité

**Événements critiques à monitorer** :
- ✅ Tentative d'accès non autorisé au module Finances
- ✅ Création d'encaissement > $10,000
- ✅ Suppression d'encaissement
- ✅ Modification de compte bancaire
- ✅ Export massif de données financières

---

## ✅ Étape 1 : Base de données - TERMINÉE

### Migration appliquée
**Fichier** : `20251101224300_create_paiements_system_fixed.sql`

### Table `paiements` créée
```sql
- id (UUID)
- type_paiement ('facture' | 'colis')
- facture_id (FK vers factures)
- colis_id (UUID, sera lié plus tard)
- client_id (FK vers clients)
- montant_paye (DECIMAL)
- compte_id (FK vers comptes_financiers)
- mode_paiement (TEXT)
- date_paiement (TIMESTAMP)
- notes (TEXT)
- organization_id (UUID)
```

### Colonnes ajoutées aux factures
```sql
ALTER TABLE factures ADD:
- montant_paye (DECIMAL, default 0)
- solde_restant (DECIMAL)
- statut_paiement ('non_paye' | 'partiel' | 'paye')
```

### Triggers créés
1. **`trigger_process_paiement_after_insert`**
   - Met à jour facture.montant_paye
   - Calcule facture.solde_restant
   - Met à jour facture.statut_paiement
   - Change facture.statut en 'payee' si paiement complet

2. **`trigger_create_transaction_from_paiement`**
   - Crée automatiquement une transaction type 'revenue'
   - Avec compte_destination_id = compte du paiement
   - Description : "Paiement facture FAC-XXX"

### Synchronisation automatique
```
Paiement enregistré
   ↓
1. Met à jour facture (montant_paye, solde_restant, statut)
   ↓
2. Crée transaction revenue
   ↓
3. Trigger met à jour solde du compte
   ↓
4. Trigger crée mouvement CREDIT dans mouvements_comptes
   ↓
Tout est synchronisé !
```

---

## 🚧 Étape 2 : Frontend - EN COURS

### À créer

#### 1. Page Encaissements (`/finances/encaissements`)
**Objectif** : Enregistrer tous les paiements (factures + colis)

**Fonctionnalités** :
- [ ] Formulaire unifié pour enregistrer paiements
- [ ] Sélection type : Facture ou Colis
- [ ] Sélection de la facture/colis (avec montant dû)
- [ ] Montant payé (avec validation ≤ solde restant)
- [ ] Sélection du compte destination
- [ ] Mode de paiement
- [ ] Notes optionnelles
- [ ] Affichage du solde restant après paiement

**Tableau** :
- [ ] Liste de tous les encaissements
- [ ] Colonnes : Date, Type, Référence, Client, Montant, Compte, Solde restant
- [ ] Filtres : Type, Client, Date, Compte
- [ ] Stats : Total encaissé, Par type, Par compte
- [ ] Export CSV

#### 2. Restructuration du menu Sidebar
**Objectif** : 1 seul menu "Finances" avec sous-menus

**Structure** :
```
💰 Finances (menu déroulant)
   ├── 📋 Transactions Clients
   ├── 💵 Dépenses & Revenus
   ├── 💳 Encaissements
   └── 🏦 Comptes & Mouvements
```

**Changements** :
- [ ] Créer menu parent "Finances"
- [ ] Ajouter sous-menus
- [ ] Supprimer anciens menus séparés

#### 3. Renommer les routes
```
AVANT                          APRÈS
/transactions               →  /finances/transactions-clients
/operations-financieres     →  /finances/depenses-revenus
NOUVEAU                     →  /finances/encaissements
/comptes                    →  /finances/comptes (onglet 1)
/comptes/mouvements         →  /finances/comptes (onglet 2)
```

#### 4. Fusionner Comptes + Mouvements
**Objectif** : 1 seule page avec 2 onglets

**Page** : `/finances/comptes`

**Onglet 1 : Mes Comptes**
- Vue actuelle de /comptes
- Liste des comptes (Grid/Liste)
- Soldes actuels
- Actions : Créer, Modifier, Supprimer, Voir détails

**Onglet 2 : Historique des Mouvements**
- Vue actuelle de /comptes/mouvements
- Tous les débits/crédits
- Filtres avancés
- Export CSV

#### 5. Nettoyer modules Factures et Colis
**Objectif** : Supprimer toutes les actions financières

**Page Factures** :
- [ ] Supprimer boutons "Enregistrer paiement" (si existants)
- [ ] Ajouter colonnes en lecture seule :
  - Montant payé
  - Solde restant
  - Statut paiement (badge)
- [ ] Pas d'action financière possible

**Page Colis** :
- [ ] Même logique que factures
- [ ] Lecture seule pour infos paiement

---

## 📊 Architecture finale

### Menu Finances (4 sous-menus)

#### 1. Transactions Clients
**Route** : `/finances/transactions-clients`
**Rôle** : Opérations commerciales avec clients
- Commandes (achats marchandises)
- Transferts d'argent
- Avec client, frais, bénéfices, CNY

#### 2. Dépenses & Revenus
**Route** : `/finances/depenses-revenus`
**Rôle** : Opérations financières internes
- Dépenses (sorties d'argent)
- Revenus (entrées d'argent)
- Sans client, formulaire simplifié

#### 3. Encaissements ⭐ NOUVEAU
**Route** : `/finances/encaissements`
**Rôle** : Enregistrer tous les paiements
- Paiements de factures (total/partiel)
- Paiements de colis (total/partiel)
- Synchronisation automatique

#### 4. Comptes & Mouvements
**Route** : `/finances/comptes`
**Rôle** : Vue d'ensemble trésorerie + historique
- Onglet 1 : Mes Comptes
- Onglet 2 : Historique des Mouvements

---

## 🔄 Flux de données complet

### Scénario : Paiement partiel de facture

```
1. Page Encaissements
   ↓
2. Sélectionner "Facture"
   ↓
3. Choisir facture FAC-001 (Total: $500, Déjà payé: $0)
   ↓
4. Montant payé: $300
   ↓
5. Compte: Airtel Money
   ↓
6. Mode: Mobile Money
   ↓
7. Enregistrer
   ↓
RÉSULTATS AUTOMATIQUES:
   ✅ Paiement créé dans table paiements
   ✅ Facture mise à jour :
      - montant_paye = $300
      - solde_restant = $200
      - statut_paiement = 'partiel'
   ✅ Transaction revenue créée
   ✅ Solde Airtel Money +$300
   ✅ Mouvement CREDIT dans historique
   ✅ Visible dans :
      - Page Encaissements
      - Page Factures (colonnes paiement)
      - Page Comptes & Mouvements (onglet Historique)
```

---

## 📝 Fichiers créés

### Migrations SQL
1. ✅ `20251101224300_create_paiements_system_fixed.sql`

### Documentation
1. ✅ `RESTRUCTURATION_FINANCES_PROGRESS.md` (ce fichier)

---

## 🎯 Prochaines étapes

### Priorité 0 : Configuration Permissions (AVANT TOUT)
**Durée estimée** : ~30 min

1. **Migration SQL pour module et permissions**
   - Créer module `finances` dans table `modules`
   - Créer toutes les permissions granulaires
   - Attribuer permissions par défaut aux admins
   - Tester avec utilisateur opérateur (doit être bloqué)

2. **Vérifier système de permissions existant**
   - S'assurer que `usePermissions` hook fonctionne
   - Vérifier `ProtectedRouteEnhanced` avec `requiredModule`
   - Tester `hasPermission()` avec permissions granulaires

3. **Créer rôle "Comptable" (optionnel)**
   - Ajouter dans enum des rôles
   - Attribuer permissions en lecture seule

### Priorité 1 : Page Encaissements
1. Créer types TypeScript pour Paiement
2. Créer hook `usePaiements`
3. Créer composant formulaire `PaiementForm`
4. Créer page `Encaissements.tsx`
5. Tester le flux complet

### Priorité 2 : Restructuration menu
1. Modifier `Sidebar.tsx`
2. Créer menu parent "Finances"
3. Ajouter sous-menus
4. Mettre à jour les routes dans `App.tsx`

### Priorité 3 : Fusion Comptes + Mouvements
1. Créer composant avec onglets
2. Intégrer vues existantes
3. Tester navigation

### Priorité 4 : Nettoyage
1. Nettoyer page Factures
2. Nettoyer page Colis
3. Supprimer code inutilisé

---

## ⏱️ Estimation temps restant

- **Configuration Permissions** : ~30 min ⭐ PRIORITAIRE
- Page Encaissements : ~45 min
- Restructuration menu : ~20 min
- Fusion Comptes/Mouvements : ~30 min
- Nettoyage : ~15 min
- Tests : ~20 min

**Total estimé** : ~2h40

**Note** : Les permissions doivent être configurées EN PREMIER pour garantir la sécurité dès le début.

---

## ✅ Avantages de cette architecture

### Simplicité
- 1 seul menu au lieu de 3
- Navigation claire et logique
- Pas de duplication

### Séparation des responsabilités
- **Factures/Colis** : Gestion opérationnelle uniquement
- **Finances** : Gestion financière exclusive
- Chaque module a un rôle clair

### Centralisation
- Tous les encaissements au même endroit
- Un seul flux pour factures et colis
- Cohérence garantie

### Automatisation
- Synchronisation automatique
- Pas de saisie manuelle
- Pas d'erreurs de cohérence

---

**Date** : 1er novembre 2025, 22:45
**Statut** : Base de données terminée, Frontend en cours
**Prochaine session** : Création page Encaissements
