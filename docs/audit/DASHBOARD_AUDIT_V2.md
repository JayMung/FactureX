# 🔍 AUDIT FONCTIONNEL — MODULE DASHBOARD (V2 Release)

**Date** : 17 février 2026  
**Auditeur** : Cascade AI  
**Branche** : `dev` (commit `d9aaa90`)  
**Statut** : ❌ **NON PRÊT POUR PRODUCTION** — 7 bugs critiques/high à corriger

---

## 1. ARCHITECTURE DU DASHBOARD

### Pages
| Page | Fichier | Rôle |
|------|---------|------|
| Index-Protected | `src/pages/Index-Protected.tsx` | Dashboard principal (V2, avec permissions) |
| Index | `src/pages/Index.tsx` | Dashboard legacy (V1, sans permissions) |

### Composants
| Composant | Fichier |
|-----------|---------|
| AdvancedDashboard | `src/components/dashboard/AdvancedDashboard.tsx` |
| StatCard | `src/components/dashboard/StatCard.tsx` |
| TopActiveUsers | `src/components/dashboard/TopActiveUsers.tsx` |
| ActivityFeed | `src/components/activity/ActivityFeed.tsx` |
| PeriodFilterTabs | `src/components/ui/period-filter-tabs.tsx` |

### Hooks
| Hook | Fichier | Usage |
|------|---------|-------|
| useDashboardWithPermissions | `src/hooks/useDashboardWithPermissions.ts` | Overview tab (Index-Protected) |
| useDashboardAnalytics | `src/hooks/useDashboardAnalytics.ts` | Analytics tab (AdvancedDashboard) |
| useDashboard | `src/hooks/useDashboard.ts` | Legacy (Index.tsx) |
| useTransactions | `src/hooks/useTransactions.ts` | Finance module in AdvancedDashboard |
| useColis | `src/hooks/useColis.ts` | Colis module in AdvancedDashboard |
| useRealTimeActivity | `src/hooks/useRealTimeActivity.ts` | ActivityFeed + TopActiveUsers |
| useActivityLogs | `src/hooks/useActivityLogs.ts` | Activity logs (Index-Protected) |
| usePermissions | `src/hooks/usePermissions.ts` | Role-based access |

### Data Sources
| Source | Table | Via |
|--------|-------|----|
| Transactions | `transactions` | `getDashboardStats()` service + `useTransactions` hook |
| Factures | `factures` | `getDashboardStats()` service |
| Clients | `clients` | `getDashboardStats()` service |
| Colis | `colis` | `useColis` hook (useSupabaseQuery) |
| Activity Logs | `activity_logs` | `useRealTimeActivity` + `useActivityLogs` |
| Analytics | RPC `get_dashboard_analytics_secure` | `useDashboardAnalytics` hook |

---

## 2. KPIs AFFICHÉS

### Tab "Vue d'ensemble" (Index-Protected)

**Admin view (4 cartes) :**
| KPI | Source | Filtre date |
|-----|--------|-------------|
| Total Factures | `stats.facturesCount` | ✅ Oui |
| Montant Facturé USD | `stats.facturesAmountUSD` | ✅ Oui |
| Total Frais | `stats.totalFrais` | ✅ Oui |
| Factures Validées | `stats.facturesValidees` | ✅ Oui |

**Opérateur view (4 cartes) :**
| KPI | Source | Filtre date |
|-----|--------|-------------|
| Total Factures | `stats.facturesCount` | ✅ Oui |
| Factures Validées | `stats.facturesValidees` | ✅ Oui |
| Total Clients | `stats.clientsCount` | ❌ Non filtré par date |
| Factures en Attente | `stats.facturesEnAttente` | ⚠️ Non calculé (toujours 0) |

### Tab "Analytics avancés" (AdvancedDashboard)

**4 KPI cards :**
| KPI | Source | Filtre |
|-----|--------|--------|
| Revenus totaux | `analytics.totalRevenue` (RPC) | Période |
| Transactions | `analytics.totalTransactions` (RPC) | Période |
| Clients actifs | `analytics.activeClients` (RPC) | Période |
| Bénéfice net | `analytics.netProfit` (RPC) | Période |

**Module Colis (3 stats) :**
| KPI | Source |
|-----|--------|
| Total Colis | `colisStats.totalCount` |
| En Transit | `colisStats.enTransit` |
| Livrés | `colisStats.livres` |

