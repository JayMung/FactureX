# PRD - CoxiPay

## 📋 Document de Spécifications du Produit (Product Requirements Document)

**Version:** 1.0  
**Date:** Janvier 2025  
**Statut:** En production  
**Plateforme:** Application Web (React + Supabase)

---

## 1. Vue d'ensemble du produit

### 1.1 Description générale

**CoxiPay** est une plateforme de gestion complète pour les activités de transfert d'argent et de commerce international (USD/CDF/CNY). L'application permet de gérer les clients, les transactions financières, la génération de factures et devis, ainsi que le suivi des activités avec un système de permissions granulaire.

### 1.2 Vision et objectifs

**Vision:**  
Simplifier et sécuriser la gestion des transferts internationaux et des transactions commerciales pour les entreprises opérant entre l'Afrique et la Chine.

**Objectifs principaux:**
- Centraliser la gestion des clients et leurs transactions
- Automatiser la création de factures et devis avec calcul de frais de transport
- Assurer la traçabilité complète de toutes les opérations
- Fournir un système de permissions multi-utilisateurs
- Générer des rapports et analytics en temps réel

### 1.3 Public cible

- **Utilisateurs primaires:** Entreprises de transfert d'argent (USD/CDF)
- **Utilisateurs secondaires:** Entreprises d'import/export Chine-Afrique
- **Rôles:** 
  - Administrateurs
  - Opérateurs
  - Lecteurs (consultation uniquement)

---

## 2. Architecture technique

### 2.1 Stack technologique

**Frontend:**
- React 18.3.1 avec TypeScript
- Vite 6.3.4 (bundler)
- React Router 6.26.2 (navigation)
- TanStack Query 5.56.2 (state management)
- Tailwind CSS 3.4.11 (styling)
- Shadcn/ui (composants UI)

**Backend:**
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Row Level Security (RLS) activée sur toutes les tables

**Bibliothèques principales:**
- react-hook-form + zod (formulaires et validation)
- recharts (graphiques)
- jspdf + jspdf-autotable (génération PDF)
- date-fns (manipulation dates)
- lucide-react (icônes)

### 2.2 Structure de la base de données

#### Tables principales:

**1. profiles**
```sql
- id: UUID (référence auth.users)
- email: VARCHAR
- first_name: VARCHAR
- last_name: VARCHAR
- role: VARCHAR (admin, operateur, lecteur)
- avatar_url: TEXT
- phone: VARCHAR
- is_active: BOOLEAN
```

**2. clients**
```sql
- id: UUID
- nom: VARCHAR
- telephone: VARCHAR
- ville: VARCHAR
- email: VARCHAR
- adresse: TEXT
- statut: VARCHAR
- transaction_count: INTEGER
- total_paye: DECIMAL
- created_by: UUID (référence profiles)
- created_at: TIMESTAMP
```

**3. transactions**
```sql
- id: UUID
- client_id: UUID (référence clients)
- date_paiement: TIMESTAMP
- montant: DECIMAL
- devise: VARCHAR (USD, CDF, CNY)
- motif: TEXT
- frais: DECIMAL
- taux_usd_cny: DECIMAL
- taux_usd_cdf: DECIMAL
- benefice: DECIMAL
- montant_cny: DECIMAL
- mode_paiement: VARCHAR
- statut: VARCHAR (En attente, Servi, Remboursé, Annulé)
- valide_par: UUID
- date_validation: TIMESTAMP
- created_by: UUID
```

**4. factures**
```sql
- id: UUID
- facture_number: VARCHAR (auto-généré: FAC-YYYY-MMDD-NNN)
- type: VARCHAR (devis, facture)
- statut: VARCHAR (brouillon, en_attente, validee, annulee)
- client_id: UUID
- date_emission: TIMESTAMP
- date_validation: TIMESTAMP
- valide_par: UUID
- mode_livraison: VARCHAR (aerien, maritime)
- devise: VARCHAR (USD, CDF)
- shipping_fee: DECIMAL
- subtotal: DECIMAL
- total_poids: DECIMAL
- frais_transport_douane: DECIMAL
- total_general: DECIMAL
- conditions_vente: TEXT
- notes: TEXT
- informations_bancaires: TEXT
- created_by: UUID
```

**5. facture_items**
```sql
- id: UUID
- facture_id: UUID
- numero_ligne: INTEGER
- image_url: TEXT
- product_url: TEXT
- quantite: INTEGER
- description: TEXT
- prix_unitaire: DECIMAL
- poids: DECIMAL
- montant_total: DECIMAL
```

