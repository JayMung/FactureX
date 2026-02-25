# 🧾 UX/UI AUDIT COMPLET — MODULE FACTURES (FACTUREX)

**Date** : 23 Février 2026
**Rôle** : Senior SaaS UX Architect + Product Designer
**Cible** : Module Factures (B2B SaaS Multi-tenant)

---

## 📊 SCORE GLOBAL : 7.2 / 10
**Verdict** : Le module bénéficie d'une excellente base technique (pagination serveur, design system cohérent, composants réutilisables). Cependant, il souffre d'un manque crucial de profondeur **métier** pour la facturation (absence des notions d'échéance et de recouvrement), ce qui l'empêche d'atteindre le standard "Premium SaaS B2B".

---

## 🏆 SCORES PAR SECTION

| Phase | Domaine | Score |
|-------|---------|-------|
| 1 | Hiérarchie Visuelle (KPIs) | 6/10 |
| 2 | Liste & Table UX | 7.5/10 |
| 3 | Recherche & Filtres | 8/10 |
| 4 | Interactions | 8/10 |
| 5 | Responsive Mobile | 8.5/10 |
| 6 | Performance Perçue | 9/10 |
| 7 | Design System | 9/10 |
| 8 | UX Métier Avancée | 4/10 |

---

## 🚨 CLASSIFICATION DES PROBLÈMES

### 🔴 CRITIQUE (Bloquant pour la valeur métier)
1. **[Métier] Modèle de données incomplet** : Il manque la `date_echeance`, le `montant_paye` et le `solde_restant` sur la facture. Sans cela, impossible de gérer les impayés et les retards.
2. **[KPI] Hiérarchie des KPIs** : Les KPIs actuels (Total USD, Total CDF, Total Factures, Frais) sont des métriques de "production", pas de "recouvrement". L'utilisateur ne sait pas combien d'argent est dehors ni s'il a des factures en retard.

### 🟠 HIGH (Impact fort sur l'UX)
3. **[Filtres] Statuts métier manquants** : Les statuts actuels (`brouillon`, `en_attente`, `validee`, `payee`, `annulee`) ne reflètent pas la réalité d'un ERP. Il manque `partiellement_payee` et un indicateur dynamique `en_retard`.
4. **[Table] Actions rapides absentes** : Dans la table, les actions sont limitées (Voir, Dupliquer, Éditer, Supprimer). Il manque cruellement : "Enregistrer un paiement", "Télécharger le PDF" (en un clic), "Envoyer par email".

### 🟡 MEDIUM (Friction utilisateur)
5. **[Interactions] Redondance d'information** : La barre de "Bulk Actions" (très bien conçue) affiche un résumé financier redondant avec les KPIs du haut lorsqu'on sélectionne des factures, surchargeant l'interface.
6. **[Navigation] Liens morts** : Le nom du client dans la table n'est pas cliquable pour ouvrir une modale rapide (Quick View) ou rediriger vers sa fiche.

### 🟢 AMÉLIORATION (Polish SaaS Premium)
7. **[Filtres] Filtre client** : La recherche texte cherche le client, mais un vrai `<ClientCombobox>` dans les filtres serait plus robuste.
8. **[UI] Indicateur visuel d'urgence** : Pas de code couleur sur les dates ou les montants pour attirer l'œil (ex: échéance dépassée en rouge).

---

## 📝 ÉVALUATION DÉTAILLÉE PAR PHASE

### PHASE 1 — HIÉRARCHIE VISUELLE
- **Les KPI sont-ils pertinents ?** Non. "Total Frais" ou "Total CDF" prennent de l'espace précieux. Un comptable veut voir : **Chiffre d'Affaires (Mois) | Reste à recouvrer | En Retard**.
- **Le KPI principal est-il évident ?** Non, les 4 cartes ont le même poids visuel (dégradés forts pour toutes).
- **Couleurs** : Très jolies, mais sémantiquement neutres (Violet, Vert, Bleu, Orange). Aucune n'alerte l'utilisateur sur une urgence.
- **Surcharge visuelle** : L'utilisation de dégradés forts sur 4 cartes + une barre d'action bleue (au clic) + des pills de filtres colorés crée une légère surcharge cognitive.

### PHASE 2 — LISTE & TABLE UX
- **Lisibilité** : Très bonne. L'utilisation de `UnifiedDataTable` garantit un espacement standard.
- **Hiérarchisation** : Le N° de facture cliquable en vert est très bien. L'alignement à droite des montants est respecté.
- **Actions** : Intuitives via icônes (Lucide), mais enfermées dans un sous-menu (`DropdownMenu`) pour les changements de statuts.
- **Bouton Colonnes** : `ColumnSelector` présent et fonctionnel.
- **Bulk Actions** : Excellente implémentation (changement de statut en masse, suppression, total calculé à la volée).

### PHASE 3 — RECHERCHE & FILTRES
- **Recherche** : Visible, placeholder clair ("Rechercher par numéro ou client...").
- **Filtres par statut** : Implémentation brillante via `FilterTabs` avec compteurs (`count: globalTotals.totalCount`). L'état actif est très clair.
- **Période** : Sélecteur rapide (Aujourd'hui, Semaine, Mois, Année) très apprécié en SaaS.

### PHASE 4 — INTERACTIONS
- **Hover states** : Cohérents (lignes, numéros soulignés, boutons).
- **Feedback** : Utilisation de `showSuccess` et `showError` (Toasts).
- **Confirmation** : `ConfirmDialog` bien implémenté pour la suppression.
- **Loader** : État `isLoading` passé à la table. Un skeleton loader serait un plus par rapport à un spinner.

### PHASE 5 — RESPONSIVE MOBILE (Score: 8.5/10)
- **KPI** : Stacked par 2 via `grid-cols-2 md:grid-cols-4`. Parfait.
- **Table** : `UnifiedDataTable` gère le mode `cards` sur mobile (`viewMode="auto"`), excellente pratique !
- **Filtres** : Stacked en flex-col sur mobile, select en full width.

### PHASE 6 — PERFORMANCE PERÇUE (Score: 9/10)
- **Architecture** : Parfaite. La pagination et les tris sont délégués au backend via la RPC `get_factures_with_totals_secure`.
- **Scalabilité** : Peut gérer 100 000+ factures sans ralentissement du navigateur.

### PHASE 7 — DESIGN SYSTEM (Score: 9/10)
- **Cohérence** : Excellente utilisation de Tailwind et Shadcn UI.
- **Badges** : Le `getStatutBadge` utilise bien le token system (destructive = red, secondary = yellow/gray, default = green/blue).

### PHASE 8 — UX MÉTIER AVANCÉE (Score: 4/10)
- ❌ **Détails client** : Pas de slide-over ou de lien direct.
- ❌ **Historique des relances** : Inexistant.
- ✅ **Duplication** : Fonctionnalité présente et bien implémentée (`sessionStorage` pass).
- ❌ **Avoir** : Pas de distinction "Avoir" (Refund/Credit Note). Seulement Devis/Facture.
- ❌ **Risque & Échéances** : Impossible à déterminer avec le modèle de données actuel.

---

## 💡 RECOMMANDATIONS CONCRÈTES (PAR PRIORITÉ)

### 📌 Priorité 1 : Refonte du Modèle de Données (Backend + Frontend)
1. Ajouter la colonne `date_echeance` dans la table `factures`.
2. Gérer automatiquement les statuts `en_retard` (si date_echeance < now() et statut != payee) et `partiellement_payee`.
3. Ajouter `montant_paye` et `solde_restant` à la table `factures` (idéalement via des triggers liés aux paiements).

### 📌 Priorité 2 : Refonte de la Zone des KPIs (Dashboard Header)
Remplacer les 4 cartes actuelles par des KPIs orientés "Action" :
1. **Reste à recouvrer** (Total des factures validées non payées) — *Couleur: Warning (Orange)*
2. **En Retard** (Montant total des factures dont l'échéance est dépassée) — *Couleur: Destructive (Rouge)*
3. **Chiffre d'Affaires Ce Mois** (Total facturé validé) — *Couleur: Success (Vert)*
4. **En attente de validation** (Volume de brouillons/devis) — *Couleur: Neutre (Gris/Bleu)*

### 📌 Priorité 3 : Amélioration de la DataTable
1. **Nouvelles Colonnes** :
   - `Échéance` (avec badge rouge si dépassée)
   - `Reste à payer` (au lieu du simple `Montant` total)
2. **Actions Rapides (Ligne)** : Sortir "Enregistrer un paiement" et "Télécharger PDF" du sous-menu pour les mettre en actions directes d'un clic (icônes Dollar et Download).

### 📌 Priorité 4 : Enrichissement des Filtres
1. Remplacer la recherche texte basique par deux éléments :
   - Un `ClientCombobox` pour filtrer de manière stricte par client (ID).
   - Un vrai champ de recherche dédié au Numéro de facture / Référence.
2. Ajouter un filtre de Montant (ex: factures > 1000$).

---

## 💎 SUGGESTIONS PREMIUM SAAS (Niveau 10/10)

1. **Slide-over "Quick View"** : Au lieu de rediriger vers une page `/factures/view/:id`, ouvrir la facture dans un panneau latéral (Slide-over) à droite. Cela permet de consulter une facture sans perdre le contexte de sa liste filtrée.
2. **Aperçu PDF intégré** : Dans la vue de détail, intégrer une visionneuse PDF directement dans l'interface plutôt que d'obliger le téléchargement.
3. **Onglet "Timeline/Historique"** : Dans le détail d'une facture, ajouter un onglet affichant l'audit log : *Créée le X, Validée le Y, Envoyée par email le Z, Vue par le client le W, Paiement partiel reçu le V.*
4. **Indicateur de "Santé Payeur"** : Sur la ligne du client dans la table, afficher un petit point vert/rouge indiquant si ce client a l'habitude de payer en retard ou non (basé sur l'historique global de ses factures).
