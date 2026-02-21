# FACTUREX – Documentation Fonctionnelle

> **Version** : 1.0.2  
> **Dernière mise à jour** : 17 Février 2026  
> **Audience** : Développeurs, agents IA, ingénieurs externes  
> **Stack** : React 18 + TypeScript / Vite 6 / Supabase (PostgreSQL) / Tailwind CSS + shadcn/ui

---

## 1. Vision Générale

### 1.1 Pourquoi l'application a été créée ?

FactureX a été conçu pour centraliser et automatiser la gestion financière, logistique et commerciale d'une entreprise d'import-export opérant entre la **Chine** et le **Congo (RDC)**. Avant FactureX, les opérations étaient gérées manuellement (cahiers, Excel, WhatsApp), entraînant :

- Des erreurs de calcul sur les taux de change et commissions
- Une perte de traçabilité sur les colis et paiements
- L'impossibilité de générer des rapports financiers fiables
- Un manque de contrôle multi-utilisateurs et de sécurité

### 1.2 Quel problème elle résout ?

FactureX résout **5 problèmes critiques** :

| Problème | Solution FactureX |
|----------|-------------------|
| Suivi des transferts d'argent Chine↔Congo | Module Transactions avec conversion automatique USD/CNY/CDF |
| Facturation et encaissements clients | Module Factures avec devis, paiements partiels, PDF |
| Suivi des colis (aérien + maritime) | Modules Colis avec statuts, transitaires, paiements |
| Comptabilité multi-comptes | Comptes financiers avec soldes auto-synchronisés par triggers SQL |
| Contrôle d'accès et audit | RBAC granulaire (super_admin/admin/opérateur) + logs d'activité |

### 1.3 Pour quelle entreprise ?

**Coccinelle SARL** – Entreprise congolaise spécialisée dans :
- L'import de marchandises depuis la Chine (produits divers, systèmes solaires, GPS, etc.)
- Les transferts d'argent internationaux (USD → CNY)
- La logistique aérienne et maritime (Chine → Congo)
- La revente locale avec facturation

Le slogan de l'application : **"Transferts simplifiés"**.

---

## 2. Modules Principaux

### 2.1 Gestion Clients

**Route** : `/clients`  
**Hook principal** : `useClients.ts`  
**Table DB** : `clients`

#### Fonctionnalités
- Création, modification, suppression de clients
- Recherche en temps réel (nom, téléphone, ville) via `ClientCombobox`
- Historique complet d'un client (`useClientHistory`)
- Factures impayées par client (`useClientUnpaidFactures`)
- Pagination côté serveur (10 par page)
- Export CSV

#### Données stockées

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique |
| `nom` | text | Nom complet du client |
| `telephone` | text | Numéro de téléphone |
| `ville` | text | Ville du client |
| `pays` | text | Pays (optionnel) |
| `total_paye` | numeric | Total cumulé des paiements |
| `organization_id` | UUID | Isolation multi-tenant |

#### Actions possibles
- **Créer** un client (nom, téléphone, ville requis)
- **Modifier** les informations
- **Supprimer** (avec vérification des dépendances : factures, colis, transactions)
- **Voir l'historique** : toutes les transactions, factures et colis liés
- **Voir les factures impayées** : liste des factures en attente de paiement

---

### 2.2 Gestion Factures

**Routes** : `/factures`, `/factures/new`, `/factures/edit/:id`, `/factures/view/:id`, `/factures/preview/:id`  
**Hook principal** : `useFactures.ts` (544 lignes)  
**Tables DB** : `factures`, `facture_items`

#### Création

Une facture est composée de :
1. **En-tête** : client, type (devis/facture), mode livraison (aérien/maritime), devise, date
2. **Lignes d'articles** (`facture_items`) : description, quantité, prix unitaire, poids, image URL, product URL
3. **Calculs automatiques** :
   - `subtotal` = Σ (quantité × prix_unitaire) de chaque item
   - `frais` = subtotal × taux_commission (par défaut **15%**, configurable dans Settings)
   - `frais_transport_douane` = poids_total × tarif/kg (aérien: **$16/kg**, maritime: **$450/CBM**)
   - `total_general` = subtotal + frais + frais_transport_douane