**Module Finance (4 stats) :**
| KPI | Source |
|-----|--------|
| Total USD | `financeStats.totalUSD` |
| Total Frais | `financeStats.totalFrais` |
| Bénéfice Total | `financeStats.totalBenefice` |
| Total Dépenses | `financeStats.totalDepenses` |

### Charts
| Chart | Type | Data |
|-------|------|------|
| Revenus | AreaChart (USD + CDF) | `analytics.dailyStats` |
| Transactions | BarChart | `analytics.dailyStats` |
| Clients | LineChart | `analytics.dailyStats` |
| Répartition devises | Static bars | `analytics.currencyBreakdown` |
| Top transactions | List | `analytics.topTransactions` |

---

## 3. BUGS FONCTIONNELS

### BUG-D01 — `facturesEnAttente` jamais calculé
- **Risque** : 🔴 **HIGH**
- **Localisation** : `src/services/supabase.ts:890` — `getDashboardStats()`
- **Problème** : Le KPI "Factures en Attente" affiché pour les opérateurs utilise `stats?.facturesEnAttente` mais cette valeur n'est **jamais calculée** dans `getDashboardStats()`. Elle sera toujours `undefined` → affiche `0`.
- **Impact** : Les opérateurs voient toujours 0 factures en attente, même s'il y en a 85 (statut `brouillon` en DB).
- **Fix** : Ajouter le calcul dans `getDashboardStats()` :
  ```typescript
  const facturesEnAttente = factures.filter(f => f.statut === 'brouillon' || f.statut === 'en_attente').length;
  ```

### BUG-D02 — RPC `get_dashboard_analytics_secure` : taux CDF hardcodé à 2850 au lieu de 2200
- **Risque** : 🔴 **CRITICAL**
- **Localisation** : Fonction SQL `get_dashboard_analytics_secure`
- **Problème** : La conversion CDF→USD utilise un taux hardcodé de `2850` alors que le taux en DB (`settings.usdToCdf`) est `2200`. Écart de **29.5%**.
- **Impact** : Si des transactions CDF existent, le "Revenus totaux" dans Analytics sera sous-évalué de ~30%.
- **Note** : Actuellement 0 transactions CDF en DB, mais le bug est latent et explosera dès qu'une transaction CDF sera créée.
- **Fix** : Lire le taux depuis `settings` dans la RPC au lieu de hardcoder.

### BUG-D03 — RPC `totalRevenue` inclut TOUTES les transactions (dépenses + transferts + revenus)
- **Risque** : 🔴 **CRITICAL**
- **Localisation** : Fonction SQL `get_dashboard_analytics_secure`
- **Problème** : La RPC fait `SUM(montant)` sur **toutes** les transactions sans filtrer par `type_transaction`. Résultat : les dépenses ($50,089) et transferts ($14,254) sont comptés comme revenus.
- **Impact** : "Revenus totaux" affiche $131,399 au lieu de $67,055 (revenus réels). **Surévaluation de 96%**.
- **Fix** : Ajouter `AND type_transaction = 'revenue'` au calcul du revenu.

### BUG-D04 — RPC `dailyStats`, `currencyBreakdown`, `topTransactions` retournent des données vides
- **Risque** : 🔴 **HIGH**
- **Localisation** : Fonction SQL `get_dashboard_analytics_secure`
- **Problème** : Ces 3 champs sont hardcodés à des valeurs vides :
  ```sql
  'currencyBreakdown', json_build_object('USD', 0, 'CDF', 0),
  'topTransactions', '[]'::json,
  'dailyStats', '[]'::json,
  ```
- **Impact** : 
  - Le graphique principal (AreaChart/BarChart/LineChart) est **toujours vide** — aucune donnée affichée.
  - La répartition par devise affiche toujours $0 / 0 CDF.
  - La liste "Top transactions récentes" est toujours vide.
- **Fix** : Implémenter les requêtes SQL pour ces 3 sections dans la RPC.

### BUG-D05 — `change` percentages sont hardcodés (faux)
- **Risque** : 🟡 **MEDIUM**
- **Localisation** : Multiples fichiers
- **Problème** : Les pourcentages de variation sont hardcodés partout :
  - `Index-Protected.tsx:84` : `{ value: 8, isPositive: true }` — toujours +8%
  - `Index-Protected.tsx:92` : `{ value: 12, isPositive: true }` — toujours +12%
  - RPC SQL : `'revenueChange', json_build_object('value', 12, 'isPositive', true)` — toujours +12%