**6. settings**
```sql
- id: UUID
- categorie: VARCHAR (company, shipping, invoice, exchange_rates, transaction_fees)
- cle: VARCHAR
- valeur: TEXT
- description: TEXT
```

**7. payment_methods**
```sql
- id: UUID
- name: VARCHAR
- code: VARCHAR
- is_active: BOOLEAN
- icon: VARCHAR
- description: TEXT
```

**8. user_permissions**
```sql
- id: UUID
- user_id: UUID
- module: VARCHAR (clients, transactions, factures, settings, etc.)
- can_read: BOOLEAN
- can_create: BOOLEAN
- can_update: BOOLEAN
- can_delete: BOOLEAN
```

**9. activity_logs**
```sql
- id: UUID
- user_id: UUID
- action: VARCHAR (CREATE, UPDATE, DELETE, VIEW, etc.)
- cible: VARCHAR (Client, Transaction, Facture, etc.)
- cible_id: UUID
- details: JSONB
- date: TIMESTAMP
```

**10. product_categories**
```sql
- id: UUID
- nom: VARCHAR
- code: VARCHAR (NORMAL, LIQUIDE, BATTERIE)
```

---

## 3. Modules fonctionnels

### 3.1 Module d'authentification

**Fonctionnalités:**
- ✅ Inscription utilisateur avec email/mot de passe
- ✅ Connexion avec Supabase Auth
- ✅ Configuration initiale admin (première utilisation)
- ✅ Réinitialisation mot de passe
- ✅ Gestion des sessions
- ✅ Protection des routes avec ProtectedRouteEnhanced

**Routes:**
- `/login` - Page de connexion
- `/admin-setup` - Configuration initiale administrateur

**Permissions:**
- Accès public: login, admin-setup
- Accès authentifié: toutes les autres routes

---

### 3.2 Module Tableau de bord

**Page:** `/` (Index-Protected.tsx)

**Fonctionnalités:**

**Vue d'ensemble:**
- 📊 Statistiques en temps réel:
  - Total USD (toutes transactions)
  - Total CDF (toutes transactions)
  - Bénéfice net calculé
  - Nombre de clients
  - Nombre de transactions
  - Transactions du jour
- 📈 Graphiques et tendances
- 🔔 Centre de notifications
- 📋 Fil d'activité récent
- ⚡ Actions rapides (création transaction/client)

**Analytics avancés:**
- Graphiques de transactions par période
- Analyse des tendances
- Top clients actifs
- Répartition par devise

**Permissions requises:**
- Lecture module dashboard (automatique pour tous)

---

### 3.3 Module Clients

**Page:** `/clients` (Clients-Protected.tsx)

**Fonctionnalités:**

**Liste des clients:**
- 📋 Tableau paginé avec tri personnalisable
- 🔍 Recherche par nom/téléphone
- 🏙️ Filtrage par ville
- 📊 Affichage du total payé par client
- 📱 ID client lisible (CL001, CL002, etc.)
- ✅ Sélection multiple pour actions groupées

**Actions individuelles:**
- ➕ Créer un nouveau client
- ✏️ Modifier les informations client
- 👁️ Voir l'historique des transactions
- 🗑️ Supprimer un client (avec confirmation)
- 📋 Voir les factures associées

**Actions groupées:**
- 🗑️ Suppression multiple
- 📤 Export CSV
- ✉️ Envoi email groupé

**Formulaire client:**
- Nom (requis)
- Téléphone (requis)
- Ville (requis)
- Email (optionnel)
- Adresse (optionnel)

**Villes disponibles:**
- Kinshasa, Lubumbashi, Goma, Mbuji-Mayi, Kananga, Kisangani, Bukavu, Kolwezi, Likasi

**Permissions:**
- `clients.read` - Voir la liste
- `clients.create` - Ajouter un client
- `clients.update` - Modifier un client
- `clients.delete` - Supprimer un client

---

### 3.4 Module Transactions

**Page:** `/transactions` (Transactions-Protected.tsx)

**Fonctionnalités:**

**Liste des transactions:**
- 📋 Tableau paginé avec tri
- 🔍 Recherche par mode de paiement
- 🎯 Filtres multiples:
  - Statut (En attente, Servi, Remboursé, Annulé)
  - Devise (USD, CDF, CNY)
- 💰 Affichage montant + frais + bénéfice
- 📅 Date de paiement
- 👤 Client associé
- ✅ Badge de statut coloré

