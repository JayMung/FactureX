# 🔐 Guide des Permissions - Module Finances

## 📋 Vue d'ensemble

Le module **Finances** est un module **sensible** qui nécessite des permissions spéciales. Par défaut, seuls les **Super Admin** et **Admin** y ont accès. Les **Opérateurs** sont **bloqués** par défaut.

---

## 👥 Hiérarchie des rôles

### 🔴 Super Admin
**Accès** : COMPLET et ILLIMITÉ

**Permissions** :
- ✅ Toutes les permissions `finances.*`
- ✅ Peut configurer qui a accès au module
- ✅ Peut créer/modifier/supprimer tout
- ✅ Accès à tous les sous-modules

**Cas d'usage** :
- Configuration initiale du système
- Gestion des utilisateurs et permissions
- Audit et supervision complète

---

### 🟠 Admin
**Accès** : COMPLET par défaut

**Permissions** :
- ✅ `finances.view` - Voir le module
- ✅ `finances.transactions` - Gérer transactions clients
- ✅ `finances.depenses_revenus` - Gérer dépenses/revenus
- ✅ `finances.encaissements.*` - Gérer encaissements
- ✅ `finances.comptes.*` - Gérer comptes
- ✅ `finances.mouvements.*` - Voir et exporter mouvements

**Cas d'usage** :
- Gestion quotidienne des finances
- Enregistrement des encaissements
- Création de comptes
- Suivi de trésorerie

---

### 🔵 Opérateur (par défaut)
**Accès** : AUCUN

**Permissions** :
- ❌ Aucune permission `finances`
- ❌ Menu "Finances" invisible
- ❌ Routes `/finances/*` bloquées
- ✅ Peut voir factures/colis (sans infos paiement)

**Cas d'usage** :
- Gestion des factures et colis uniquement
- Pas d'accès aux données financières
- Pas de visibilité sur les paiements

**Ce qu'ils voient dans Factures/Colis** :
- ✅ Numéro facture/colis
- ✅ Client
- ✅ Date
- ✅ Statut opérationnel
- ❌ Montant payé (masqué)
- ❌ Solde restant (masqué)
- ❌ Statut paiement (masqué)

---

### 🟢 Comptable (optionnel)
**Accès** : LECTURE SEULE

**Permissions** :
- ✅ `finances.view` - Voir le module
- ✅ `finances.encaissements.view` - Voir encaissements
- ✅ `finances.comptes.view` - Voir comptes
- ✅ `finances.mouvements.view` - Voir mouvements
- ✅ `finances.mouvements.export` - Exporter données
- ❌ Pas de création/modification/suppression

**Cas d'usage** :
- Audit comptable
- Génération de rapports
- Vérification des encaissements
- Export pour comptabilité externe

---

## 🎯 Permissions granulaires

### Module : `finances`

```
finances/
├── view                        → Voir le module (requis pour tout)
├── transactions                → Gérer transactions clients
├── depenses_revenus            → Gérer dépenses & revenus
├── encaissements/
│   ├── create                  → Créer encaissements
│   ├── view                    → Voir encaissements
│   └── delete                  → Supprimer encaissements
├── comptes/
│   ├── view                    → Voir comptes
│   ├── create                  → Créer comptes
│   ├── edit                    → Modifier comptes
│   └── delete                  → Supprimer comptes
└── mouvements/
    ├── view                    → Voir historique
    └── export                  → Exporter données
```

---

## 🛠️ Configuration dans Settings

### Étape 1 : Accéder aux permissions
1. Menu → **Paramètres**
2. Onglet → **Permissions**
3. Module → **Finances**

### Étape 2 : Voir les permissions disponibles
Vous verrez toutes les permissions listées ci-dessus.

### Étape 3 : Attribuer à un rôle
1. Sélectionner le rôle (ex: Opérateur)
2. Cocher les permissions souhaitées
3. Sauvegarder

### Exemple : Donner accès limité à un opérateur
Si vous voulez qu'un opérateur puisse **voir** les encaissements mais pas les créer :
- ✅ Cocher `finances.view`
- ✅ Cocher `finances.encaissements.view`
- ❌ Ne PAS cocher `finances.encaissements.create`

---

## 🔒 Sécurité implémentée

### 1. Protection des routes
```typescript
// Toutes les routes /finances/* sont protégées
<Route path="/finances/*" element={
  <ProtectedRouteEnhanced requiredModule="finances">
    <FinancesLayout />
  </ProtectedRouteEnhanced>
} />
```

**Résultat** : Si un utilisateur sans permission tente d'accéder, il est redirigé vers la page d'accueil.

### 2. Protection du menu
```typescript
// Le menu "Finances" n'apparaît que si l'utilisateur a la permission
{hasPermission('finances', 'view') && (
  <MenuItem>Finances</MenuItem>
)}
```