- **Impact** : L'utilisateur voit des tendances fictives. Aucune comparaison réelle période N vs N-1.
- **Fix** : Calculer la variation réelle en comparant la période actuelle vs la période précédente.

### BUG-D06 — `getDashboardStats` : `totalUSD` inclut dépenses et transferts
- **Risque** : 🔴 **CRITICAL**
- **Localisation** : `src/services/supabase.ts:858-860`
- **Problème** : Le calcul `totalUSD` filtre par `devise === 'USD'` mais **ne filtre pas** par `type_transaction`. Résultat : les dépenses ($50,089) et transferts ($14,254) sont inclus dans "Total USD".
- **Impact** : La carte "Total USD" (Index legacy) et "Montant Facturé USD" (si mal interprété) affichent $131,399 au lieu de $67,055 de revenus.
- **Sémantique ambiguë** : Si "Total USD" signifie "volume total", c'est correct. Si c'est "revenus USD", c'est faux. Le label est trompeur.
- **Fix** : Clarifier la sémantique. Si c'est un revenu, filtrer `type_transaction = 'revenue'`. Sinon, renommer en "Volume USD".

### BUG-D07 — `beneficeNet` inclut les bénéfices négatifs des dépenses
- **Risque** : 🟡 **MEDIUM**
- **Localisation** : `src/services/supabase.ts:869-870`
- **Problème** : `beneficeNet` fait `SUM(benefice)` sur toutes les transactions. Les dépenses ont `benefice = -2008.97`. Résultat : $1,963 au lieu de $3,952 (revenus seuls).
- **Impact** : Le "Bénéfice Net" est artificiellement réduit par les dépenses qui ont un champ `benefice` négatif (ce qui est une anomalie de données — les dépenses ne devraient pas avoir de bénéfice).
- **Fix** : Filtrer `WHERE type_transaction = 'revenue'` pour le calcul du bénéfice, OU nettoyer les données (mettre `benefice = 0` pour les dépenses).

### BUG-D08 — `clientsCount` non filtré par date dans Overview
- **Risque** : 🟢 **LOW**
- **Localisation** : `src/services/supabase.ts:844-845`
- **Problème** : La requête clients fait `select('id', { count: 'exact', head: true })` sans appliquer les filtres de date. Quand l'utilisateur filtre par "Jour" ou "Semaine", le nombre de clients reste le total global.
- **Impact** : Incohérence mineure — le filtre de période n'affecte pas le compteur clients.
- **Fix** : Appliquer les filtres `dateFrom`/`dateTo` à la requête clients.

### BUG-D09 — `activeClients` dans RPC = nouveaux clients, pas clients actifs
- **Risque** : 🟡 **MEDIUM**
- **Localisation** : Fonction SQL `get_dashboard_analytics_secure`
- **Problème** : La RPC compte les clients **créés** dans la période (`WHERE created_at >= v_start_date`), pas les clients ayant des transactions. Le label dit "Clients actifs" mais c'est "Nouveaux clients".
- **Impact** : Actuellement 0 "clients actifs" sur 7 jours (aucun nouveau client), alors qu'il y a probablement des clients avec des transactions récentes.
- **Fix** : Compter les clients distincts ayant des transactions dans la période, OU renommer en "Nouveaux clients".

### BUG-D10 — `monthlyRevenue` est un calcul fictif
- **Risque** : 🟢 **LOW**
- **Localisation** : `src/services/supabase.ts:899`
- **Problème** : `monthlyRevenue: totalUSD * 0.05` — c'est 5% du total USD, pas un vrai revenu mensuel. Utilisé uniquement pour conditionner l'affichage des `change` badges.
- **Impact** : Faible car non affiché directement, mais c'est du code mort trompeur.
- **Fix** : Supprimer ou remplacer par un vrai calcul.

---

## 4. INCONSISTANCES LOGIQUES

### INC-01 — Deux dashboards avec des données différentes
- **Risque** : 🟡 **MEDIUM**
- **Problème** : L'onglet "Vue d'ensemble" utilise `getDashboardStats()` (service) tandis que "Analytics avancés" utilise la RPC `get_dashboard_analytics_secure`. Les deux calculent les mêmes métriques différemment :
  - Overview `totalFrais` = SUM(frais) de toutes les transactions = $6,260
  - Analytics `totalRevenue` = SUM(montant) de toutes les transactions / 2850 pour CDF
  - Finance module `totalFrais` = SUM(frais) des transactions commerciales uniquement
