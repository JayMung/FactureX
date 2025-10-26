# Changelog - Générateur de Factures PDF

## 📅 Date : 24 Janvier 2025

### 🎯 Objectif
Adaptation du template HTML fourni pour générer des factures PDF professionnelles dans CoxiPay, basées sur le style COCCINELLE.

## 📦 Nouveaux Fichiers Créés

### 1. `src/utils/factureTemplate.ts`
**Type :** Module TypeScript  
**Taille :** ~268 lignes  
**Description :** Template HTML complet pour la génération de factures

**Fonctionnalités :**
- Structure HTML complète avec Tailwind CSS
- Design responsive et professionnel
- Support multidevise (USD/CDF)
- Support multimodal (Aérien/Maritime)
- Informations d'entreprise COCCINELLE intégrées
- Calcul automatique des totaux
- Support des images de produits

**Exports :**
- `generateFactureHTML(data: TemplateData): string`

### 2. `src/utils/pdfGeneratorHTML.ts`
**Type :** Module TypeScript  
**Taille :** ~167 lignes  
**Description :** Générateur de PDF utilisant le template HTML

**Fonctionnalités :**
- Récupération automatique des données depuis Supabase
- Calcul des totaux (sous-total, frais, transport)
- Génération et ouverture d'une fenêtre d'impression
- Option de téléchargement HTML

**Exports :**
- `generateFacturePDFHTML(facture: Facture): Promise<void>`
- `downloadFacturePDFHTML(facture: Facture): Promise<void>`

### 3. `facture-example.html`
**Type :** Fichier HTML standalone  
**Taille :** ~203 lignes  
**Description :** Exemple de facture pour tests rapides

**Utilisation :**
- Ouvrir directement dans un navigateur
- Tester l'impression et le style
- Aucune dépendance requise

### 4. `FACTURE_PDF_README.md`
**Type :** Documentation  
**Taille :** ~172 lignes  
**Description :** Documentation complète du système

**Contenu :**
- Description des fichiers
- Guide de personnalisation
- Instructions d'utilisation
- Résolution de problèmes
- Notes techniques

### 5. `GUIDE_TEST_FACTURES_PDF.md`
**Type :** Guide de test  
**Taille :** ~227 lignes  
**Description :** Procédures de test détaillées

**Contenu :**
- Tests rapides
- Tests dans l'application
- Points de vérification
- Scénarios de test
- Checklist de déploiement

### 6. `CHANGELOG_FACTURES_PDF.md`
**Type :** Changelog  
**Description :** Ce fichier - récapitulatif des modifications

## 🔄 Fichiers Modifiés

### 1. `src/pages/Factures-Create.tsx`
**Modifications :**
- Ligne 34 : Import de `generateFacturePDFHTML`
- Lignes 316-317 : Utilisation du nouveau générateur dans `handleGeneratePDF`

**Avant :**
```typescript
await generateFacturePDF(factureWithItems);
```

**Après :**
```typescript
await generateFacturePDFHTML(currentFacture);
```

### 2. `src/components/forms/FactureForm.tsx`
**Modifications :**
- Ligne 23 : Import de `generateFacturePDFHTML`
- Lignes 283-284 : Utilisation du nouveau générateur dans `handleGeneratePDF`

**Avant :**
```typescript
await generateFacturePDF(factureWithItems);
```

**Après :**
```typescript
await generateFacturePDFHTML(facture);
```

## ✨ Nouvelles Fonctionnalités

### 1. Design Professionnel
- En-tête avec informations COCCINELLE
- Tableau stylisé avec alternance de couleurs
- Sections bien définies pour client/livraison
- Footer avec informations bancaires et légales

### 2. Flexibilité
- Support de multiples articles
- Affichage des images de produits
- Conditions de vente personnalisables
- Notes additionnelles

### 3. Calculs Automatiques
- Sous-total des articles
- Frais de service (15% configurable)
- Frais de transport selon mode et poids
- Total général

### 4. Impression Optimisée
- Format A4 standard
- Marges appropriées
- Couleurs préservées
- Pas d'éléments inutiles à l'impression

## 🎨 Style et Design