Les totaux peuvent être **personnalisés manuellement** lors de la création/modification.

#### Statuts

```
brouillon → en_attente → validee → payee
                                  → annulee
```

| Statut | Description |
|--------|-------------|
| `brouillon` | Facture en cours de rédaction |
| `en_attente` | Envoyée au client, en attente de validation |
| `validee` | Approuvée, prête pour paiement |
| `payee` | Entièrement payée |
| `annulee` | Annulée |

#### Paiements (Encaissements)

Les paiements sur factures sont gérés via le module **Paiements** (`usePaiements.ts`) :
- Un paiement est lié à une facture via `facture_id`
- Paiements **partiels** supportés (montant minimum : $0.01)
- Chaque paiement crédite automatiquement un **compte financier**
- Statut paiement facture : `non_paye` → `partiellement_payee` → `payee`

#### Conversion Devis → Facture

La fonction `convertToFacture()` permet de transformer un devis en facture validée en un clic, avec horodatage et identifiant du validateur.

#### Lien avec clients

Chaque facture est liée à un client via `client_id`. La relation est `INNER JOIN` : une facture **doit** avoir un client.

#### Génération PDF

Les factures peuvent être visualisées et exportées en PDF via la page `/factures/preview/:id`, utilisant `jsPDF` + `jspdf-autotable`.

---

### 2.3 Gestion Transactions

**Route** : `/transactions` (page unifiée, anciennement séparée en operations-financieres et encaissements)  
**Hooks** : `useTransactions.ts`, `useFinancialOperations.ts`, `transactions/calculations.ts`  
**Table DB** : `transactions`

#### Types de transactions

| Type | Description | Impact comptable |
|------|-------------|------------------|
| `revenue` | Entrée d'argent (commande client, transfert reçu) | Crédite le compte destination |
| `depense` | Sortie d'argent (achat, loyer, salaire, etc.) | Débite le compte source |
| `transfert` | Swap entre comptes / devises (ex: USD→CNY) | Débite source + Crédite destination |

#### Motifs commerciaux (transactions avec client)

| Motif | Frais appliqués | Description |
|-------|----------------|-------------|
| `Commande (Facture)` | **15%** commission | Client passe une commande d'import |
| `Transfert (Argent)` | **5%** commission | Client envoie de l'argent en Chine |
| `Transfert Reçu` | **5%** commission | Argent reçu d'un transfert |

#### Calculs automatiques (fichier `calculations.ts`)

Pour chaque transaction de type `revenue` :

```
frais_USD = montant × (taux_frais / 100)
commission_partenaire = montant × 3%
bénéfice = frais_USD - commission_partenaire
montant_net = montant - frais_USD
montant_CNY = montant_net × taux_USD_CNY
```

Pour les `depenses` : frais, bénéfice et montant_CNY restent à 0.  
Pour les `paiement colis` : aucun frais ni conversion.

#### Catégories financières

Les transactions peuvent être classées dans des **catégories personnalisables** (module `/finances/categories`), avec icône et couleur. Exemples : Transport, Personnel, Électricité, Business, etc.

#### Lien avec factures

Les transactions de type `revenue` avec motif `Commande (Facture)` sont liées aux factures clients. Le champ `colis_id` permet aussi de lier une transaction à un colis spécifique.

#### Triggers SQL automatiques

**IMPORTANT** : Les soldes des comptes et les mouvements sont gérés **automatiquement par des triggers SQL** côté base de données. Le code JavaScript ne doit **jamais** mettre à jour les soldes manuellement pour les transactions (seulement pour les encaissements via `useFinancialOperations`).