- **Impact** : Les chiffres ne correspondent pas entre les onglets.

### INC-02 — Finance module dans Analytics non filtré par période
- **Risque** : 🟡 **MEDIUM**
- **Problème** : Le module Finance dans AdvancedDashboard utilise `useTransactions(1, {})` — **aucun filtre**. Il affiche les totaux globaux indépendamment de la période sélectionnée (24h/7d/30d/90d).
- **Impact** : L'utilisateur change la période mais les stats Finance ne changent pas.

### INC-03 — Colis module non filtré par période
- **Risque** : 🟢 **LOW**
- **Problème** : Même problème que INC-02 pour le module Colis.

### INC-04 — `facturesValidees` filtre `validee` OR `payee` mais DB n'a que `brouillon` et `payee`
- **Risque** : 🟡 **MEDIUM**
- **Localisation** : `src/services/supabase.ts:880`
- **Problème** : Le code filtre `statut === 'validee' || statut === 'payee'` mais en DB les statuts sont `brouillon` (85) et `payee` (28). Le statut `validee` n'existe pas.
- **Impact** : Le compteur "Factures Validées" n'inclut que les factures `payee` (28), pas celles qui seraient "validées mais non payées" (si ce statut existait).

---

## 5. PROBLÈMES UX

### UX-01 — Graphiques toujours vides dans Analytics
- **Risque** : 🔴 **HIGH**
- **Problème** : Comme `dailyStats` est toujours `[]`, les 3 graphiques (AreaChart, BarChart, LineChart) sont rendus mais vides — juste des axes sans données.
- **Impact** : L'onglet Analytics semble cassé.

### UX-02 — Debug `console.log` en production
- **Risque** : 🟢 **LOW**
- **Localisation** : `AdvancedDashboard.tsx:61-67`
- **Problème** : `console.log('📊 Finance Stats:', ...)` et `console.log('📦 Colis Stats:', ...)` sont actifs en production.
- **Fix** : Supprimer ou conditionner avec `import.meta.env.DEV`.

### UX-03 — Tooltip du graphique ne formate pas les devises
- **Risque** : 🟢 **LOW**
- **Localisation** : `AdvancedDashboard.tsx:158`
- **Problème** : Le tooltip utilise `toLocaleString('fr-FR')` sans symbole de devise. Pour un graphique "Revenus USD", on voit "1 234" au lieu de "$1,234.00".

### UX-04 — Y-axis du graphique divise par 1000 (`val/1000 + 'k'`)
- **Risque** : 🟢 **LOW**
- **Localisation** : `AdvancedDashboard.tsx:308`
- **Problème** : Si les valeurs sont < 1000, l'axe Y affiche "0k", "0.5k" etc. Pas adapté aux petits montants.

### UX-05 — Index.tsx (legacy) toujours accessible
- **Risque** : 🟡 **MEDIUM**
- **Problème** : Deux pages Dashboard coexistent. Si la route `/` pointe vers `Index.tsx` au lieu de `Index-Protected.tsx`, les utilisateurs voient le dashboard sans permissions.
- **Fix** : Vérifier le routing et supprimer ou rediriger `Index.tsx`.

---

## 6. PROBLÈMES DE PERFORMANCE

### PERF-01 — `getDashboardStats` charge TOUTES les transactions sans pagination
- **Risque** : 🟡 **MEDIUM**
- **Localisation** : `src/services/supabase.ts:825-827`
- **Problème** : La requête charge toutes les transactions (292 actuellement) pour calculer les stats côté client. Pas de problème maintenant mais ne scale pas.
- **Fix** : Migrer vers une RPC SQL qui fait les agrégations côté serveur.

### PERF-02 — `useTransactions(1, {})` dans AdvancedDashboard charge les données complètes
- **Risque** : 🟡 **MEDIUM**
- **Localisation** : `AdvancedDashboard.tsx:57`
- **Problème** : `useTransactions` charge la page 1 des transactions + calcule les globalTotals (requête supplémentaire sans pagination). Deux requêtes pour afficher 4 chiffres.
- **Fix** : Créer un hook dédié `useDashboardFinanceStats()` qui ne fait qu'une requête d'agrégation.

