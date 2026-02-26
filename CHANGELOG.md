# Changelog - FactureX

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/spec/v2.0.0.html).

---

## [2.0.0] - 2026-02-26

### 🎉 Release Majeur - FactureX v2.0

### ✨ Nouveautés

#### Design System & UI
- **Cotheme Design System** - Refonte complète de l'interface utilisateur
  - Nouveaux tokens de design (`src/lib/design-system/`)
  - Palette de couleurs unifiée avec Tailwind CSS
  - Composants `stat-card`, `kpi-card`, `status-dot` modernisés
  - Animations et transitions améliorées
- **Composants UI** 
  - `critical-confirm-dialog.tsx` - Dialogues de confirmation critiques
  - `kpi-card.tsx` - Cartes de performance clés
  - Amélioration des composants existants (skeleton, badge, alert)

#### Dashboard & Analytics
- Refonte de l'`AdvancedDashboard` avec le nouveau Design System
- Graphiques et statistiques améliorés
- Meilleure visualisation des données financières

#### Sécurité & Permissions
- **Architecture des rôles unifiée** - Source de vérité `app_metadata.role`
- Fonction RPC `set_user_role()` pour gestion atomique des rôles
- 11 RLS policies migrées vers `is_admin()` / `is_super_admin()`
- Protection du champ `profiles.role` via trigger

#### Finances & Comptabilité
- **Correction des swaps cross-currency** - Support de 6 paires (USD↔CNY, USD↔CDF, CNY↔CDF)
- **Nouveau champ `montant_converti`** dans la table transactions
- Synchronisation automatique des taux : 6.95 (USD→CNY), 2200 (USD→CDF)
- Frais mis à jour : transfert 5%, commande 15%, partenaire 3%
- **Solde Global** correctement calculé dans Operations-Financieres
- Correction des soldes désynchronisés (Airtel Money, Illicocash, M-Pesa)

#### Colis & Logistique
- **Audit sécurité Colis** - Migration 20260221_phase_bc_colis_security_audit
- `montant_a_payer` devient GENERATED COLUMN (poids × tarif_kg)
- DELETE restreint aux admins uniquement
- Audit trail avec `trigger_audit_colis`
- Correction des statuts dashboard (en_transit, livre, en_preparation)

#### Base de Données
- **Triggers de solde automatiques** - Mise à jour temps réel des comptes
- **Migrations de sécurité** - 10+ migrations pour audit paramètres
- Correction des contraintes RLS sur profiles, settings, organizations
- Suppression des policies `USING(true)` trop permissives

### 🔧 Corrections de Bugs

#### Critiques
- **Bug #1+#5** : SWAP cross-currency incomplet - 6 paires maintenant supportées
- **Bug #2** : Double mise à jour des soldes - Simplifié avec triggers SQL uniquement
- **Bug #3** : Taux fallback désynchronisés - Synchronisés à 6.95/2200
- **Bug #4** : CNY calculé pour dépenses - Corrigé pour revenus uniquement
- **Bug #6** : Comptes non modifiables en update - Inclusion des IDs de compte

#### Importants
- **Solde Net** dans Operations-Financieres - Affiche maintenant le vrai solde global
- **Solde actuel** dans statistiques compte - Tri par date décroissante
- **Pagination stats** - Toutes les opérations comptées, pas seulement la page
- **Colis dashboard** - Chargement infini corrigé avec bons statuts
- **Filtres transactions** - Correction du filtrage commercial

#### UX/UI
- Meilleure gestion des états de chargement
- Amélioration des messages d'erreur
- Refonte visuelle de toutes les pages principales
- Responsive design amélioré

### 📚 Documentation
- `CODE_AUDIT_REPORT.md` - Audit complet du codebase
- Documentation des migrations de sécurité
- Guides de déploiement mis à jour

### 🏗️ Architecture
- **Hooks génériques** : `useSupabaseCrud.ts`, `useSupabaseQuery.ts`
- **Module transactions** factorisé dans `hooks/transactions/`
- Séparation claire entre logique métier et présentation
- Système de permissions granulaires

---

## [1.0.3] - 2025-01-26

### 🔒 Sécurité
- Audit de sécurité complet (Score 2/10 → 8/10)
- Credentials déplacés vers variables d'environnement
- RLS Policies corrigées avec multi-tenancy
- CSP sécurisé (suppression unsafe-eval/inline)
- Rate limiting client-side (login/signup)

### ✨ Fonctionnalités
- Module Finances sécurisé (Admin uniquement)
- Système de permissions granulaires
- Webhooks et API Keys
- Activity Logs et Security Dashboard

### 📦 Modules
- Clients, Factures, Transactions, Colis
- Finances : Opérations, Comptes, Mouvements, Encaissements

---

## Notes de Version

### Compatibilité
- **v2.0.0** : Nécessite migrations SQL (voir `/supabase/migrations/`)
- **Breaking Changes** : Architecture des rôles modifiée (app_metadata)

### Dépendances
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Supabase JS Client 2+

### Migration depuis v1.0.3
1. Appliquer les migrations SQL dans l'ordre chronologique
2. Mettre à jour les variables d'environnement
3. Vérifier les permissions des utilisateurs existants
4. Recalculer les soldes si nécessaire

---

*Pour plus de détails, consultez la documentation dans `/docs`*