| Trigger | Événement | Action |
|---------|-----------|--------|
| `trigger_update_compte_after_insert` | INSERT transaction | Met à jour le solde du compte |
| `trigger_revert_compte_before_update` | UPDATE transaction | Annule l'ancien impact |
| `trigger_update_compte_after_update` | UPDATE transaction | Applique le nouveau impact |
| `trigger_revert_compte_after_transaction_delete` | DELETE transaction | Inverse le solde |
| `trigger_create_mouvement_after_transaction_insert` | INSERT transaction | Crée le mouvement comptable |
| `trigger_delete_mouvements_before_transaction_delete` | DELETE transaction | Supprime les mouvements |

---

### 2.4 Gestion Colis

FactureX gère deux types de colis correspondant aux deux modes de livraison depuis la Chine.

#### 2.4.1 Colis Aériens

**Routes** : `/colis/aeriens`, `/colis/aeriens/nouveau`, `/colis/aeriens/:id/modifier`  
**Hooks** : `useColis.ts`, `useColisList.ts`, `useDeleteColis.ts`, `useUpdateColisStatut.ts`  
**Table DB** : `colis`

##### Données stockées

| Champ | Type | Description |
|-------|------|-------------|
| `client_id` | UUID | Client propriétaire |
| `fournisseur` | text | Fournisseur en Chine |
| `tracking_chine` | text | Numéro de suivi chinois |
| `numero_commande` | text | Référence commande |
| `quantite` | integer | Nombre de colis |
| `poids` | numeric | Poids total en kg |
| `tarif_kg` | numeric | Tarif par kilogramme |
| `montant_a_payer` | numeric | = poids × tarif_kg (auto-calculé) |
| `transitaire_id` | UUID | Transitaire assigné |
| `statut` | enum | Statut logistique |
| `statut_paiement` | enum | Statut financier |

##### Cycle de vie (statuts)

```
en_preparation → expedie_chine → en_transit → arrive_congo → recupere_client → livre
```

##### Statuts de paiement

```
non_paye → partiellement_paye → paye
```

Les paiements sur colis sont gérés via le module Paiements (`type_paiement: 'colis'`), avec support des paiements partiels.

#### 2.4.2 Colis Maritimes

**Route** : `/colis/maritime`  
**Hooks** : `useColisMaritime.ts`, `useContainersMaritime.ts`  
**Tables DB** : `colis_maritime`, `containers_maritime`

##### Spécificités maritimes

- Tarification en **CBM** (mètre cube) au lieu du kg
- Gestion des **containers** : numéro, bateau, numéro de voyage, transitaire
- Un container contient plusieurs colis maritimes
- Dates : réception Chine → chargement → arrivée → livraison

##### Données colis maritime

| Champ | Type | Description |
|-------|------|-------------|
| `cbm` | numeric | Volume en mètres cubes |
| `poids` | numeric | Poids en kg |
| `tarif_cbm` | numeric | Tarif par CBM |
| `montant_total` | numeric | = cbm × tarif_cbm |
| `container_id` | UUID | Container associé |
| `photos` | text[] | Photos du colis |

#### 2.4.3 Transitaires

**Table DB** : `transitaires`

Les transitaires sont les partenaires logistiques qui gèrent le transport :

| Champ | Description |
|-------|-------------|
| `nom` | Nom du transitaire |
| `specialisation_chine` | Spécialisé route Chine |
| `specialisation_congo` | Spécialisé route Congo |
| `delai_moyen_livraison` | Délai moyen en jours |
| `tarif_base` | Tarif de base |
| `services_offerts` | Liste des services |

---

### 2.5 Comptabilité & Rapports

#### 2.5.1 Comptes Financiers

**Route** : `/comptes`  
**Hook** : `useComptesFinanciers.ts`  
**Table DB** : `comptes_financiers`

Gestion des comptes de trésorerie de l'entreprise :