**Résultat** : Les opérateurs ne voient même pas le menu "Finances".

### 3. Protection des actions
```typescript
// Bouton "Enregistrer paiement" visible uniquement si autorisé
{hasPermission('finances', 'encaissements.create') && (
  <Button>Enregistrer paiement</Button>
)}
```

**Résultat** : Même si quelqu'un accède à la page, il ne peut pas effectuer d'actions non autorisées.

### 4. Protection base de données (RLS)
```sql
-- Les policies Supabase vérifient les permissions
CREATE POLICY "Only authorized users can view paiements"
  ON paiements FOR SELECT
  USING (has_finances_access(auth.uid()));
```

**Résultat** : Même avec un accès API direct, les données sont protégées.

---

## 📊 Masquage des informations sensibles

### Page Factures (pour utilisateurs sans accès finances)

**Colonnes visibles** :
- ✅ Numéro facture
- ✅ Client
- ✅ Date émission
- ✅ Statut facture (brouillon, validée, etc.)

**Colonnes masquées** :
- ❌ Montant payé
- ❌ Solde restant
- ❌ Statut paiement
- ❌ Bouton "Enregistrer paiement"

### Page Colis (pour utilisateurs sans accès finances)

Même logique que les factures.

---

## 🚨 Audit et alertes

### Événements loggés
Tous les accès au module Finances sont enregistrés dans `security_logs` :

```typescript
{
  event_type: 'finances_access',
  user_id: 'uuid',
  action: 'view_encaissements',
  severity: 'info',
  metadata: {
    module: 'finances',
    sub_module: 'encaissements'
  }
}
```

### Alertes critiques
Le système génère des alertes pour :
- ⚠️ Tentative d'accès non autorisé
- ⚠️ Encaissement > $10,000
- ⚠️ Suppression d'encaissement
- ⚠️ Modification de compte bancaire
- ⚠️ Export massif de données

---

## 🧪 Tests de sécurité

### Test 1 : Opérateur bloqué
1. Connectez-vous avec un compte **Opérateur**
2. Vérifiez que le menu "Finances" n'apparaît PAS
3. Essayez d'accéder à `/finances/encaissements` directement
4. ✅ Vous devez être redirigé vers la page d'accueil

### Test 2 : Admin a accès
1. Connectez-vous avec un compte **Admin**
2. Vérifiez que le menu "Finances" apparaît
3. Cliquez sur "Finances" → "Encaissements"
4. ✅ Vous devez voir la page

### Test 3 : Permissions granulaires
1. Créez un rôle personnalisé avec seulement `finances.view` et `finances.encaissements.view`
2. Assignez ce rôle à un utilisateur
3. Connectez-vous avec cet utilisateur
4. ✅ Vous devez voir les encaissements
5. ❌ Le bouton "Enregistrer paiement" ne doit PAS apparaître

---

## 📝 Checklist de configuration

Avant de mettre en production :

- [ ] Migration SQL des permissions appliquée
- [ ] Module `finances` créé dans la base
- [ ] Permissions attribuées aux super_admin et admin
- [ ] Testé avec compte opérateur (doit être bloqué)
- [ ] Testé avec compte admin (doit avoir accès)
- [ ] Menu "Finances" visible uniquement pour autorisés
- [ ] Routes protégées fonctionnent
- [ ] RLS policies actives sur table `paiements`
- [ ] Audit logging configuré
- [ ] Alertes de sécurité actives

---

## 🆘 Dépannage

### Problème : Admin n'a pas accès
**Solution** :
1. Vérifier que l'utilisateur a bien le rôle `admin` dans `auth.users.raw_app_meta_data`
2. Vérifier que les permissions sont attribuées dans `role_permissions`
3. Vider le cache du navigateur

### Problème : Opérateur voit le menu
**Solution** :
1. Vérifier que le code du Sidebar vérifie bien `hasPermission('finances', 'view')`
2. Vérifier que l'opérateur n'a PAS cette permission dans la base

### Problème : Erreur RLS lors de l'accès
**Solution** :
1. Vérifier que la fonction `has_finances_access()` existe
2. Vérifier que les policies sont actives sur la table
3. Vérifier que l'utilisateur a un `organization_id` dans `profiles`

---

## 📚 Ressources

- **Migration SQL** : `20251101225000_create_finances_permissions.sql`
- **Documentation complète** : `RESTRUCTURATION_FINANCES_PROGRESS.md`
- **Hook permissions** : `src/hooks/usePermissions.ts`
- **Route protégée** : `src/components/auth/ProtectedRouteEnhanced.tsx`

---

**Date de création** : 1er novembre 2025
**Version** : 1.0
**Statut** : Production Ready
