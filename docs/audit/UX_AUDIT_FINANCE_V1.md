# 💰 UX/UI AUDIT COMPLET — MODULE FINANCE (FACTUREX)

**Date** : 24 Février 2026  
**Rôle** : Senior SaaS UX Architect + Product Designer  
**Cible** : Module Finance — 7 sous-modules (Transactions, Encaissements, Opérations Financières, Comptes, Mouvements, Statistiques, Rapports + Catégories)

---

## 📊 SCORE GLOBAL : 6.8 / 10

**Verdict** : Le module Finance dispose d'une architecture solide et d'une couverture fonctionnelle impressionnante. Cependant, l'expérience utilisateur souffre d'une **fragmentation excessive** (trop de sous-pages isolées), d'une **incohérence visuelle entre modules**, et d'une **absence de dashboard unifié** donnant une vision claire de la trésorerie en temps réel.

---

## 🏆 SCORES PAR SOUS-MODULE

| # | Sous-module | Score | Statut |
|---|-------------|-------|--------|
| 1 | Transactions | 7.5/10 | ✅ Bon — `UnifiedDataTable` + tabs |
| 2 | Encaissements | 5.5/10 | 🔴 Faible — vieux design, `Select` client non-searchable |
| 3 | Opérations Financières | 5.0/10 | 🔴 Critique — `window.confirm()`, pas de `UnifiedDataTable` |
| 4 | Comptes Financiers | 7.0/10 | 🟡 Moyen — `UnifiedDataTable` présent mais CRUD dans Dialog inline |
| 5 | Mouvements de Comptes | 7.5/10 | ✅ Bon — `UnifiedDataTable` + `FilterTabs` + période |
| 6 | Statistiques Finance | 6.0/10 | 🟡 Moyen — bon contenu, pas de graphiques réels |
| 7 | Rapports Financiers | 6.5/10 | 🟡 Moyen — génération PDF présente, pas d'historique visible |
| 8 | Catégories Finances | 6.0/10 | 🟡 Moyen — fonctionnel mais pauvre visuellement |

---

## 🚨 CLASSIFICATION DES PROBLÈMES

### 🔴 CRITIQUE (Bloquant pour l'expérience utilisateur)

**P1. `window.confirm()` dans Opérations Financières**
- `Operations-Financieres.tsx` ligne 106 : `window.confirm('Êtes-vous sûr...')` — pattern natif bloquant, incohérent avec le reste du projet qui utilise `ConfirmDialog`.

**P2. Sélecteur client non-searchable dans Encaissements**
- `Encaissements.tsx` utilise un `<Select>` natif pour filtrer par client, alors que le composant `ClientCombobox` est disponible et utilisé partout ailleurs. Avec 50+ clients, le `Select` devient inutilisable.

**P3. Absence de dashboard unifié trésorerie**
- Il n'existe aucune page "vue d'ensemble" du module Finance montrant : Solde total de tous les comptes, flux du mois (entrées vs sorties), KPIs de recouvrement, alertes. L'utilisateur doit naviguer entre 6 sous-pages pour avoir une image complète.

**P4. Opérations Financières n'utilise pas `UnifiedDataTable`**
- `Operations-Financieres.tsx` utilise un tableau HTML custom `<table>` au lieu du `UnifiedDataTable` standardisé — pas de mode cards, pas de `ColumnSelector`, pas d'`ExportDropdown`, pas de `FilterTabs`.

---

### 🟠 HIGH (Impact fort sur l'UX)

**P5. Encaissements — design daté non aligné**
- La page Encaissements utilise une structure de filtres dans une `Card` séparée avec des `Label` + `Select` côte à côte, au lieu d'utiliser `FilterTabs` + barre de filtres horizontale comme dans Factures et Transactions.
- Le bouton "Nouvel encaissement" est enfoui dans un `Dialog` placé dans le header — peu visible.
- Pas de `PeriodFilterTabs` alors que les stats affichées sont toujours sur "tout le temps".

**P6. Catégories — pas de compteur d'usage**
- Les catégories de dépenses/revenus n'affichent pas combien de transactions utilisent chaque catégorie. L'utilisateur ne sait pas quelles catégories sont "actives".
- La couleur choisie pour une catégorie (sélecteur hex manuel) n'a pas de prévisualisation live dans la liste.

