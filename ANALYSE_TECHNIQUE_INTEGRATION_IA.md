# ANALYSE TECHNIQUE FACTUREX - Intégration Agent IA via API

> Document généré le 17 Février 2026
> Objectif : Comprendre l'architecture technique pour connecter un agent IA externe via API

---

## 1. STACK TECHNIQUE

| Élément | Détail |
|---------|--------|
| **Framework Frontend** | React 18.3.1 |
| **Langage** | TypeScript 5.5.3 |
| **Build Tool** | Vite 6.3.4 |
| **Backend** | Supabase (BaaS - Backend as a Service) |
| **Base de données** | PostgreSQL (hébergé par Supabase) |
| **Edge Functions** | Deno (Supabase Edge Functions) |
| **UI Framework** | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| **State Management** | React Query (TanStack) v5.56 |
| **Formulaires** | React Hook Form 7.53 + Zod 3.23 |
| **Graphiques** | Recharts 2.12 |
| **Routing** | React Router DOM 6.26 |
| **PWA** | vite-plugin-pwa (Progressive Web App) |
| **PDF** | jsPDF + jspdf-autotable |
| **Excel** | xlsx 0.18 |

### Pattern Architectural
- **Pas de MVC classique** — Architecture React SPA (Single Page Application)
- Pattern : **Hooks + Services + Pages**
  - `hooks/` → Logique métier (React Query mutations/queries)
  - `services/` → Couche d'accès Supabase
  - `pages/` → Composants de page
  - `components/` → Composants UI réutilisables
  - `lib/` → Utilitaires, validation, sécurité
  - `types/` → Interfaces TypeScript

---

## 2. BASE DE DONNÉES

### Type
- **PostgreSQL** hébergé sur Supabase (projet ID: `ddnxtuhswmewoxrwswzg`)
- **ORM** : Aucun ORM traditionnel — utilise le **Supabase JS Client** (PostgREST)
- **Migrations** : Fichiers SQL dans `supabase/migrations/` (170+ migrations appliquées)

### Tables Principales (20+ tables)

| Table | Lignes | Description |
|-------|--------|-------------|
| `clients` | 109 | Clients (nom, téléphone, ville, total_payé) |
| `transactions` | 292 | Opérations financières (revenus, dépenses, transferts) |
| `factures` | 71 | Factures et devis |
| `facture_items` | 260 | Lignes de factures |
| `colis` | 155 | Colis aériens (tracking, poids, statut) |
| `colis_maritime` | 1 | Colis maritimes |
| `containers_maritime` | 1 | Containers maritimes |
| `comptes_financiers` | 4 | Comptes financiers (Cash, Airtel, M-Pesa, Illicocash) |
| `mouvements_comptes` | 289 | Historique débits/crédits sur comptes |
| `paiements` | 35 | Paiements sur factures |
| `paiements_colis` | — | Paiements sur colis |
| `organizations` | 1 | Multi-tenancy |
| `profiles` | 6 | Profils utilisateurs |
| `user_permissions` | — | Permissions granulaires |
| `settings` | 10 | Paramètres (taux de change, frais, etc.) |
| `activity_logs` | 2666 | Journal d'activité |
| `security_logs` | — | Logs de sécurité |
| `api_keys` | — | Clés API |
| `api_audit_logs` | — | Audit des appels API |
| `webhooks` | — | Configuration webhooks |
| `webhook_logs` | — | Logs d'exécution webhooks |
| `finance_categories` | 29 | Catégories financières |
| `transitaires` | — | Transitaires logistiques |
| `exchange_rate_history` | 1 | Historique taux de change |
| `pending_transactions` | 5 | Transactions en attente (agent Telegram) |
| `transaction_approvals` | — | Workflow d'approbation |

### Relations Clés
```
organizations (1) ──── (N) clients
organizations (1) ──── (N) transactions
organizations (1) ──── (N) factures
organizations (1) ──── (N) colis
clients (1) ──── (N) transactions
clients (1) ──── (N) factures
clients (1) ──── (N) colis
transactions (1) ──── (N) mouvements_comptes
comptes_financiers (1) ──── (N) mouvements_comptes
factures (1) ──── (N) facture_items
factures (1) ──── (N) paiements
```