| Type de compte | Exemples |
|----------------|----------|
| `mobile_money` | Airtel Money, M-Pesa, Illicocash |
| `banque` | Compte bancaire |
| `cash` | Cash Bureau |

Chaque compte a :
- Un **solde actuel** (`solde_actuel`) synchronisé automatiquement par les triggers SQL
- Une **devise** (USD, CDF ou CNY)
- Un statut actif/inactif

#### 2.5.2 Mouvements de Comptes

**Table DB** : `mouvements_comptes`  
**Hook** : `useMouvementsComptes.ts`

Chaque opération financière génère un **mouvement** traçable :

| Champ | Description |
|-------|-------------|
| `type_mouvement` | `debit` ou `credit` |
| `montant` | Montant du mouvement |
| `solde_avant` | Solde du compte avant l'opération |
| `solde_apres` | Solde du compte après l'opération |
| `description` | Description textuelle |
| `transaction_id` | Transaction liée |

Cela fournit un **audit trail comptable complet** avec historique des soldes.

#### 2.5.3 Statistiques Financières

**Route** : `/finances/statistiques`  
**Hook** : `useFinanceStatsByPeriod.ts`

Vue d'ensemble par période (journalier, hebdomadaire, mensuel, annuel) :
- **Revenus totaux** avec variation en %
- **Dépenses totales** avec variation en %
- **Transferts/Swaps** : volume des échanges inter-comptes
- **Solde Net** : Revenus - Dépenses (bénéfice ou perte)
- Export PDF du rapport avec `generateFinanceReportPDF()`

#### 2.5.4 Rapports Financiers

**Route** : `/rapports`  
**Service** : `reportService.ts`

Génération de bilans financiers sur une période personnalisée :
- **Recettes totales** ventilées par devise (USD, CDF, CNY)
- **Dépenses totales** ventilées par devise
- **Volume d'activité** : nombre de transactions
- **Tableau détaillé** des transactions avec pagination
- **Export PDF** (jsPDF + autotable)
- **Export Excel** (xlsx)

#### 2.5.5 Agent IA Comptable

**Hook** : `useComptabiliteAI.ts`

Un agent IA silencieux qui tourne en arrière-plan et envoie des **alertes Telegram** :

| Alerte | Condition | Message |
|--------|-----------|---------|
| Dépenses en attente | ≥ 3 dépenses non validées | "Tu as X dépenses à valider" |
| Réconciliation urgente | ≥ 3 jours sans mouvement | "Ta dernière réconciliation date de X jours" |

Vérification quotidienne à **18h00**. Configurable via variables d'environnement (`VITE_TELEGRAM_BOT_TOKEN`, `VITE_TELEGRAM_CHAT_ID`).

---

### 2.6 Modules Spécifiques Coccinelle SARL

#### 2.6.1 Import Chine (Module principal)

Le cœur de métier de Coccinelle SARL. Le flux complet :

```
1. Client passe commande → Facture créée (type: facture, motif: Commande)
2. Paiement client → Encaissement sur compte (commission 15%)
3. Montant net converti en CNY → Transfert vers fournisseur Chine
4. Fournisseur expédie → Colis créé (aérien ou maritime)
5. Colis en transit → Suivi des statuts
6. Arrivée Congo → Client récupère → Statut "livré"
```

#### 2.6.2 Transferts d'Argent (Chine ↔ Congo)

Service de transfert d'argent international :
- Client dépose USD → Conversion en CNY au taux du jour
- Commission de **5%** sur le montant
- Commission partenaire de **3%** déduite du bénéfice
- Support des 6 paires de devises : USD↔CNY, USD↔CDF, CNY↔CDF

#### 2.6.3 Swap Inter-Comptes

Échange de devises entre comptes internes (sans client) :
- Transfert entre comptes de devises différentes
- Utilise le type `transfert` avec `compte_source_id` et `compte_destination_id`
- Le champ `montant_converti` stocke le montant dans la devise de destination
- Les triggers gèrent automatiquement les débits/crédits