### PERF-03 — `useRealTimeActivity(100)` dans TopActiveUsers
- **Risque** : 🟢 **LOW**
- **Localisation** : `TopActiveUsers.tsx:27`
- **Problème** : Charge 100 activity logs + fait une requête N+1 pour les profils utilisateurs. Le composant n'affiche que 5 utilisateurs.

### PERF-04 — `useEffect` avec `fetchRecentActivities` dans les dépendances crée un risque de boucle
- **Risque** : 🟡 **MEDIUM**
- **Localisation** : `useRealTimeActivity.ts:120`
- **Problème** : `fetchRecentActivities` est dans les dépendances de `useEffect` mais est recréé à chaque render (même avec `useCallback`, ses deps `isLoading` et `lastFetch` changent). Le debouncing à 1s empêche la boucle infinie mais cause des re-renders inutiles.
- **Fix** : Utiliser un ref pour `isLoading` et `lastFetch` au lieu de state dans les deps du callback.

---

## 7. EDGE CASES

### EDGE-01 — Aucune gestion des transactions avec `statut = 'Annulé'` ou `'Remboursé'`
- **Risque** : 🟡 **MEDIUM**
- **Problème** : Il y a 2 transactions avec statut `Remboursé` en DB. Elles sont incluses dans tous les calculs (totalUSD, benefice, frais). Un remboursement devrait être exclu ou soustrait.

### EDGE-02 — Transactions CNY (35 transactions, $31,000) ignorées dans certains calculs
- **Risque** : 🟡 **MEDIUM**
- **Problème** : `getDashboardStats` filtre `devise === 'USD'` et `devise === 'CDF'` mais ignore `devise === 'CNY'` (35 transactions). Ces transactions n'apparaissent dans aucun total de l'Overview.

### EDGE-03 — Pas de gestion du cas "aucune donnée" dans les graphiques
- **Risque** : 🟢 **LOW**
- **Problème** : Quand `dailyStats` est vide, les graphiques affichent des axes vides sans message explicatif.

---

## 8. RÉSUMÉ DES RISQUES

| # | Bug | Risque | Module |
|---|-----|--------|--------|
| D03 | RPC totalRevenue inclut dépenses+transferts | 🔴 CRITICAL | Analytics |
| D02 | RPC taux CDF hardcodé 2850 vs DB 2200 | 🔴 CRITICAL | Analytics |
| D06 | getDashboardStats totalUSD inclut tout | 🔴 CRITICAL | Overview |
| D04 | Charts/breakdown/top transactions vides | 🔴 HIGH | Analytics |
| D01 | facturesEnAttente jamais calculé | 🔴 HIGH | Overview |
| UX-01 | Graphiques toujours vides | 🔴 HIGH | Analytics |
| D05 | Change percentages hardcodés | 🟡 MEDIUM | Tous |
| D07 | beneficeNet inclut dépenses | 🟡 MEDIUM | Overview |
| D09 | activeClients = nouveaux, pas actifs | 🟡 MEDIUM | Analytics |
| INC-01 | Deux dashboards, données différentes | 🟡 MEDIUM | Tous |
| INC-02 | Finance module non filtré par période | 🟡 MEDIUM | Analytics |
| INC-04 | Statut 'validee' inexistant en DB | 🟡 MEDIUM | Overview |
| EDGE-01 | Remboursés inclus dans les totaux | 🟡 MEDIUM | Tous |
| EDGE-02 | Transactions CNY ignorées | 🟡 MEDIUM | Overview |
| PERF-01 | Toutes transactions chargées côté client | 🟡 MEDIUM | Overview |
| PERF-02 | useTransactions inutilement lourd | 🟡 MEDIUM | Analytics |
| PERF-04 | Risque boucle useRealTimeActivity | 🟡 MEDIUM | Dashboard |
| UX-05 | Dashboard legacy toujours accessible | 🟡 MEDIUM | Routing |
| D08 | clientsCount non filtré par date | 🟢 LOW | Overview |
| D10 | monthlyRevenue fictif | 🟢 LOW | Overview |
| UX-02 | console.log en production | 🟢 LOW | Analytics |
| UX-03 | Tooltip sans symbole devise | 🟢 LOW | Analytics |
| UX-04 | Y-axis /1000 pour petits montants | 🟢 LOW | Analytics |
| PERF-03 | 100 logs chargés pour 5 users | 🟢 LOW | Dashboard |
| EDGE-03 | Pas de message "aucune donnée" | 🟢 LOW | Analytics |