**Actions individuelles:**
- ➕ Créer une transaction
- ✏️ Modifier une transaction
- 👁️ Voir les détails complets
- ✅ Valider une transaction (change statut en "Servi")
- 📋 Dupliquer une transaction
- 🗑️ Supprimer (avec confirmation)

**Formulaire transaction:**
- Client (sélection avec recherche)
- Montant (requis)
- Devise (USD/CDF/CNY)
- Mode de paiement (sélection dynamique)
- Motif (description)
- Date de paiement
- Statut initial

**Calculs automatiques:**
- Taux USD/CNY (récupéré depuis settings)
- Taux USD/CDF (récupéré depuis settings)
- Frais de transaction (selon le type)
- Bénéfice = Montant - Frais
- Montant CNY = Montant USD × Taux

**Modes de paiement:**
- Chargés dynamiquement depuis la table `payment_methods`
- Configuration dans les paramètres

**Permissions:**
- `transactions.read` - Voir la liste
- `transactions.create` - Créer une transaction
- `transactions.update` - Modifier/Valider
- `transactions.delete` - Supprimer

---

### 3.5 Module Factures & Devis

**Pages:**
- `/factures` - Liste (Factures-Protected.tsx)
- `/factures/new` - Création (Factures-Create.tsx)
- `/factures/edit/:id` - Édition (Factures-Create.tsx)

**Fonctionnalités:**

**Liste des factures:**
- 📋 Tableau avec factures et devis
- 🔍 Filtres:
  - Type (devis/facture)
  - Statut (brouillon, en_attente, validee, annulee)
- 📊 Statistiques:
  - Nombre total de factures
  - Montant total
  - Factures validées
- 🔄 Conversion devis → facture

**Création/Édition:**
- **Informations générales:**
  - Client (sélection)
  - Type (devis ou facture)
  - Date d'émission
  - Mode de livraison (aérien/maritime)
  - Devise (USD/CDF)

- **Lignes de produits (items):**
  - Numéro de ligne
  - Image produit (URL)
  - URL produit
  - Quantité
  - Description
  - Prix unitaire
  - Poids
  - Montant total calculé

- **Calculs automatiques:**
  - Subtotal = Σ montants des items
  - Total poids = Σ poids des items
  - Frais transport/douane:
    - Aérien: poids × tarif/kg (défini dans settings)
    - Maritime: poids × tarif/cbm (défini dans settings)
  - Total général = Subtotal + Frais transport

- **Informations additionnelles:**
  - Conditions de vente (texte par défaut configurable)
  - Notes internes
  - Informations bancaires (pour paiement)

**Numérotation automatique:**
- Format: `FAC-YYYY-MMDD-NNN`
- Exemple: `FAC-2025-0123-001`
- Incrémentation automatique par jour

**Génération PDF:**
- Logo entreprise (depuis settings)
- Informations entreprise (RCCM, IDNAT, NIF)
- Détails client
- Tableau des produits
- Calculs détaillés
- Conditions de vente
- Signature/Stamp

**Actions:**
- ➕ Créer facture/devis
- ✏️ Modifier
- 👁️ Voir détails
- 📄 Télécharger PDF
- 🔄 Convertir devis en facture
- ✅ Valider
- 🗑️ Supprimer

**Permissions:**
- `factures.read` - Voir les factures
- `factures.create` - Créer
- `factures.update` - Modifier
- `factures.delete` - Supprimer

---

### 3.6 Module Paramètres

**Page:** `/settings` (Settings-Permissions.tsx)

**Sections:**

#### 3.6.1 Profil utilisateur
- Photo de profil (upload vers Supabase Storage)
- Prénom / Nom
- Email (lecture seule)
- Téléphone
- Rôle (lecture seule)