**P7. Comptes — soldes sans contexte temporel**
- `Comptes.tsx` affiche les soldes actuels mais sans indicateur de tendance (↑ ou ↓ depuis le mois dernier), ni graphique de l'évolution du solde par compte.
- Le `CompteDetailModal` existe mais n'est pas mis en valeur — son bouton "Voir" est dans un dropdown `MoreHorizontal` peu visible.

**P8. Statistiques Finance — pas de graphiques réels**
- `Finance-Statistics.tsx` affiche des chiffres textuels mais utilise `Tabs` sans graphiques `recharts`/`Chart.js`. Pour une page "Statistiques", l'absence de visualisations est un manque critique de valeur.

---

### 🟡 MEDIUM (Friction utilisateur)

**P9. Transactions — colonne "Compte" affiche `mode_paiement` au lieu du nom du compte**
- `mode_paiement` affiche des valeurs brutes comme `AIRTEL_MONEY`, `M_PESA` après remplacement basique `replace('_', ' ')`. Le nom réel du compte financier (`compte_source?.nom`) n'est pas toujours utilisé.

**P10. Navigation entre sous-modules sans breadcrumb contextuel**
- Passer d'Encaissements à la Facture associée, ou d'un Mouvement au compte source, nécessite de naviguer manuellement. Aucun lien contextuel entre entités liées.

**P11. Encaissements — montant non-pré-rempli avec solde restant**
- Dans la page `Encaissements.tsx` (CRUD standalone), le champ `montant_paye` est initialisé à `0` — il faut remplir manuellement. Le `PaiementDialog` (utilisé depuis Factures) prérempli correctement, mais la page Encaissements elle-même ne le fait pas.

**P12. Rapports — pas de prévisualisation inline**
- `Financial-Reports.tsx` liste des rapports générés mais n'a pas de prévisualisation inline (seul téléchargement). Le `pdfUrl` state existe dans `Finance-Statistics.tsx` mais pas dans les rapports.

---

### 🟢 AMÉLIORATION (Polish SaaS Premium)

**P13. Comptes — pas de carte visuelle par type de compte**
- Chaque compte devrait avoir une "carte bancaire" stylisée (comme dans les apps Revolut/Wise) différenciée par type : Mobile Money (vert), Banque (bleu), Cash (gris). Actuellement ce sont des lignes de table.

**P14. Mouvements — pas de graph en chandelier (timeline)**
- La page Mouvements est purement tabulaire. Un mini-graphique de flux (entrées en vert, sorties en rouge) sur les 30 derniers jours donnerait immédiatement une lecture visuelle du cash flow.

**P15. Transactions — statut "En attente" trop fréquent sans action**
- Les transactions créées manuellement ont souvent le statut `'En attente'` — mais il n'y a pas de workflow clair pour les "valider". Un bouton d'action rapide "Valider" en un clic serait utile.

---

## 📝 ÉVALUATION DÉTAILLÉE PAR SOUS-MODULE

### 1. TRANSACTIONS — Score : 7.5/10

**Points forts :**
- ✅ `UnifiedDataTable` avec `FilterTabs` (clients / internes / swaps)
- ✅ `PeriodFilterTabs` pour le filtrage temporel
- ✅ `ColumnSelector` + `ExportDropdown` présents
- ✅ Catégories avec couleurs dynamiques dans les badges
- ✅ `TransactionStats` component séparé — bonne séparation de responsabilités
- ✅ `TransactionFormFinancial` complet (frais, taux, devises, catégories)

**Points faibles :**
- ❌ Toutes les actions dans `MoreHorizontal` dropdown — pas d'actions directes rapides
- ❌ Statut `'En attente'` codé en dur dans `Operations-Financieres.tsx` — risque d'incohérence
- ❌ Colonne `mode_paiement` affiche les valeurs brutes DB pour les transactions clients

---

### 2. ENCAISSEMENTS — Score : 5.5/10

