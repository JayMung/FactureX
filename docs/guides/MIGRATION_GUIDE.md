# Guide de Migration - Design System FactureX

## 🎯 Objectif

Appliquer de manière cohérente le design system (vert émeraude, police Inter, dark mode) à tous les composants de l'application.

---

## ✅ Composants déjà mis à jour

- ✅ `tailwind.config.ts` - Tokens de design complets
- ✅ `src/globals.css` - Variables CSS et police Inter
- ✅ `src/styles/design-system.css` - Classes utilitaires réutilisables
- ✅ `src/pages/Login.tsx` - Page de connexion
- ✅ `src/pages/LoginExample.tsx` - Page exemple
- ✅ `src/components/layout/Layout.tsx`
- ✅ `src/components/layout/Header.tsx`
- ✅ `src/components/layout/Sidebar.tsx`
- ✅ `src/components/dashboard/StatCard.tsx`
- ✅ `src/pages/Index-Protected.tsx` (partiellement)

---

## 🔄 Pattern de remplacement systématique

### 1. **Couleurs vertes (remplacer emerald par green)**

```tsx
// ❌ Ancien (emerald)
className="bg-emerald-600 hover:bg-emerald-700"
className="text-emerald-600"
className="border-emerald-200"

// ✅ Nouveau (green)
className="bg-green-500 hover:bg-green-600"
className="text-green-600 dark:text-green-400"
className="border-green-200 dark:border-green-700"
```

### 2. **Backgrounds (ajouter dark mode)**

```tsx
// ❌ Ancien
className="bg-white"
className="bg-gray-50"
className="bg-gray-100"

// ✅ Nouveau
className="bg-white dark:bg-gray-900"
className="bg-gray-50 dark:bg-gray-800"
className="bg-gray-100 dark:bg-gray-900"
```

### 3. **Textes (ajouter dark mode)**

```tsx
// ❌ Ancien
className="text-gray-900"
className="text-gray-600"
className="text-gray-500"

// ✅ Nouveau
className="text-gray-900 dark:text-white"
className="text-gray-700 dark:text-gray-300"
className="text-gray-500 dark:text-gray-400"
```

### 4. **Bordures (ajouter dark mode)**

```tsx
// ❌ Ancien
className="border-gray-200"
className="border-gray-300"

// ✅ Nouveau
className="border-gray-200 dark:border-gray-700"
className="border-gray-300 dark:border-gray-600"
```

### 5. **Boutons (utiliser classes utilitaires)**

```tsx
// ❌ Ancien
<Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
  Action
</Button>

// ✅ Nouveau (utiliser btn-primary)
<Button className="btn-primary">
  Action
</Button>

// Ou complet
<Button className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 rounded-md">
  Action
</Button>
```

### 6. **Cards (utiliser classes utilitaires)**

```tsx
// ❌ Ancien
<Card className="bg-white shadow-sm">

// ✅ Nouveau (utiliser card-base)
<Card className="card-base">

// Ou complet
<Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg rounded-lg">
```

### 7. **Inputs (utiliser classes utilitaires)**

```tsx
// ❌ Ancien
<Input className="border-gray-300" />

// ✅ Nouveau (utiliser input-base)
<Input className="input-base" />

// Ou complet
<Input className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500" />
```

### 8. **Labels (utiliser classes utilitaires)**

```tsx
// ❌ Ancien
<Label className="text-sm text-gray-700">

// ✅ Nouveau (utiliser label-base)
<Label className="label-base">

// Ou complet
<Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
```

### 9. **Badges (utiliser classes utilitaires)**

```tsx
// ❌ Ancien
<Badge className="bg-green-100 text-green-800">

// ✅ Nouveau (utiliser badge-success)
<Badge className="badge-success">

// Types disponibles
<Badge className="badge-success">  // Vert
<Badge className="badge-error">    // Rouge
<Badge className="badge-warning">  // Jaune
<Badge className="badge-info">     // Bleu
```

### 10. **Typographie (utiliser classes utilitaires)**

```tsx
// ❌ Ancien
<h1 className="text-2xl font-bold text-gray-900">

// ✅ Nouveau (utiliser heading-1, heading-2, heading-3)
<h1 className="heading-1">
<h2 className="heading-2">
<h3 className="heading-3">

// Pour texte corps
<p className="body-text">
<span className="small-text">
```

### 11. **Grids responsive (utiliser classes utilitaires)**

```tsx
// ❌ Ancien
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// ✅ Nouveau (utiliser grid-responsive-3)
<div className="grid-responsive-3">

// Types disponibles
<div className="grid-responsive-2">  // 1 col → 2 cols
<div className="grid-responsive-3">  // 1 col → 2 cols → 3 cols
<div className="grid-responsive-4">  // 1 col → 2 cols → 4 cols
```