### Couleurs Principales
- **Vert émeraude** (`emerald-600`) : Couleur d'accent
- **Gris** (`gray-700/800`) : Texte principal
- **Blanc/Gris clair** : Arrière-plans

### Typographie
- **Police :** Inter (Google Fonts)
- **Tailles :** Hiérarchie claire (titre > sous-titres > texte)
- **Poids :** Bold pour les éléments importants

### Mise en Page
- **Responsive :** S'adapte à différentes tailles
- **Grille :** Flexbox pour alignement
- **Espacement :** Cohérent et aéré

## 🔧 Configuration

### Informations Entreprise (à personnaliser)
Fichier : `src/utils/factureTemplate.ts`

```typescript
const COMPANY_INFO = {
  name: '@COCCINELLE',
  addresses: [...],
  phones: '...',
  email: '...',
  website: '...',
  banking: {...},
  legal: {...},
  mobilePayments: '...'
};
```

### Pourcentage des Frais
Fichier : `src/utils/pdfGeneratorHTML.ts`

```typescript
const fraisPercentage = 15; // Modifiable
```

### Tarifs de Livraison
Base de données Supabase :
- Table : `settings`
- Catégorie : `shipping`
- Clés : `frais_aerien_par_kg`, `frais_maritime_par_cbm`

## 🚀 Migration

### Depuis l'ancien générateur
L'ancien générateur (`pdfGenerator.ts`) reste disponible pour compatibilité.

**Pour revenir à l'ancien :**
```typescript
// Remplacer les imports
import { generateFacturePDF } from '@/utils/pdfGenerator';

// Dans handleGeneratePDF
await generateFacturePDF(factureWithItems);
```

## 📊 Comparaison Ancien vs Nouveau

| Aspect | Ancien (jsPDF) | Nouveau (HTML) |
|--------|----------------|----------------|
| **Rendu** | Basique | Professionnel |
| **Personnalisation** | Difficile | Facile (HTML/CSS) |
| **Images** | Limité | Complet |
| **Couleurs** | Basique | Riches |
| **Maintenance** | Complexe | Simple |
| **Performance** | Rapide | Très rapide |

## ⚠️ Points d'Attention

### 1. Popups
Les navigateurs peuvent bloquer la fenêtre d'impression :
- Solution : Autoriser les popups pour localhost/domaine

### 2. Images
Les URLs doivent être accessibles publiquement :
- Vérifier les en-têtes CORS
- Pas d'authentification requise

### 3. Impression
Activer les graphiques d'arrière-plan :
- Chrome : Paramètres → Options → Graphiques d'arrière-plan

### 4. Performance
Pour de nombreux articles (>50) :
- Envisager la pagination
- Optimiser les images

## 🧪 Tests Effectués

- ✅ Génération avec données réelles
- ✅ Impression sur Chrome, Firefox
- ✅ Export PDF
- ✅ Différentes devises (USD/CDF)
- ✅ Différents modes (Aérien/Maritime)
- ✅ Avec et sans images
- ✅ Calculs des totaux
- ✅ Responsive design

## 📈 Prochaines Améliorations Possibles

### Court Terme
- [ ] Ajouter un vrai logo COCCINELLE
- [ ] Support multi-langues (FR/EN)
- [ ] Numérotation automatique des pages

### Moyen Terme
- [ ] Envoi automatique par email
- [ ] Signature électronique
- [ ] Archivage automatique

### Long Terme
- [ ] Template builder pour utilisateurs
- [ ] Thèmes personnalisables
- [ ] Analytics sur les factures

## 🤝 Contribution

Pour toute modification ou amélioration :
1. Tester avec `facture-example.html`
2. Vérifier dans l'application
3. Mettre à jour la documentation
4. Ajouter des tests si nécessaire

## 📞 Contact & Support

- **Documentation :** `FACTURE_PDF_README.md`
- **Tests :** `GUIDE_TEST_FACTURES_PDF.md`
- **Exemple :** `facture-example.html`

## 🎉 Conclusion

Le nouveau système de génération de factures PDF est opérationnel et offre une bien meilleure expérience utilisateur avec un design professionnel aligné sur le style COCCINELLE.

---

**Version :** 1.0.0  
**Auteur :** Équipe CoxiPay  
**Date :** 24 Janvier 2025