### Triggers SQL Automatiques
Les triggers gèrent automatiquement la synchronisation des données :
- **INSERT transaction** → Met à jour solde compte + Crée mouvement(s)
- **UPDATE transaction** → Annule ancien solde + Applique nouveau
- **DELETE transaction** → Annule le solde + Supprime mouvements
- **INSERT paiement** → Met à jour solde compte + Crée mouvement
- **Auto-set organization_id** → Rempli automatiquement via le profil utilisateur

> **IMPORTANT** : Ne jamais mettre à jour manuellement les soldes des comptes via l'API. Les triggers SQL s'en chargent automatiquement lors des INSERT/UPDATE/DELETE sur `transactions`.

### Row Level Security (RLS)
- **Activé sur toutes les tables** (sauf `pending_transactions`)
- Isolation par `organization_id` (multi-tenancy)
- Chaque requête est filtrée automatiquement par l'organisation de l'utilisateur

---

## 3. AUTHENTIFICATION

### Mécanisme Principal : Supabase Auth
| Aspect | Détail |
|--------|--------|
| **Type** | JWT (JSON Web Tokens) via Supabase Auth |
| **Flow** | PKCE (Proof Key for Code Exchange) |
| **Session** | Persistée en localStorage, auto-refresh |
| **Rôles** | `super_admin`, `admin`, `operateur` (stockés dans `app_metadata`) |
| **Multi-tenancy** | Chaque utilisateur appartient à une `organization_id` |