---

## 9. RECOMMANDATIONS DE FIX (par priorité)

### 🔴 Priorité 1 — Bloquants V2

1. **Réécrire la RPC `get_dashboard_analytics_secure`** :
   - Filtrer `type_transaction = 'revenue'` pour totalRevenue
   - Lire le taux CDF depuis `settings` au lieu de hardcoder 2850
   - Implémenter `dailyStats` avec GROUP BY date
   - Implémenter `currencyBreakdown` avec SUM par devise
   - Implémenter `topTransactions` avec JOIN clients
   - Calculer les vrais `change` percentages (période N vs N-1)

2. **Corriger `getDashboardStats`** :
   - Ajouter `facturesEnAttente` (filtre `brouillon`)
   - Clarifier `totalUSD` : soit filtrer par `type_transaction = 'revenue'`, soit renommer en "Volume USD"
   - Filtrer `beneficeNet` pour exclure les dépenses
   - Appliquer les filtres de date aux clients
   - Exclure les transactions `Remboursé` des totaux

### 🟡 Priorité 2 — Avant release

3. **Unifier les sources de données** entre Overview et Analytics
4. **Filtrer Finance/Colis par période** dans AdvancedDashboard
5. **Corriger `activeClients`** : compter les clients avec transactions, pas les nouveaux
6. **Supprimer les console.log** de production
7. **Vérifier le routing** : s'assurer que Index-Protected est la seule route `/`

### 🟢 Priorité 3 — Nice to have

8. Ajouter un message "Aucune donnée" quand les graphiques sont vides
9. Formater les tooltips avec symboles de devise
10. Optimiser les requêtes (agrégation côté serveur)
11. Nettoyer le code legacy (Index.tsx, useDashboard.ts)

---

## 10. VERDICT

### ❌ Le Dashboard N'EST PAS prêt pour la production V2

**Raisons principales :**
- Les 3 KPIs financiers principaux (Revenus, Bénéfice, Total USD) sont **mathématiquement faux** — ils incluent les dépenses dans les revenus
- Les graphiques Analytics sont **100% vides** (données hardcodées à `[]`)
- Les pourcentages de variation sont **fictifs** (hardcodés)
- Le taux de change CDF est **désynchronisé** (2850 vs 2200)

**Effort estimé pour correction :**
- Priorité 1 (bloquants) : ~4-6 heures
- Priorité 2 (avant release) : ~2-3 heures
- Priorité 3 (nice to have) : ~2 heures

**Total estimé : 8-11 heures de travail**

---

## 11. CORRECTIONS APPLIQUÉES

### ✅ FIX-01 — Nouvelle RPC `get_dashboard_overview_secure` (2026-02-17)

**Migration** : `20260217_create_dashboard_overview_secure.sql`

Remplace la RPC cassée `get_dashboard_analytics_secure` par une nouvelle fonction correcte.

**Bugs corrigés :**
- ✅ D02 — Taux CDF lu dynamiquement depuis `settings` (plus de hardcode 2850)
- ✅ D03 — Revenue filtre `type_transaction = 'revenue'` uniquement
- ✅ D04 — `dailyStats`, `currencyBreakdown`, `topTransactions` entièrement implémentés
- ✅ D05 — Change percentages calculés (période N vs N-1)
- ✅ D09 — `activeClients` = DISTINCT client_id des transactions revenue
- ✅ D01 — `facturesEnAttente` calculé (statut = 'brouillon')
- ✅ EDGE-01 — Transactions Remboursé/Annulé exclues
- ✅ EDGE-02 — Transactions CNY converties en USD via taux dynamique

**Architecture CTE :**
| CTE | Rôle |
|-----|------|
| `rates` | Lit USD→CDF et USD→CNY depuis `settings` |
| `curr` | KPIs période courante (revenue, expenses, profit, frais, active clients) |
| `fct` | Stats factures (total, validées, en attente) |
| `cb` | Currency breakdown (revenue par devise) |
| `ds` | Daily stats (revenue/expense/profit par jour) |
| `tt` | Top 5 transactions revenue avec JOIN clients |
| `chg` | Change % (période courante vs période précédente) |