### 12. **Banners/Sections gradient**

```tsx
// ❌ Ancien
<div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg p-6 text-white">

// ✅ Nouveau (utiliser banner-gradient-green)
<div className="banner-gradient-green">
```

---

## 🎨 Classes utilitaires disponibles

Voir `src/styles/design-system.css` pour la liste complète :

- **Typographie** : `.heading-1`, `.heading-2`, `.heading-3`, `.body-text`, `.small-text`
- **Boutons** : `.btn-primary`, `.btn-secondary`
- **Cards** : `.card-base`
- **Inputs** : `.input-base`
- **Labels** : `.label-base`
- **Badges** : `.badge-success`, `.badge-error`, `.badge-warning`, `.badge-info`
- **Grids** : `.grid-responsive-2`, `.grid-responsive-3`, `.grid-responsive-4`
- **Backgrounds** : `.bg-page`, `.bg-card`, `.bg-hover`
- **Textes status** : `.text-success`, `.text-error`, `.text-warning`, `.text-info`
- **Transitions** : `.transition-base`, `.transition-shadow-hover`
- **Autres** : `.banner-gradient-green`, `.divider-base`, `.skeleton`, `.overlay-dark`

---

## 📋 Checklist par type de fichier

### Pages (`src/pages/*.tsx`)

Pour chaque page :
- [ ] Remplacer `emerald` par `green`
- [ ] Ajouter dark mode à tous les backgrounds
- [ ] Ajouter dark mode à tous les textes
- [ ] Ajouter dark mode à toutes les bordures
- [ ] Utiliser classes utilitaires (`.card-base`, `.btn-primary`, etc.)
- [ ] Vérifier les ombres (`.shadow-md`, `.hover:shadow-lg`)
- [ ] Ajouter `.rounded-md` ou `.rounded-lg` partout
- [ ] Focus rings verts (`.focus:ring-green-500`)

### Composants modaux (`src/components/modals/*.tsx`)

- [ ] Cards avec `.card-base`
- [ ] Buttons avec `.btn-primary` ou classes complètes
- [ ] Inputs avec `.input-base`
- [ ] Labels avec `.label-base`
- [ ] Overlay avec `.overlay-dark`
- [ ] Dark mode complet

### Formulaires (`src/components/forms/*.tsx`)

- [ ] Inputs avec `.input-base`
- [ ] Labels avec `.label-base`
- [ ] Buttons avec `.btn-primary`
- [ ] Validation errors en rouge avec dark mode
- [ ] Espacements cohérents (`.space-y-4`, `.space-y-6`)

### Composants UI (`src/components/ui/*.tsx`)

Ces composants shadcn héritent déjà des tokens via `tailwind.config.ts` et `globals.css`.
Vérifier seulement si des classes custom doivent être ajoutées.

---

## 🚀 Commandes de test

Après chaque modification :

```bash
# Lancer le dev server
npm run dev

# Vérifier les erreurs TypeScript
npm run build

# (Optionnel) Linter
npm run lint
```

---

## 💡 Astuces

1. **Recherche globale** : Utilisez votre éditeur pour rechercher et remplacer :
   - `emerald-600` → `green-500`
   - `emerald-700` → `green-600`
   - `emerald-500` → `green-500`
   - `emerald` → `green` (attention aux faux positifs)

2. **Regex utile** : Pour trouver tous les endroits sans dark mode :
   - `bg-white[^-]` (backgrounds blancs sans dark mode)
   - `text-gray-900[^-]` (textes sans dark mode)
   - `border-gray-[0-9]+[^-]` (bordures sans dark mode)

3. **Priorité** : Commencez par :
   1. Layout components (✅ Déjà fait)
   2. Pages principales (en cours)
   3. Modales
   4. Formulaires
   5. Composants dashboard

---

## 📝 Exemple complet de transformation

**Avant :**
```tsx
<Card className="bg-white shadow-sm">
  <CardHeader>
    <CardTitle className="text-xl font-bold text-gray-900">
      Mon Titre
    </CardTitle>
  </CardHeader>
  <CardContent>
    <Label className="text-sm text-gray-700">Email</Label>
    <Input 
      type="email" 
      className="border-gray-300"
    />
    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4">
      Envoyer
    </Button>
  </CardContent>
</Card>
```

**Après :**
```tsx
<Card className="card-base">
  <CardHeader className="p-6">
    <CardTitle className="heading-3">
      Mon Titre
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6 pt-0">
    <Label className="label-base">Email</Label>
    <Input 
      type="email" 
      className="input-base"
      placeholder="vous@exemple.com"
    />
    <Button className="w-full btn-primary mt-6">
      Envoyer
    </Button>
  </CardContent>
</Card>
```

---

✨ **Bon courage pour la migration !**