#### 2.6.4 Système de Tarification

Tarifs configurables dans les **Settings** :

| Paramètre | Valeur par défaut | Catégorie |
|-----------|-------------------|-----------|
| Taux USD → CNY | 6.95 | `taux_change` |
| Taux USD → CDF | 2,200 | `taux_change` |
| Frais transfert | 5% | `frais` |
| Frais commande | 15% | `frais` |
| Commission partenaire | 3% | `frais` |
| Frais aérien/kg | $16 | `shipping` |
| Frais maritime/CBM | $450 | `shipping` |

---

## 3. Flux de Données

### 3.1 Comment une dépense impacte les rapports ?

```
[Utilisateur crée une dépense]
        │
        ▼
INSERT INTO transactions (type_transaction='depense', montant, compte_source_id)
        │
        ├──► TRIGGER: trigger_update_compte_after_insert
        │       └──► UPDATE comptes_financiers SET solde_actuel = solde_actuel - montant
        │
        ├──► TRIGGER: trigger_create_mouvement_after_transaction_insert
        │       └──► INSERT INTO mouvements_comptes (type='debit', solde_avant, solde_apres)
        │
        └──► React Query invalidation
                ├──► Rafraîchissement page Transactions
                ├──► Rafraîchissement page Comptes (nouveau solde)
                ├──► Rafraîchissement page Mouvements
                └──► Rafraîchissement Statistiques & Rapports
```

**Impact sur les rapports** : La dépense apparaît dans :
- Statistiques → carte "Dépenses" (augmente)
- Statistiques → carte "Solde Net" (diminue)
- Rapports → "Dépenses Totales" par devise
- Mouvements → ligne de débit avec solde avant/après

### 3.2 Comment une facture impacte le cashflow ?

```
[Création facture]                    [Encaissement]
        │                                    │
        ▼                                    ▼
INSERT factures                    INSERT paiements (montant_paye, compte_id)
(statut: brouillon)                         │
        │                                   ├──► UPDATE comptes_financiers (solde +montant)
        ▼                                   ├──► INSERT mouvements_comptes (credit)
Pas d'impact financier             ├──► UPDATE facture statut_paiement
immédiat                                    │
                                            └──► Cashflow impacté :
                                                 ✅ Solde compte augmente
                                                 ✅ Mouvement crédit enregistré
                                                 ✅ Statistiques revenus augmentent
```

**Cycle complet** :
1. Facture créée → **Aucun impact** sur le cashflow
2. Facture validée → **Aucun impact** (juste un changement de statut)
3. Encaissement partiel → **Cashflow +montant_paye**, statut `partiellement_payee`
4. Encaissement total → **Cashflow +reste**, statut `payee`

### 3.3 Comment les colis impactent le stock et les finances ?

```
[Colis créé]
     │
     ├──► montant_a_payer = poids × tarif_kg (calculé automatiquement)
     │    statut_paiement = 'non_paye'
     │
     ▼
[Paiement colis]
     │
     ├──► INSERT paiements (type_paiement='colis', colis_id)
     ├──► UPDATE comptes_financiers (solde +montant_paye)
     ├──► INSERT mouvements_comptes (credit)
     └──► UPDATE colis statut_paiement
              │
              ├── Si montant_paye < montant_a_payer → 'partiellement_paye'
              └── Si montant_paye ≥ montant_a_payer → 'paye'
```

> **Note** : FactureX ne gère pas de stock physique (inventaire). Les colis représentent des **expéditions en cours**, pas un stock en entrepôt. Le "stock" est implicitement le nombre de colis avec statut `arrive_congo` ou `recupere_client`.

---

## 4. Règles Métier Importantes

### 4.1 Calcul de marge (bénéfice)

Pour chaque transaction commerciale (revenue) :

```
Bénéfice = Frais_client - Commission_partenaire
         = (montant × taux_frais%) - (montant × 3%)
```