### Authentification API (pour agents externes)
| Aspect | Détail |
|--------|--------|
| **Méthode** | API Keys (header `X-API-Key` ou `Authorization: Bearer`) |
| **Organisation** | Header `X-Organization-ID` obligatoire |
| **Types de clés** | `pk_live_` (public), `sk_live_` (secret), `ak_live_` (admin) |
| **Stockage** | Hash SHA-256 dans table `api_keys` |
| **Expiration** | Configurable (date d'expiration optionnelle) |
| **Permissions** | Granulaires par clé (ex: `read:transactions`, `write:webhooks`) |

### Middleware API
Oui, un middleware complet existe dans `supabase/functions/_shared/api-auth.ts` :
1. Extraction de la clé API depuis les headers
2. Validation du hash contre la base de données
3. Vérification de l'expiration
4. Vérification des permissions
5. Application du rate limiting
6. Logging de l'audit trail

### Gestion des Sessions (Frontend)
- Session monitoring avec expiration automatique
- Cleanup des sessions expirées
- Warning avant expiration
- Renouvellement automatique

---

## 4. API REST

### Oui, une API REST existe via Supabase Edge Functions

**Base URL** : `https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/`

### Endpoints Disponibles

#### Lecture (GET)

| Endpoint | Permission | Description | Filtres |
|----------|-----------|-------------|---------|
| `GET /api-transactions` | `read:transactions` | Liste des transactions | `status`, `currency`, `client_id`, `date_from`, `date_to`, `min_amount`, `max_amount`, `motif`, `type_transaction`, `limit`, `offset` |
| `GET /api-factures` | `read:factures` | Liste des factures/devis | `type`, `statut`, `client_id`, `date_from`, `date_to`, `include_items`, `limit`, `offset` |
| `GET /api-clients` | `read:clients` | Liste des clients | `search`, `ville`, `has_transactions`, `min_total`, `limit`, `offset` |
| `GET /api-colis` | `read:colis` | Liste des colis | `statut`, `statut_paiement`, `type_livraison`, `client_id`, `date_from`, `date_to`, `min_poids`, `tracking`, `limit`, `offset` |
| `GET /api-stats` | `read:stats` | Statistiques dashboard | `period` (24h/7d/30d/90d/custom), `date_from`, `date_to`, `group_by`, `currency` |
| `GET /api-webhooks` | `read:webhooks` | Liste des webhooks configurés | — |

#### Écriture (POST/PUT/DELETE)

| Endpoint | Méthode | Permission | Description |
|----------|---------|-----------|-------------|
| `POST /api-webhooks` | POST | `write:webhooks` | Créer un webhook |
| `PUT /api-webhooks?id=xxx` | PUT | `write:webhooks` | Modifier un webhook |
| `DELETE /api-webhooks?id=xxx` | DELETE | `write:webhooks` | Supprimer un webhook |

#### Autres Edge Functions

| Fonction | Description |
|----------|-------------|
| `webhook-processor` | Traite et envoie les webhooks (Discord, Slack, n8n, JSON) |
| `webhook-transaction` | Webhook déclenché par les événements de transaction |
| `agent-comptable` | Agent IA comptable via Telegram (enregistre dépenses/revenus) |
| `agent-comptable-cron` | Tâche CRON pour l'agent comptable |
| `admin-update-password` | Mise à jour mot de passe admin |
| `rate-limit-login` | Rate limiting côté serveur pour le login |
| `image-proxy` | Proxy d'images (protection SSRF) |

### Format de Réponse Standard
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "generated_at": "2026-02-17T10:00:00Z",
    "organization_id": "xxx",
    "response_time_ms": 45
  },
  "pagination": {
    "total": 292,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

### Format d'Erreur Standard
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

### Endpoints Manquants (à créer pour un agent IA)

| Action | Statut | Priorité |
|--------|--------|----------|
| `POST /api-transactions` (créer transaction) | ❌ N'existe pas | HAUTE |
| `POST /api-factures` (créer facture) | ❌ N'existe pas | HAUTE |
| `POST /api-colis` (créer colis) | ❌ N'existe pas | HAUTE |
| `POST /api-clients` (créer client) | ❌ N'existe pas | HAUTE |
| `PUT /api-transactions/:id` (modifier) | ❌ N'existe pas | MOYENNE |
| `DELETE /api-transactions/:id` (supprimer) | ❌ N'existe pas | BASSE |
| `GET /api-comptes` (comptes financiers) | ❌ N'existe pas | MOYENNE |
| `GET /api-mouvements` (mouvements comptes) | ❌ N'existe pas | BASSE |
| `GET /api-rapports` (rapports) | ❌ N'existe pas | MOYENNE |

> **Note** : Actuellement, l'API est **en lecture seule** (sauf pour les webhooks). Pour qu'un agent IA puisse créer des données, il faudra développer les endpoints d'écriture.

---

## 5. SÉCURITÉ

### Rate Limiting

| Couche | Implémentation | Détail |
|--------|---------------|--------|
| **API (Edge Functions)** | ✅ Upstash Redis | 100 req/h (public), 1000 req/h (secret), 5000 req/h (admin) |
| **Login (client)** | ✅ localStorage | 5 tentatives / 15 min |
| **Signup (client)** | ✅ localStorage | 3 tentatives / 1 heure |
| **Login (serveur)** | ✅ Edge Function | `rate-limit-login` |

### Protection CSRF
| Couche | Implémentation |
|--------|---------------|
| **Edge Functions** | ✅ Middleware CSRF (`csrf-middleware.ts`) — Valide Origin/Referer pour POST/PUT/DELETE |
| **Frontend** | ✅ Headers CSRF personnalisés (`X-CSRF-Token`) en production |
| **API Keys** | N/A — Les API keys remplacent CSRF pour les appels machine-to-machine |

### Validation des Inputs
| Fichier | Rôle |
|---------|------|
| `lib/validation.ts` | Schémas Zod (12KB) |
| `lib/input-validation.ts` | Validation et sanitization (11KB) |
| `lib/financial-validation-handler.ts` | Validation montants financiers |
| `lib/password-validation.ts` | Règles mot de passe |
| `lib/security/content-sanitization.ts` | Protection XSS |
| `lib/security/input-validation.ts` | Validation sécurisée |
| `lib/security/field-level-security.ts` | Sécurité au niveau des champs |
| **SQL CHECK constraints** | Validation côté DB (montants, devises, statuts) |
| **SQL function** | `validate_financial_amounts()` — Validation serveur |

### Logs d'Actions
| Table | Description | Lignes |
|-------|-------------|--------|
| `activity_logs` | Journal d'activité utilisateur (CRUD) | 2666+ |
| `security_logs` | Événements de sécurité (login, permission denied, etc.) | — |
| `api_audit_logs` | Audit de chaque appel API (endpoint, status, response time, IP) | — |
| `webhook_logs` | Logs d'exécution des webhooks | — |

### Autres Mesures de Sécurité
- **Content Security Policy (CSP)** : Configuré dans `index.html`
- **XSS Protection** : `lib/xss-protection.ts` + sanitization
- **SSRF Protection** : `_shared/ssrf-protection.ts` pour le proxy d'images
- **Session Management** : Expiration, monitoring, cleanup automatique
- **RLS (Row Level Security)** : Isolation des données par organisation
- **PKCE Auth Flow** : Protection contre les attaques d'interception
- **API Key Hashing** : SHA-256, jamais stocké en clair

---

## 6. MODULES FONCTIONNELS

### Modules Principaux

| Module | Pages | Description |
|--------|-------|-------------|
| **Dashboard** | `/` | Tableau de bord avec KPIs, graphiques, activité récente |
| **Clients** | `/clients` | CRUD clients, historique, factures impayées, recherche |
| **Factures** | `/factures`, `/factures/new`, `/factures/view/:id`, `/factures/preview/:id` | Création, édition, aperçu, PDF, validation, paiements partiels |
| **Colis Aériens** | `/colis/aeriens`, `/colis/aeriens/nouveau` | Suivi colis Chine→Congo, tracking, statuts, poids, tarifs |
| **Colis Maritime** | `/colis/maritime` | Containers, CBM, suivi maritime |
| **Transactions** | `/transactions` | Revenus, dépenses, transferts (swaps), multi-devises (USD/CDF/CNY) |
| **Comptes Financiers** | `/comptes` | 4 comptes (Cash, Airtel Money, M-Pesa, Illicocash), soldes temps réel |
| **Catégories Finances** | `/finances/categories` | 29 catégories (revenus + dépenses) |
| **Statistiques Finance** | `/finances/statistiques` | Graphiques, tendances, analyses par période |
| **Rapports** | `/rapports` | Rapports financiers, export PDF/Excel |
| **Paramètres** | `/settings` | Taux de change, frais, profil, permissions |
| **API Keys** | `/api-keys` | Gestion des clés API (public, secret, admin) |
| **Webhooks** | `/webhooks` | Configuration webhooks (Discord, Slack, n8n) |
| **Logs d'Activité** | `/activity-logs` | Journal complet des actions utilisateur |
| **Security Dashboard** | `/security-dashboard` | Monitoring sécurité, alertes, audit trail |
| **Permissions** | `/settings` (onglet) | Gestion granulaire des permissions par rôle |

### Agent IA Comptable (Telegram)
- Edge Function `agent-comptable` connectée à un bot Telegram
- Permet d'enregistrer des dépenses/revenus par message texte
- Parsing NLP des montants, devises, motifs
- Confirmation interactive via boutons Telegram
- CRON automatique pour rappels

### Système de Webhooks
- Événements supportés : `transaction.created`, `transaction.validated`, `transaction.deleted`, `facture.created`, `facture.validated`, `facture.paid`, `client.created`, `client.updated`, `colis.created`, `colis.delivered`, `colis.status_changed`
- Formats : JSON, Discord, Slack, n8n
- Signature HMAC pour vérification
- Retry automatique avec compteur d'échecs

---

## 7. ARCHITECTURE

### Type : Application Hybride (SPA + BaaS)

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (SPA)                     │
│  React 18 + TypeScript + Vite + Tailwind + shadcn/ui │
│  Hébergé sur : Vercel / Easypanel                     │
│  Port : 8080 (dev) / 3000 (preview)                  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS (Supabase JS Client)
                       ▼
┌─────────────────────────────────────────────────────┐
│                  SUPABASE (BaaS)                      │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Auth (JWT)  │  │  PostgREST   │  │  Realtime    │ │
│  │  PKCE Flow   │  │  (REST API)  │  │  (WebSocket) │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Edge Funcs  │  │  PostgreSQL  │  │  Storage     │ │
│  │  (Deno)      │  │  (RLS + SQL) │  │  (Images)    │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
                       ▲
                       │ API Keys + HTTPS
                       │
┌─────────────────────────────────────────────────────┐
│              INTÉGRATIONS EXTERNES                    │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Discord  │  │  n8n     │  │ Telegram │           │
│  │ Webhooks │  │ Webhooks │  │ Bot Agent│           │
│  └──────────┘  └──────────┘  └──────────┘           │
│                                                       │
│  ┌──────────────────────────────────────┐            │
│  │         AGENT IA (À CONNECTER)       │            │
│  │  Via Edge Functions API + API Keys   │            │
│  └──────────────────────────────────────┘            │
└─────────────────────────────────────────────────────┘
```

### Séparation Frontend/Backend
- **Frontend** : SPA React déployée sur Vercel/Easypanel (statique)
- **Backend** : Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- **Pas de serveur Node/Express/Django** — tout passe par Supabase

### API Publique ou Interne ?
- **API interne** : Le frontend communique directement avec Supabase via le JS Client (anon key + JWT)
- **API externe** : Les Edge Functions `api-*` sont des endpoints REST publics sécurisés par API Keys
- L'API externe est **conçue pour les intégrations** (n8n, Discord, agents IA)

---

## 8. RISQUES ET RECOMMANDATIONS POUR L'INTÉGRATION IA

### Risques Identifiés

#### CRITIQUE
| Risque | Description | Impact |
|--------|-------------|--------|
| **Pas d'endpoints d'écriture** | L'API actuelle est en lecture seule (sauf webhooks). Un agent IA ne peut pas créer de transactions, factures ou colis. | Bloquant |
| **Triggers SQL sensibles** | Les triggers auto-mettent à jour les soldes. Un INSERT mal formé peut corrompre les soldes de tous les comptes. | Corruption financière |
| **Pas de sandbox/staging** | Il n'y a qu'un seul environnement (production). Un agent IA bugué impacte directement les données réelles. | Perte de données |

#### ÉLEVÉ
| Risque | Description | Impact |
|--------|-------------|--------|
| **Rate limiting Redis optionnel** | Si Upstash Redis n'est pas configuré, le rate limiting est désactivé. Un agent IA pourrait faire des milliers de requêtes. | Surcharge |
| **Pas de validation côté API** | Les endpoints GET n'ont pas de validation Zod des paramètres. Un agent pourrait envoyer des données malformées. | Erreurs silencieuses |
| **CORS ouvert (`*`)** | Les Edge Functions acceptent toutes les origines. | Exposition |
| **Suppression en cascade** | Supprimer un client pourrait impacter factures, transactions, colis liés. | Perte de données |

#### MOYEN
| Risque | Description | Impact |
|--------|-------------|--------|
| **Pas de versioning API** | Pas de `/v1/` dans les URLs. Un changement de schéma casse les intégrations. | Breaking changes |
| **Pas de mode dry-run** | Impossible de tester une opération sans l'exécuter réellement. | Erreurs irréversibles |
| **Logs insuffisants** | Les `api_audit_logs` loggent les appels mais pas le contenu des requêtes. | Debugging difficile |

### Endpoints Dangereux

| Endpoint (à créer) | Danger | Raison |
|---------------------|--------|--------|
| `DELETE /api-transactions/:id` | ⚠️ TRÈS DANGEREUX | Déclenche des triggers qui modifient les soldes des comptes |
| `POST /api-transactions` | ⚠️ DANGEREUX | Peut créer des mouvements financiers incorrects si mal paramétré |
| `DELETE /api-clients/:id` | ⚠️ DANGEREUX | Cascade sur factures, transactions, colis |
| `PUT /api-factures/:id` | ⚠️ MOYEN | Peut modifier des montants validés |
| `DELETE /api-webhooks/:id` | ✅ Existant, risque faible | Supprime une configuration webhook |

### Recommandations pour Sécuriser l'API IA

#### 1. Créer un type de clé API dédié IA
```
Type: ai_agent
Prefix: ai_live_
Permissions: Restreintes et explicites
Rate limit: 200 req/h (entre public et secret)
```

#### 2. Implémenter des endpoints d'écriture sécurisés
- Validation Zod stricte sur chaque champ
- Vérification des contraintes métier (ex: montant > 0, devise valide)
- Retourner l'objet créé pour confirmation
- Logger chaque action avec `created_by: 'ai_agent'`

#### 3. Ajouter un mode "dry-run"
```
POST /api-transactions?dry_run=true
→ Valide les données sans les insérer
→ Retourne ce qui serait créé
```

#### 4. Implémenter un workflow d'approbation
- L'agent IA crée des transactions avec `statut: 'En attente'`
- Un humain valide via l'interface web
- La table `transaction_approvals` existe déjà pour ça

#### 5. Créer un environnement de staging
- Utiliser les Supabase Branches (dev branch)
- L'agent IA teste d'abord sur staging avant production

#### 6. Restreindre les permissions IA
```json
{
  "permissions": [
    "read:transactions",
    "read:clients",
    "read:factures",
    "read:colis",
    "read:stats",
    "write:transactions",  // Avec statut 'En attente' obligatoire
    "write:clients"        // Création uniquement, pas de suppression
  ]
}
```

#### 7. Ajouter des limites métier
- Montant max par transaction IA : configurable (ex: $10,000)
- Nombre max de créations par jour : configurable
- Alerte automatique si seuil dépassé
- Blocage automatique si anomalie détectée

#### 8. Versionner l'API
```
/functions/v1/api-transactions
/functions/v1/api-clients
```

#### 9. Améliorer le logging
- Logger le body complet des requêtes POST/PUT
- Ajouter un champ `source: 'ai_agent'` dans les logs
- Dashboard de monitoring dédié pour l'agent IA

#### 10. Implémenter des webhooks de confirmation
- L'agent IA reçoit un webhook quand sa transaction est validée/rejetée
- Boucle de feedback pour l'apprentissage

---

## RÉSUMÉ EXÉCUTIF

| Critère | État | Note |
|---------|------|------|
| API REST existante | ✅ Oui (lecture seule) | 6 endpoints GET |
| Authentification API | ✅ Oui (API Keys) | 3 types de clés |
| Rate Limiting | ✅ Oui (si Redis configuré) | Upstash |
| Endpoints d'écriture | ❌ À créer | Priorité HAUTE |
| Validation des inputs | ⚠️ Partielle | Côté DB oui, côté API insuffisant |
| Audit trail | ✅ Oui | `api_audit_logs` |
| Multi-tenancy | ✅ Oui | Isolation par `organization_id` |
| Webhooks | ✅ Oui | Discord, Slack, n8n, JSON |
| Environnement staging | ❌ Non | À créer |
| Mode dry-run | ❌ Non | À implémenter |
| Workflow approbation | ⚠️ Partiel | Table existe, logique à compléter |

### Effort Estimé pour l'Intégration IA

| Tâche | Effort |
|-------|--------|
| Créer endpoints POST (transactions, factures, colis, clients) | 2-3 jours |
| Ajouter validation Zod côté API | 1 jour |
| Implémenter mode dry-run | 0.5 jour |
| Créer type de clé API `ai_agent` | 0.5 jour |
| Workflow d'approbation complet | 1-2 jours |
| Tests et documentation API | 1 jour |
| **Total estimé** | **5-8 jours** |

---

*Document de référence pour l'intégration d'un agent IA avec FactureX.*
*Basé sur l'analyse du code source au 17/02/2026.*