**Sécurité :**
- `SECURITY DEFINER` avec `SET search_path = public`
- Guard: vérifie que `auth.uid()` appartient à l'organisation demandée
- `GRANT EXECUTE` uniquement à `authenticated`

**Indexes créés :**
- `idx_transactions_org_type_created` (organization_id, type_transaction, created_at)
- `idx_transactions_org_created_statut` (organization_id, created_at, statut)
- `idx_factures_org_statut` (organization_id, statut)

**Résultats vérifiés (90 jours) :**
- Revenue USD : $38,374.79 (avant : $131,399 — incluait dépenses/transferts)
- Expenses USD : $48,368.38
- Net Profit : $3,158.18 (avant : $1,963 — incluait benefice négatif des dépenses)
- Active Clients : 55 (avant : 0 — comptait les nouveaux clients)
- Factures : 88 total, 19 payées, 69 brouillon
- Daily Stats : ✅ données réelles par jour
- Top Transactions : ✅ 5 plus grosses avec noms clients
- Currency Breakdown : ✅ USD $38,374.79

### ✅ FIX-02 — 4-Category Financial Model (2026-02-17)

**Migration** : `20260217_update_dashboard_overview_4_categories.sql`

Refactors the financial model to reflect FactureX's real business (China→Congo import).

**New financial categories :**
| Category | Definition | Formula |
|----------|-----------|---------|
| Client Revenue | `type_transaction = 'revenue'` | SUM(montant) converted to USD |
| Supplier Cost | `type_transaction = 'depense'` AND `is_supplier_expense()` | SUM(montant) converted to USD |
| Operational Expenses | `type_transaction = 'depense'` AND NOT supplier | SUM(montant) converted to USD |
| Net Margin | Revenue - Supplier Cost | Computed |
| Net Profit | Revenue - Supplier Cost - Operational Expenses | Computed |

**Supplier detection rules (`is_supplier_expense()` helper function) :**
1. `categorie = 'Paiement Fournisseur'`
2. `motif = 'Paiement Fournisseur'`
3. `motif ILIKE '%Recharge Alipay%'`
4. `compte_destination_id` = Alipay account (`c5969d86-...`)
5. `categorie = 'Paiement Colis'` OR `motif ILIKE '%Paiement Colis%'`
6. (`categorie`|`motif` = 'Transfert Argent') AND `devise = 'CNY'`

**New JSON output keys :**
- `supplierCostUSD` — new
- `operationalExpensesUSD` — new
- `netMarginUSD` — new (Revenue - Supplier)
- `netProfitUSD` — updated (Revenue - All Expenses)
- `marginChange` — new period-over-period change
- `dailyStats` — now includes `revenueUSD`, `supplierCostUSD`, `operationalExpensesUSD`, `netMarginUSD`

**Verified results (all-time, org 00000000-...-000001) :**
| Metric | Value |
|--------|-------|
| Revenue USD | $66,355.79 |
| Supplier Cost USD | $14,149.57 |
| Operational Expenses USD | $25.00 |
| Net Margin | $52,206.22 |
| Net Profit | $52,181.22 |

### ✅ FIX-03 — Financial Reset Strategy 2026 (2026-02-17)

**Migration** : `20260217_financial_reset_2026_balance_adjustments.sql`

**Problem** : Oct–Dec 2025 data is incomplete (revenues recorded, supplier/operational expenses partially missing). Historical periods show inflated margins.

**Solution** : New transaction type `balance_adjustment` for creating clean opening balances.

**Changes applied :**

| Component | Change |
|-----------|--------|
| CHECK constraints (×2) | Added `'balance_adjustment'` to allowed types |
| `validate_transaction_data()` | Accepts `'balance_adjustment'` |
| `validate_transaction_before_insert()` | Sets frais=0, benefice=0, montant_cny=0 for adjustments |
| `update_compte_solde_after_transaction_with_fees()` | Handles credit dest / debit source for adjustments |
| `revert_compte_solde_before_update_with_fees()` | Reverses adjustment on UPDATE |
| `revert_compte_solde_after_delete()` | Reverses adjustment on DELETE |
| `validate_compte_solde_before_debit()` | **Bypasses** solde check for adjustments |
| `create_mouvement_from_transaction_for_row()` | Creates mouvement labeled "Ajustement solde ouverture 2026" |
| `get_dashboard_overview_secure` | V2.2: excludes `balance_adjustment` from ALL KPIs + `dataWarning` for pre-2026 |