#### 3.6.2 Informations entreprise (CompanySettings)
- Nom de l'entreprise
- Logo (upload)
- RCCM (Registre de Commerce)
- IDNAT (Numéro d'identification nationale)
- NIF (Numéro d'Identification Fiscale)
- Email entreprise
- Téléphone entreprise
- Adresse
- Informations bancaires (pour factures)
- URL signature/stamp

#### 3.6.3 Taux de change
- USD → CDF (Franc Congolais)
- USD → CNY (Yuan Chinois)
- Date dernière mise à jour
- Actualisation manuelle

#### 3.6.4 Frais de transaction
- Frais transfert
- Frais commande
- Frais partenaire
- Configuration par type

#### 3.6.5 Frais de livraison (SettingsFacture)
- Tarif aérien (par kg en USD)
- Tarif maritime (par cbm en USD)
- Conditions de vente par défaut

#### 3.6.6 Moyens de paiement
- Liste des modes de paiement actifs
- Ajout/modification/suppression
- Activation/désactivation
- Code et description

#### 3.6.7 Gestion des utilisateurs (admin uniquement)
- Liste des utilisateurs
- Création compte utilisateur
- Modification rôle
- Activation/désactivation
- Attribution permissions

#### 3.6.8 Gestion des permissions
- **Modules disponibles:**
  - clients
  - transactions
  - factures
  - settings
  - payment_methods
  - activity_logs
  - profile
  - users
  - exchange_rates
  - transaction_fees

- **Permissions par module:**
  - can_read (lecture)
  - can_create (création)
  - can_update (modification)
  - can_delete (suppression)

- **Rôles prédéfinis:**
  - **Admin:** Accès complet à tout
  - **Opérateur:** Gestion quotidienne (pas de suppression, pas d'accès admin)
  - **Lecteur:** Consultation uniquement

**Permissions:**
- `settings.read` - Voir les paramètres
- `settings.update` - Modifier les paramètres
- `users.read` - Voir les utilisateurs (admin)
- `users.create` - Créer utilisateurs (admin)
- `users.update` - Modifier utilisateurs (admin)
- `exchange_rates.update` - Modifier taux (admin)
- `transaction_fees.update` - Modifier frais (admin)

---

### 3.7 Module Logs d'activité

**Page:** `/activity-logs` (ActivityLogs.tsx)

**Fonctionnalités:**
- 📋 Historique complet des actions
- 🔍 Filtrage par:
  - Utilisateur
  - Action (CREATE, UPDATE, DELETE, VIEW, etc.)
  - Cible (Client, Transaction, Facture, etc.)
  - Date
- 👤 Affichage utilisateur ayant effectué l'action
- 📅 Horodatage précis
- 📝 Détails de l'action (JSONB)
- 🔍 Recherche dans les détails

**Actions loggées:**
- Création/modification/suppression clients
- Création/modification/suppression transactions
- Validation transactions
- Création/modification/suppression factures
- Conversion devis → facture
- Modifications paramètres
- Création/modification utilisateurs

**Permissions:**
- `activity_logs.read` - Voir les logs (admin uniquement par défaut)

---

## 4. Fonctionnalités transversales

### 4.1 Système de permissions

**Architecture:**
- Permissions granulaires par module et action
- Vérification côté client (PermissionGuard)
- Vérification côté serveur (RLS Supabase)
- Héritage de rôle avec permissions personnalisables

**Composants:**
- `PermissionGuard` - Wrapper pour cacher/afficher selon permissions
- `ProtectedRouteEnhanced` - Protection des routes entières
- `usePermissions` - Hook pour vérifier permissions

**Flux:**
1. Utilisateur authentifié
2. Chargement des permissions depuis `user_permissions`
3. Vérification à chaque action/affichage
4. Application des politiques RLS côté base

### 4.2 Notifications et toasts

**Types:**
- ✅ Succès (vert)
- ❌ Erreur (rouge)
- ℹ️ Information (bleu)
- ⚠️ Avertissement (jaune)

**Déclencheurs:**
- Actions CRUD réussies
- Erreurs de validation
- Erreurs serveur
- Confirmations d'actions

**Librairie:** Sonner (react toast)

### 4.3 Pagination

**Configuration:**
- Taille de page: 10 éléments
- Navigation: Précédent/Suivant + numéros de page
- Affichage: X-Y sur Z résultats
- Mise en cache avec TanStack Query

### 4.4 Recherche et filtres

**Recherche:**
- Temps réel (debounce 300ms)
- Recherche sur champs multiples
- Mise en évidence résultats

**Filtres:**
- Statut
- Dates (du/au)
- Montants (min/max)
- Devises
- Villes
- Types

### 4.5 Import/Export

**Import CSV:**
- Clients en masse
- Transactions en masse
- Validation des données
- Rapport d'erreurs
- Gestion des doublons

**Export CSV:**
- Export sélection
- Export tout
- Format standard
- Encodage UTF-8

**Export PDF:**
- Factures individuelles
- Devis
- Rapports

### 4.6 Gestion des avatars

**Storage Supabase:**
- Bucket: `avatars`
- Accès public
- Upload direct
- Compression automatique
- Formats: JPG, PNG, WebP

---

## 5. Workflow utilisateur

### 5.1 Workflow opérateur quotidien

1. **Connexion** → Tableau de bord
2. **Client arrive:**
   - Recherche client existant
   - Si nouveau → Créer client
3. **Enregistrement transaction:**
   - Sélectionner client
   - Saisir montant + devise
   - Choisir mode paiement
   - Confirmer
4. **Validation transaction:**
   - Vérifier détails
   - Cliquer "Valider"
   - Statut passe à "Servi"
5. **Fin journée:**
   - Voir statistiques du jour
   - Export transactions si besoin

### 5.2 Workflow création facture

1. **Navigation** → `/factures/new`
2. **Sélection client**
3. **Configuration:**
   - Type (devis/facture)
   - Mode livraison
   - Devise
4. **Ajout produits:**
   - Pour chaque produit:
     - Image + URL
     - Description
     - Quantité
     - Prix unitaire
     - Poids
   - Calcul automatique montants
5. **Informations additionnelles:**
   - Conditions vente
   - Notes
   - Infos bancaires
6. **Sauvegarde**
7. **Génération PDF**
8. **Si devis → Conversion en facture quand accepté**

### 5.3 Workflow administrateur

1. **Configuration initiale:** (`/admin-setup`)
   - Création compte admin
   - Configuration entreprise
   - Paramétrage taux
2. **Gestion utilisateurs:**
   - Créer comptes opérateurs
   - Attribuer permissions
   - Définir rôles
3. **Configuration:**
   - Taux de change
   - Frais transaction
   - Frais livraison
   - Modes de paiement
4. **Monitoring:**
   - Consulter logs activité
   - Analyser statistiques
   - Vérifier transactions

---

## 6. Règles métier

### 6.1 Clients

- ✅ Nom, téléphone, ville obligatoires
- ✅ Email optionnel mais validé si présent
- ✅ Pas de doublons sur téléphone
- ✅ Historique conservé même après suppression transactions
- ✅ Total payé calculé automatiquement

### 6.2 Transactions

- ✅ Statut initial: "En attente"
- ✅ Validation requiert authentification
- ✅ Date validation enregistrée avec ID validateur
- ✅ Calculs automatiques:
  - Frais selon type transaction
  - Bénéfice = Montant - Frais
  - Conversion devises avec taux actuel
- ✅ Modification bloquée si validée (statut Servi)
- ✅ Suppression logique préférée

### 6.3 Factures

- ✅ Numérotation automatique unique
- ✅ Devis peut être converti en facture (une seule fois)
- ✅ Facture validée = immuable (ou modification limitée)
- ✅ Frais transport calculés automatiquement selon:
  - Mode livraison (aérien/maritime)
  - Poids total
  - Tarifs configurés
- ✅ Minimum 1 ligne de produit requise
- ✅ PDF généré avec toutes infos entreprise

### 6.4 Permissions

- ✅ Admin a tous les droits par défaut
- ✅ Nouvel utilisateur = rôle "operateur" par défaut
- ✅ Permissions vérifiées côté client ET serveur (RLS)
- ✅ Modules admin non accessibles aux non-admins
- ✅ Changement permissions nécessite rôle admin

### 6.5 Taux et frais

- ✅ Mise à jour manuelle uniquement
- ✅ Changement ne modifie pas transactions existantes
- ✅ Historique des taux non conservé (limitation actuelle)
- ✅ Affichage date dernière modification

---

## 7. Sécurité

### 7.1 Authentification

- 🔒 Email + mot de passe (Supabase Auth)
- 🔒 Tokens JWT avec expiration
- 🔒 Refresh automatique tokens
- 🔒 Logout sécurisé

### 7.2 Autorisations

- 🔒 Row Level Security (RLS) activée sur toutes les tables
- 🔒 Politiques basées sur `auth.uid()`
- 🔒 Vérification permissions à chaque requête
- 🔒 Isolation des données par utilisateur authentifié

### 7.3 Validation des données

- ✅ Validation côté client (react-hook-form + zod)
- ✅ Validation côté serveur (contraintes PostgreSQL)
- ✅ Sanitization des entrées
- ✅ Protection XSS
- ✅ Protection CSRF (Supabase)

### 7.4 Storage

- 🔒 Bucket avatars avec politiques d'accès
- 🔒 Upload limité à utilisateurs authentifiés
- 🔒 Taille max fichiers: 5MB
- 🔒 Types autorisés: images uniquement

---

## 8. Performance

### 8.1 Optimisations frontend

- ⚡ Code splitting par route
- ⚡ Lazy loading composants
- ⚡ Mise en cache requêtes (TanStack Query)
- ⚡ Debounce recherches
- ⚡ Pagination serveur
- ⚡ Compression assets (Vite)

### 8.2 Optimisations backend

- ⚡ Index sur colonnes fréquemment recherchées
- ⚡ Requêtes optimisées avec jointures
- ⚡ Pagination côté serveur
- ⚡ Comptage optimisé avec `count: 'exact'`

### 8.3 Monitoring

- 📊 Logs d'activité complets
- 📊 Métriques dashboard temps réel
- 📊 Détection doublons clients/transactions
- 📊 Rapports d'erreurs

---

## 9. Limitations actuelles et améliorations futures

### 9.1 Limitations connues

- ❌ Pas d'historique des taux de change
- ❌ Pas de notifications push
- ❌ Pas de rappels automatiques
- ❌ Export PDF limité (pas de templates personnalisables)
- ❌ Pas de dashboard analytique avancé
- ❌ Pas d'intégration API externes (taux en temps réel)
- ❌ Pas de mode hors ligne

### 9.2 Roadmap suggérée

**Phase 1 - Court terme:**
- [ ] Notifications email automatiques
- [ ] Templates PDF personnalisables
- [ ] Historique taux de change
- [ ] Rapports Excel avancés
- [ ] Dashboard analytics amélioré

**Phase 2 - Moyen terme:**
- [ ] API REST publique
- [ ] Intégration paiement mobile
- [ ] Application mobile (React Native)
- [ ] Synchronisation multi-devises temps réel
- [ ] Système de facturation récurrente

**Phase 3 - Long terme:**
- [ ] IA pour détection fraudes
- [ ] Prédictions tendances
- [ ] Module comptabilité complète
- [ ] Multi-entreprise (SaaS)
- [ ] Marketplace intégrée

---

## 10. Déploiement

### 10.1 Environnements

**Production:**
- Hébergement: Vercel
- Base données: Supabase Cloud
- Storage: Supabase Storage
- CDN: Vercel Edge Network

**Configuration requise:**
```env
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<key>
```

### 10.2 Build

```bash
# Développement
npm run dev

# Production
npm run build

# Preview
npm run preview
```

### 10.3 Migrations

- Scripts SQL dans `/supabase/migrations/`
- Exécution séquentielle
- Numérotation: `NNNN_description.sql`
- Rollback manuel si nécessaire

---

## 11. Maintenance

### 11.1 Backups

- ✅ Backup automatique Supabase (quotidien)
- ✅ Point-in-time recovery (PITR)
- ✅ Snapshots avant migration majeure

### 11.2 Monitoring

- 📊 Supabase Dashboard (métriques base)
- 📊 Vercel Analytics (performance frontend)
- 📊 Logs applicatifs (activity_logs table)

### 11.3 Support

**Documentation:**
- README.md (guide démarrage)
- AI_RULES.md (règles développement)
- Ce PRD (spécifications complètes)

**Logs d'erreurs:**
- Console navigateur
- Supabase logs
- Activity logs table

---

## 12. Glossaire

| Terme | Définition |
|-------|------------|
| CDF | Franc Congolais (devise) |
| CNY | Yuan Chinois (devise) |
| USD | Dollar Américain (devise) |
| RLS | Row Level Security (sécurité niveau ligne PostgreSQL) |
| RCCM | Registre de Commerce et du Crédit Mobilier |
| IDNAT | Numéro d'Identification Nationale |
| NIF | Numéro d'Identification Fiscale |
| Devis | Document commercial non facturé (peut être converti) |
| Facture | Document commercial facturé et validé |
| CBM | Cubic Meter (mètre cube pour transport maritime) |
| Aérien | Mode de livraison par avion (frais au kg) |
| Maritime | Mode de livraison par bateau (frais au cbm) |

---

## 13. Contacts et ressources

**Équipe:**
- Développement: Stack React + Supabase
- Design: Shadcn/ui + Tailwind CSS
- Base de données: PostgreSQL (Supabase)

**Ressources:**
- Repository: `CoxiPay`
- Documentation technique: `/AI_RULES.md`
- Migrations: `/supabase/migrations/`

---

**Fin du document PRD CoxiPay v1.0**

*Ce document constitue la spécification complète du produit CoxiPay à la date de janvier 2025. Il doit être mis à jour à chaque évolution majeure de l'application.*