**Points forts :**
- ✅ Formulaire complet (type, client, facture/colis, compte, mode paiement, date, notes)
- ✅ 4 KPI cards en haut (Total encaissé, Aujourd'hui, Factures, Colis)
- ✅ Export CSV fonctionnel
- ✅ Mode édition inline (réutilise le même Dialog)

**Points faibles :**
- ❌ `Select` natif pour le client — non-searchable, inutilisable à grande échelle
- ❌ Filtres dans une `Card` séparée au lieu d'une barre horizontale compacte
- ❌ Pas de `PeriodFilterTabs` — stats toujours calculées sur tout le dataset
- ❌ Pas de `FilterTabs` pour filtrer visuellement par type (Facture / Colis)
- ❌ Pas de vue tableau standardisée (la liste est un simple `map()` HTML custom)
- ❌ KPI cards toujours blanches, sans couleur sémantique ni icônes différenciées
- ❌ Montant initialisé à `0` au lieu du solde restant de la facture

---

### 3. OPÉRATIONS FINANCIÈRES — Score : 5.0/10

**Points forts :**
- ✅ Distinction claire dépense/revenu avec badges colorés
- ✅ Filtres type + recherche texte
- ✅ Stats globales via `useOperationsFinancieres` (toutes données sans pagination)
- ✅ Export CSV

**Points faibles :**
- ❌ `window.confirm()` — anti-pattern UX bloquant, doit être remplacé par `ConfirmDialog`
- ❌ Tableau HTML custom `<table>` au lieu de `UnifiedDataTable`
- ❌ Pas de mode cards / responsive
- ❌ Pas de `ColumnSelector`
- ❌ Pas de `FilterTabs` — seul un `Select` type + champ texte
- ❌ Pas de `PeriodFilterTabs`
- ❌ Dialog de création séparé des deux boutons "Dépense" / "Revenu" — UX confuse : un seul Dialog s'ouvre mais le type est contrôlé par quel bouton a été cliqué — le `type_transaction` n'est pas visible dans le dialog
- ❌ Pas de `ConfirmDialog` pour suppression

---

### 4. COMPTES FINANCIERS — Score : 7.0/10

**Points forts :**
- ✅ `UnifiedDataTable` avec mode cards/table
- ✅ `CompteDetailModal` pour voir l'historique des mouvements d'un compte
- ✅ Icônes différenciées par type (Wallet, Building, Smartphone, CreditCard)
- ✅ Indicateur actif/inactif avec badge
- ✅ `ColumnSelector` + `ExportDropdown`

**Points faibles :**
- ❌ CRUD (créer/modifier) dans un `Dialog` inline basique, pas de `Sheet` slide-over
- ❌ Pas d'indicateur de tendance du solde (↑/↓ vs mois précédent)
- ❌ Pas de graphique d'évolution par compte
- ❌ Pas de filtre par type de compte dans la liste
- ❌ Le bouton "Voir" est dans un dropdown `MoreHorizontal` (peu visible vs action primaire)
- ❌ Pas de `FilterTabs` pour filtrer par type (Mobile Money / Banque / Cash)

---

### 5. MOUVEMENTS DE COMPTES — Score : 7.5/10

**Points forts :**
- ✅ `UnifiedDataTable` + mode responsive
- ✅ `FilterTabs` (Tous / Entrées / Sorties)
- ✅ `PeriodFilterTabs` avec sélection temporelle
- ✅ `ColumnSelector` + `ExportDropdown`
- ✅ Filtre par compte financier
- ✅ Stats globales calculées via `useMouvementsComptesStats`
- ✅ Solde avant/après affiché par mouvement

**Points faibles :**
- ❌ Pas de graphique de flux (mini sparkline)
- ❌ La recherche texte est côté client — pour de gros volumes, risque de performance
- ❌ Pas de lien cliquable vers la transaction source d'un mouvement

---

### 6. STATISTIQUES FINANCE — Score : 6.0/10

**Points forts :**
- ✅ Sélecteur de période (Journalier / Hebdo / Mensuel / Annuel)
- ✅ Preview PDF intégrée avec `pdfUrl` + Dialog
- ✅ Liste détaillée des transactions de la période
- ✅ KPIs calculés (CA, Dépenses, Bénéfice net, Frais)

**Points faibles :**
- ❌ **Pas de graphiques** — page "Statistiques" sans visualisation est un paradoxe UX
- ❌ Onglets présents (`TabsContent`) mais sans contenu différencié par onglet
- ❌ Pas de comparaison période précédente (ex: +12% vs mois dernier)
- ❌ Pas de breakdown par catégorie (camembert, barres)
- ❌ Pas de top clients (qui génère le plus de CA ?)
- ❌ Design des KPI cards identique aux cartes blanches sans différenciation sémantique

---

### 7. RAPPORTS FINANCIERS — Score : 6.5/10

**Points forts :**
- ✅ Génération de 3 types de rapports (Cash Flow, Rentabilité, Écarts)
- ✅ `FinancialReportsGenerator` et `FinancialReportsList` séparés
- ✅ Badges de statut par type de rapport
- ✅ Statistiques des rapports générés

**Points faibles :**
- ❌ Pas de prévisualisation inline des rapports — seul téléchargement
- ❌ Pas de planification automatique (ex: rapport mensuel automatique)
- ❌ Pas de filtres sur la liste des rapports générés (par date, type)

---

### 8. CATÉGORIES FINANCES — Score : 6.0/10

**Points forts :**
- ✅ `Tabs` dépenses / revenus
- ✅ Icônes emoji pour différencier les catégories
- ✅ Couleur personnalisable par catégorie
- ✅ `UnifiedDataTable` présent

**Points faibles :**
- ❌ Sélecteur de couleur textuel (input hex) sans prévisualisation — peu ergonomique
- ❌ Pas de compteur d'usage (combien de transactions utilisent cette catégorie)
- ❌ Modification inline dans le tableau sans feedback visuel clair de l'état "en édition"
- ❌ Pas de bouton "Désactiver" une catégorie sans la supprimer

---

## 💡 RECOMMANDATIONS PAR PRIORITÉ

### 📌 Priorité 1 — Fixes critiques (< 1 jour)

1. **Remplacer `window.confirm()` par `ConfirmDialog`** dans `Operations-Financieres.tsx`
2. **Remplacer `Select` client par `ClientCombobox`** dans `Encaissements.tsx`
3. **Migrer `Operations-Financieres.tsx` vers `UnifiedDataTable`** + `FilterTabs` + `PeriodFilterTabs`

### 📌 Priorité 2 — Cohérence UI (1-2 jours)

4. **Moderniser `Encaissements.tsx`** : barre de filtres horizontale + `FilterTabs` (Tous / Factures / Colis) + `PeriodFilterTabs`
5. **Ajouter `FilterTabs`** dans `Comptes.tsx` pour filtrer par type (Mobile Money / Banque / Cash)
6. **Préremplir le montant** dans `Encaissements.tsx` avec le `solde_restant` de la facture sélectionnée

### 📌 Priorité 3 — Valeur métier (2-3 jours)

7. **Ajouter des graphiques** dans `Finance-Statistics.tsx` : bar chart flux mensuel, pie chart par catégorie, line chart évolution solde
8. **Ajouter des liens contextuels** entre entités (mouvement → transaction source, encaissement → facture associée)
9. **Compteur d'usage** dans `Categories-Finances.tsx`

### 📌 Priorité 4 — Dashboard Trésorerie Unifié (3-5 jours)

10. **Créer une page `/finances/dashboard`** centrale avec :
    - Solde total de tous les comptes (breakdown par compte)
    - Flux du mois en cours (entrées vs sorties vs encaissements)
    - Factures non payées (reste à recouvrer)
    - Transactions en attente de validation
    - Graphique de trésorerie 30 jours glissants

---

## 💎 SUGGESTIONS PREMIUM SAAS (Niveau 10/10)

1. **Cartes bancaires visuelles** pour les comptes — style Revolut avec type, numéro masqué, solde et devise sur fond coloré
2. **Réconciliation automatique** — proposer de lier un encaissement à une facture ouverte quand les montants correspondent
3. **Alertes de solde** — notifier quand un compte passe sous un seuil configurable
4. **Prévision de trésorerie** — estimer le solde dans 30/60 jours basé sur les factures à échoir et les dépenses récurrentes
5. **Export comptable** — génération de fichier compatible avec la comptabilité congolaise / OHADA

---

## 🗺️ CARTOGRAPHIE DE COHÉRENCE

| Fonctionnalité | Transactions | Encaissements | Opérations | Comptes | Mouvements |
|----------------|:---:|:---:|:---:|:---:|:---:|
| `UnifiedDataTable` | ✅ | ❌ | ❌ | ✅ | ✅ |
| `FilterTabs` | ✅ | ❌ | ❌ | ❌ | ✅ |
| `PeriodFilterTabs` | ✅ | ❌ | ❌ | N/A | ✅ |
| `ColumnSelector` | ✅ | ❌ | ❌ | ✅ | ✅ |
| `ExportDropdown` | ✅ | CSV custom | CSV custom | ✅ | ✅ |
| `ClientCombobox` | ✅ | ❌ | N/A | N/A | N/A |
| `ConfirmDialog` | ✅ | ✅ | ❌ | ✅ | N/A |
| Mode cards mobile | ✅ | ❌ | ❌ | ✅ | ✅ |

**Conclusion** : Transactions et Mouvements sont les références à suivre. Encaissements et Opérations Financières nécessitent une refonte UX complète pour aligner avec le standard du projet.