**Exemple** : Client envoie $1,000 via transfert (frais 5%)
- Frais client : $1,000 × 5% = **$50**
- Commission partenaire : $1,000 × 3% = **$30**
- **Bénéfice net : $20**

**Exemple** : Client commande $1,000 d'import (frais 15%)
- Frais client : $1,000 × 15% = **$150**
- Commission partenaire : $1,000 × 3% = **$30**
- **Bénéfice net : $120**

### 4.2 Gestion TVA

FactureX **ne gère pas la TVA** actuellement. Tous les montants sont TTC. Les frais de commission et de transport sont des frais de service, pas des taxes.

### 4.3 Validation avant suppression

| Entité | Règle de suppression |
|--------|---------------------|
| Client | Vérification des factures, colis et transactions liés |
| Facture | Suppression des `facture_items` associés (cascade) |
| Transaction | Triggers SQL inversent automatiquement les soldes |
| Encaissement | Inversion du crédit sur le compte + mouvement d'annulation |
| Colis | Vérification des paiements liés |

### 4.4 Règles critiques

| Règle | Description |
|-------|-------------|
| **Montant minimum** | $0.01 pour paiements et transactions |
| **Montant maximum** | $999,999,999.99 |
| **Solde compte** | Peut être négatif (pas de blocage) |
| **Multi-tenancy** | Toutes les données isolées par `organization_id` |
| **Triggers SQL** | NE JAMAIS mettre à jour les soldes manuellement dans le code JS pour les transactions |
| **Devise obligatoire** | Chaque transaction et facture doit avoir une devise (USD, CDF ou CNY) |
| **Numéro facture** | Généré automatiquement par la base de données |
| **Taux de change** | Stockés dans la table `settings`, synchronisés au démarrage |

### 4.5 Workflow de validation (Approval)

Les transactions de montant élevé peuvent nécessiter une **approbation** :
- Table `transaction_approvals` avec niveaux d'approbation
- Statuts : `pending` → `approved` / `rejected`
- Hook : `useApprovalWorkflow.ts`

---

## 5. Points Sensibles

### 5.1 Données financières

| Risque | Protection |
|--------|-----------|
| Accès non autorisé aux finances | Module `finances` restreint par permissions RBAC |
| Manipulation des soldes | Triggers SQL côté serveur (pas de mise à jour client-side) |
| Incohérence des soldes | Validation automatique + réconciliation périodique |
| Données inter-organisations | RLS policies avec `organization_id` sur TOUTES les tables |
| Montants invalides | Validation Zod + fonction SQL `validate_financial_amounts()` |

### 5.2 Accès admin

| Rôle | Accès |
|------|-------|
| `super_admin` | Accès complet illimité, gestion utilisateurs, logs sécurité |
| `admin` | Accès complet sauf suppression et logs sécurité |
| `operateur` | Clients + Factures + Colis uniquement. **PAS d'accès aux Finances** |

**Compte admin principal** : Le rôle est stocké dans `auth.users.raw_app_meta_data.role` (server-controlled, non modifiable côté client).

**Permissions granulaires** par module :
- `can_read` / `can_create` / `can_update` / `can_delete`
- 13 modules : clients, finances, factures, colis, settings, payment_methods, exchange_rates, transaction_fees, activity_logs, reports, users, profile, security_logs

### 5.3 Endpoints et fonctions sensibles

#### Edge Functions Supabase (Deno)

| Fonction | Risque | Protection |
|----------|--------|-----------|
| `admin-update-password` | Changement de mot de passe admin | JWT requis + vérification rôle |
| `agent-comptable` | Accès aux données financières | JWT requis |
| `api-transactions` | CRUD transactions via API | API Key + JWT |
| `api-clients` | CRUD clients via API | API Key + JWT |
| `api-factures` | CRUD factures via API | API Key + JWT |
| `api-colis` | CRUD colis via API | API Key + JWT |
| `api-stats` | Statistiques financières | API Key + JWT |
| `webhook-processor` | Traitement webhooks entrants | Signature vérifiée |
| `webhook-transaction` | Notification sur transaction | Signature vérifiée |
| `image-proxy` | Proxy d'images (anti-SSRF) | Validation URL |
| `rate-limit-login` | Rate limiting connexion | Upstash Redis |