**New RPC** : `create_opening_balance(p_account_id UUID, p_target_balance NUMERIC, p_effective_date TIMESTAMPTZ)`
- Reads current `solde_actuel`, calculates delta automatically
- If delta > 0 → credit (compte_destination_id)
- If delta < 0 → debit (compte_source_id)
- If delta = 0 → no-op
- SECURITY DEFINER with org membership guard

**Impact on metrics :**

| Metric | Affected? |
|--------|-----------|
| Revenue / Supplier / Operational / Margin / Profit | ❌ No (filtered out) |
| Account Balance (`solde_actuel`) | ✅ Yes (triggers update) |
| Mouvements (audit trail) | ✅ Yes (mouvement created) |
| Daily Stats / Currency Breakdown / Top Txns | ❌ No (filtered out) |

**Dashboard warning** : When `p_start_date < 2026-01-01`, RPC returns:
```json
"dataWarning": "Les données avant le 1er janvier 2026 ne sont pas entièrement auditées"
```

**🔒 Security Hardening (2026-02-17)** :

| Function | Rule |
|----------|------|
| `validate_compte_solde_before_debit()` | `balance_adjustment` → allowed if resulting balance ≥ 0. If < 0, requires `super_admin` (`auth.users.raw_app_meta_data->>'role'`) |
| `create_opening_balance()` | `p_target_balance < 0` requires `super_admin`. Belt-and-suspenders on top of trigger check |

Principle: **Sécurité > confort**. Non-super_admin users can only create adjustments that keep balances ≥ 0.

### ✅ FIX-04 — Flexible Accounting Model: `is_complete` (2026-02-17)

**Migration** : `20260217_add_is_complete_to_transactions.sql`

**Purpose** : Allow transactions to be marked as incomplete (draft-level bookkeeping) while maintaining financial integrity.

**Changes applied :**

| Component | Change |
|-----------|--------|
| `transactions` table | Added `is_complete BOOLEAN NOT NULL DEFAULT true` |
| Partial index | `idx_transactions_org_incomplete` on `(organization_id, is_complete) WHERE is_complete = false` |
| `validate_transaction_before_insert()` | If `is_complete = false`: COALESCE frais/benefice/montant_cny to 0, **no early return** — continues to final `RETURN NEW` |
| `get_dashboard_overview_secure` | V2.3: adds `incompleteTransactionsCount`, `incompleteAmountUSD`, conditional `dataWarning` |
| `get_incomplete_transactions(UUID)` | New RPC — returns incomplete txns for OpenClaw monitoring |
| `get_incomplete_transactions_count(UUID)` | New RPC — returns count for OpenClaw polling |
| `Index-Protected.tsx` | Yellow warning badge when `incompleteTransactionsCount > 0` (admin only) |

**Incomplete transaction rules :**

| Behavior | Affected? |
|----------|-----------|
| Account balances (`solde_actuel`) | ✅ Updated normally (triggers run) |
| Mouvements (audit trail) | ✅ Created normally |
| KPIs (revenue, expenses, margin, profit) | ✅ Included |
| Solde validation | ✅ Still enforced |
| Role checks (super_admin) | ✅ Still enforced |
| frais/benefice/montant_cny calculation | ❌ Skipped (COALESCE to 0) |
| balance_adjustment logic | ❌ Not affected |

**Dashboard warning logic :**
- Pre-2026 + incomplete → combined message
- Pre-2026 only → audit warning
- Incomplete only → "Certaines transactions sont marquées comme incomplètes"
- Neither → `null`

**OpenClaw integration (ready) :**
- `get_incomplete_transactions_count()` → poll every X hours
- If > 0 → Telegram: "⚠️ N transactions incomplètes nécessitent validation."

**⚠️ Reste à faire :**
- Connecter le frontend au nouveau RPC (hook `useDashboardAnalytics` → `get_dashboard_overview_secure`)
- Corriger `getDashboardStats` dans `supabase.ts` (bugs D06, D07, D08, D10)
- Unifier les sources de données Overview/Analytics
- Utiliser `create_opening_balance` pour définir les soldes d'ouverture 2026 de chaque compte
- Implémenter le polling OpenClaw + envoi Telegram pour transactions incomplètes