#### Protections de sécurité

| Protection | Implémentation |
|-----------|----------------|
| **CSP** | Content-Security-Policy strict dans `index.html` |
| **Rate Limiting** | Client-side (localStorage) : 5 tentatives login / 15 min |
| **XSS** | Sanitization via `content-sanitization.ts` |
| **CSRF** | Protection CSRF dans `lib/security/` |
| **Input Validation** | Zod schemas + `input-validation.ts` |
| **Activity Logging** | Toutes les actions CRUD loguées dans `activity_logs` |
| **Security Logging** | Événements critiques dans `security_logs` |
| **Password Policy** | Validation robustesse mot de passe |

---

## 6. Cas d'Usage Réels

### 6.1 Ajouter une dépense import

**Scénario** : L'entreprise paie $500 de frais de douane.

1. Aller dans **Finances → Transactions**
2. Cliquer **"+ Nouvelle transaction"**
3. Remplir :
   - Type : `Dépense`
   - Motif : "Frais de douane import"
   - Montant : 500
   - Devise : USD
   - Compte source : Cash Bureau
   - Catégorie : Transport
4. Valider

**Résultat automatique** :
- Transaction créée avec `type_transaction: 'depense'`
- Trigger SQL : solde Cash Bureau **-$500**
- Mouvement créé : débit $500, solde_avant → solde_apres
- Statistiques : Dépenses +$500, Solde Net -$500

---

### 6.2 Créer une facture pour une commande client

**Scénario** : Client "Jean Mutombo" commande 3 articles depuis la Chine, livraison aérienne.

1. Aller dans **Factures → Nouvelle facture**
2. Sélectionner le client "Jean Mutombo"
3. Choisir : Type `Facture`, Mode `Aérien`, Devise `USD`
4. Ajouter les articles :
   - Téléphone Samsung : 1× $200, 0.5 kg
   - Écouteurs : 2× $30, 0.2 kg
   - Coque : 1× $10, 0.1 kg
5. Le système calcule automatiquement :
   - Subtotal : $270
   - Commission (15%) : $40.50
   - Transport aérien (0.8 kg × $16/kg) : $12.80
   - **Total général : $323.30**
6. Enregistrer

**Résultat** :
- Facture créée avec numéro auto-généré (ex: `FAC-2026-0042`)
- Statut : `brouillon`
- Aucun impact financier tant que non encaissée

---

### 6.3 Encaisser un paiement sur facture

**Scénario** : Jean Mutombo paie $200 sur sa facture de $323.30.

1. Aller dans **Factures** → trouver la facture
2. Cliquer **"Encaisser"**
3. Remplir :
   - Montant : 200
   - Compte : Airtel Money
   - Mode de paiement : Mobile Money
4. Valider

**Résultat automatique** :
- Paiement créé (`type_paiement: 'facture'`)
- Solde Airtel Money **+$200**
- Mouvement crédit enregistré
- Facture → `statut_paiement: 'partiellement_payee'`
- Solde restant : $123.30

---

### 6.4 Ajouter un colis aérien

**Scénario** : Colis de 5 kg pour le client "Marie Kabila", fournisseur Shenzhen Electronics.

1. Aller dans **Colis → Colis Aériens → Nouveau**
2. Remplir :
   - Client : Marie Kabila
   - Fournisseur : Shenzhen Electronics
   - Tracking Chine : SF1234567890
   - Quantité : 1 colis
   - Poids : 5 kg
   - Tarif/kg : $16
3. Enregistrer

**Résultat** :
- Colis créé avec ID lisible (ex: `CA-2602-A1B2C3`)
- Montant à payer auto-calculé : 5 × $16 = **$80**
- Statut : `en_preparation`
- Statut paiement : `non_paye`

**Cycle de vie ensuite** :
```
en_preparation → expedie_chine → en_transit → arrive_congo → recupere_client → livre
```

---

### 6.5 Effectuer un swap USD → CNY

**Scénario** : Convertir $1,000 du compte Cash Bureau (USD) vers le compte Chine (CNY).

1. Aller dans **Finances → Transactions**
2. Cliquer **"+ Nouvelle transaction"**
3. Remplir :
   - Type : `Transfert`
   - Motif : "Swap USD→CNY"
   - Montant : 1,000
   - Devise : USD
   - Compte source : Cash Bureau
   - Compte destination : Compte Chine CNY
4. Le système calcule : 1,000 × 6.95 = **6,950 CNY**
5. Valider

**Résultat automatique** :
- Transaction créée avec `type_transaction: 'transfert'`
- Trigger SQL : Cash Bureau **-$1,000**
- Trigger SQL : Compte Chine **+¥6,950**
- 2 mouvements créés (1 débit + 1 crédit)

---

### 6.6 Générer un rapport mensuel

**Scénario** : Générer le bilan financier de janvier 2026.

1. Aller dans **Finances → Statistiques**
2. Sélectionner la période **"Mensuel"**
3. Consulter :
   - Revenus du mois
   - Dépenses du mois
   - Transferts/Swaps
   - Solde Net (bénéfice ou perte)
4. Cliquer **"Aperçu PDF"**
5. Télécharger le PDF

**Alternative** : Aller dans **Finances → Rapports** pour un bilan personnalisé avec dates au choix et export Excel.

---

## Annexes

### A. Tables principales de la base de données

| Table | Description | Lignes estimées |
|-------|-------------|-----------------|
| `clients` | Clients de l'entreprise | ~200+ |
| `transactions` | Toutes les opérations financières | ~1,000+ |
| `factures` | Factures et devis | ~500+ |
| `facture_items` | Lignes d'articles des factures | ~2,000+ |
| `colis` | Colis aériens | ~300+ |
| `colis_maritime` | Colis maritimes | ~100+ |
| `containers_maritime` | Containers maritimes | ~20+ |
| `comptes_financiers` | Comptes de trésorerie | ~5-10 |
| `mouvements_comptes` | Historique des mouvements | ~2,000+ |
| `paiements` | Encaissements (factures + colis) | ~500+ |
| `transitaires` | Partenaires logistiques | ~10+ |
| `settings` | Configuration (taux, frais, etc.) | ~20+ |
| `profiles` | Profils utilisateurs | ~10+ |
| `organizations` | Organisations (multi-tenant) | ~1-5 |
| `user_permissions` | Permissions granulaires | ~30+ |
| `activity_logs` | Journal d'activité | ~5,000+ |
| `security_logs` | Journal de sécurité | ~500+ |
| `finance_categories` | Catégories financières | ~20+ |
| `tarifs_colis` | Grille tarifaire colis | ~10+ |
| `transaction_approvals` | Workflow d'approbation | ~50+ |

### B. Variables d'environnement requises

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `VITE_TELEGRAM_BOT_TOKEN` | Token bot Telegram (agent IA) |
| `VITE_TELEGRAM_CHAT_ID` | Chat ID Telegram (alertes) |

### C. Technologies utilisées

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 |
| UI | Tailwind CSS + shadcn/ui |
| State Management | React Query (TanStack Query v5) |
| Backend | Supabase (PostgreSQL 15+) |
| Auth | Supabase Auth (JWT) |
| Edge Functions | Deno (Supabase Functions) |
| Validation | Zod |
| Charts | Recharts |
| Forms | React Hook Form |
| PDF | jsPDF + jspdf-autotable |
| Excel | xlsx (SheetJS) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Date | date-fns |

---

*Document généré le 17/02/2026 – FactureX v1.0.2*
