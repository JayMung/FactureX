# Audit Complet — Page Login FactureX

**Date** : 21 février 2026  
**Fichier** : `src/pages/Login.tsx` (372 lignes)  
**Branche** : `feature/modification-ui-ux`

---

## 1. 🔍 Audit Design Desktop

### Layout
| Élément | État | Verdict |
|---------|------|---------|
| Split 50/50 (hero + form) | `md:flex-row`, `md:w-1/2` | ✅ Bon pattern |
| Hero masqué mobile | `hidden md:flex` | ✅ Correct |
| Centrage formulaire | `flex items-center justify-center` | ✅ OK |
| Max-width formulaire | `max-w-md` (448px) | ✅ Confortable |

### Problèmes Desktop

| # | Sévérité | Problème | Détail |
|---|----------|----------|--------|
| D1 | 🟡 MEDIUM | **Hero image opacity trop faible** | `opacity-20` rend l'image quasi invisible. L'espace hero semble vide. |
| D2 | 🟡 MEDIUM | **Pagination dots non interactifs** | 3 dots statiques (lignes 154-158) qui simulent un carousel inexistant. Trompeur pour l'utilisateur. |
| D3 | 🟡 MEDIUM | **Bouton CTA gris au lieu de vert** | Le bouton "Connexion" est `bg-gray-900` — incohérent avec l'identité verte de la marque. Le bouton "Envoyer le lien" (reset password) est `bg-green-600` — incohérence entre les deux formulaires. |
| D4 | 🟢 LOW | **Pas de footer/copyright** | Aucune mention légale, version, ou lien politique de confidentialité. |
| D5 | 🟢 LOW | **"Se souvenir de moi" non fonctionnel** | La checkbox `remember` (ligne 262) n'est connectée à aucun state ni logique. Élément mort. |
| D6 | 🟢 LOW | **Blobs décoratifs peu visibles** | `bg-white/10 blur-3xl` — quasi imperceptibles sur le gradient vert. |

---

## 2. 📱 Audit Mobile Responsiveness

### Breakpoints testés

| Breakpoint | Comportement | Verdict |
|------------|-------------|---------|
| **375px** (iPhone SE) | Hero masqué, logo mobile centré, form plein écran | ✅ |
| **390px** (iPhone 14) | Idem | ✅ |
| **768px** (iPad) | Transition vers split layout | ✅ |
| **1024px** (Desktop) | Split 50/50 complet | ✅ |
| **1440px** (Large) | Formulaire centré, hero étiré | ✅ |

### Problèmes Mobile

| # | Sévérité | Problème | Détail |
|---|----------|----------|--------|
| M1 | 🔴 HIGH | **Pas de `min-h-[100dvh]`** | `min-h-screen` ne prend pas en compte la barre d'adresse mobile (Safari/Chrome). Le formulaire peut être coupé en bas sur iOS. |
| M2 | 🟡 MEDIUM | **Padding insuffisant en bas** | `p-6` sur mobile — le bouton "Connexion" peut être collé au bord inférieur sur petits écrans avec clavier ouvert. Manque `pb-safe` ou padding bottom supplémentaire. |
| M3 | 🟡 MEDIUM | **Logo mobile trop gros** | `w-16 h-16` (64px) + texte `text-2xl` prend beaucoup d'espace vertical sur petit écran. Devrait être `w-12 h-12` + `text-xl`. |
| M4 | 🟢 LOW | **Pas de viewport-fit=cover** | Pour les écrans avec encoche (iPhone X+), le contenu ne s'étend pas dans les safe areas. |

---

## 3. 🎨 Audit UI/UX

### Hiérarchie Visuelle

| Élément | Taille | Poids | Verdict |
|---------|--------|-------|---------|
| Titre hero | `text-4xl lg:text-5xl bold` | Fort | ✅ |
| Titre form | `text-3xl lg:text-4xl bold` | Fort | ⚠️ Trop similaire au hero — compétition visuelle |
| Sous-titre form | `text-sm gray-600` | Faible | ✅ |
| Labels | `text-sm font-medium gray-700` | Moyen | ✅ |
| Bouton CTA | `text-base font-semibold h-12` | Fort | ✅ Taille OK |

**Problème** : Le titre du formulaire (`text-3xl lg:text-4xl`) est presque aussi imposant que le hero. Sur desktop, les deux titres se battent pour l'attention. Le titre form devrait être `text-2xl lg:text-3xl`.

### Accessibilité (WCAG 2.1)

| # | Sévérité | Problème | Critère WCAG |
|---|----------|----------|-------------|
| A1 | 🔴 HIGH | **Checkbox native sans style accessible** | La checkbox `remember` (ligne 262) utilise un `<input>` natif sans composant accessible. Pas de focus ring visible conforme. | 2.4.7 |
| A2 | 🔴 HIGH | **Bouton eye/password sans `aria-label`** | Le toggle password (ligne 250-256) est un `<button>` avec uniquement une icône. Aucun `aria-label` pour les lecteurs d'écran. | 1.1.1 |
| A3 | 🟡 MEDIUM | **Bouton "Retour" sans `aria-label`** | Le bouton retour (ligne 286-296) dans le forgot password n'a pas d'`aria-label`. | 1.1.1 |
| A4 | 🟡 MEDIUM | **Alert d'erreur sans `role="alert"`** | L'alerte d'erreur (ligne 200-206) utilise le composant `Alert` mais ne force pas `role="alert"` pour l'annonce automatique aux lecteurs d'écran. | 4.1.3 |
| A5 | 🟡 MEDIUM | **Contraste "Mot de passe oublié?"** | `text-green-600` sur fond blanc = ratio ~3.5:1. En dessous du minimum 4.5:1 pour texte normal. | 1.4.3 |
| A6 | 🟢 LOW | **Pas de `autocomplete` sur les inputs** | Les champs email/password n'ont pas `autoComplete="email"` / `autoComplete="current-password"`. Les gestionnaires de mots de passe peuvent ne pas les détecter. | 1.3.5 |

### Cohérence Design System

| Élément | Login | Design System (`design-system.css`) | Cohérent ? |
|---------|-------|-------------------------------------|------------|
| Input border-radius | `rounded-lg` (8px) | `.input-base` = `rounded-md` (6px) | ❌ |
| Input height | `h-12` (48px) | Non défini | ⚠️ |
| Bouton CTA | `bg-gray-900 rounded-lg` | `.btn-primary` = `bg-green-500 rounded-md` | ❌ |
| Label color | `text-gray-700` | `.label-base` = `text-gray-900` | ❌ |
| Placeholder color | `placeholder:text-gray-400` | `.input-base` = `placeholder:text-gray-500` | ❌ |

**Verdict** : La page Login n'utilise **aucune** classe du design system. Elle est entièrement stylée en inline Tailwind, créant des incohérences avec le reste de l'app.

---

## 4. ⚡ Audit Performance Perçue

| # | Sévérité | Problème | Impact |
|---|----------|----------|--------|
| P1 | 🔴 HIGH | **Image hero non optimisée** | `/login-hero.png` chargée en PNG sans lazy loading, sans `srcset`, sans format WebP. Sur connexion lente, le hero est vide pendant le chargement. |
| P2 | 🟡 MEDIUM | **Google Fonts bloquant** | `@import url('https://fonts.googleapis.com/css2?family=Inter...')` dans `globals.css` est render-blocking. Devrait utiliser `<link rel="preload">` ou `font-display: swap`. |
| P3 | 🟡 MEDIUM | **Pas de skeleton/placeholder pendant auth** | Quand l'utilisateur clique "Connexion", seul un spinner apparaît dans le bouton. Pas de feedback visuel sur le formulaire (les inputs restent actifs, l'utilisateur peut re-cliquer). |
| P4 | 🟡 MEDIUM | **Rate limiter fait un appel réseau avant chaque login** | `serverRateLimiter.check('login', identifier)` est appelé AVANT `signInWithPassword`. Ajoute de la latence perçue. |
| P5 | 🟢 LOW | **Session security initialisée sur la page login** | `useSessionSecurity()` (ligne 32-38) est appelé sur la page login alors que l'utilisateur n'est pas encore connecté. Travail inutile. |

---

## 5. 🛠️ Plan d'Amélioration Concret

### Sprint 1 — Critiques (estimé : 1h)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| **FIX-1** | Remplacer `min-h-screen` par `min-h-[100dvh]` | `Login.tsx:133` | 1 min |
| **FIX-2** | Ajouter `aria-label` au toggle password | `Login.tsx:250` | 2 min |
| **FIX-3** | Ajouter `aria-label` au bouton retour | `Login.tsx:286` | 1 min |
| **FIX-4** | Ajouter `autoComplete="email"` et `autoComplete="current-password"` | `Login.tsx:215,241` | 2 min |
| **FIX-5** | Bouton CTA : `bg-gray-900` → `bg-green-600 hover:bg-green-700` | `Login.tsx:275` | 1 min |
| **FIX-6** | Désactiver les inputs pendant le loading | `Login.tsx:215,241` | 5 min |
| **FIX-7** | Supprimer checkbox "Se souvenir de moi" (non fonctionnelle) | `Login.tsx:261-270` | 1 min |

### Sprint 2 — Améliorations UX (estimé : 30min)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| **UX-1** | Réduire titre form à `text-2xl lg:text-3xl` | `Login.tsx:191` | 1 min |
| **UX-2** | Supprimer pagination dots statiques | `Login.tsx:153-158` | 1 min |
| **UX-3** | Augmenter opacity hero image à `opacity-30` ou `opacity-40` | `Login.tsx:162` | 1 min |
| **UX-4** | Réduire logo mobile à `w-12 h-12` + `text-xl` | `Login.tsx:180-183` | 2 min |
| **UX-5** | Ajouter `pb-8` sur mobile pour espace bas | `Login.tsx:176` | 1 min |
| **UX-6** | Aligner border-radius avec design system (`rounded-md`) | `Login.tsx` (tous inputs/boutons) | 5 min |
| **UX-7** | Corriger contraste "Mot de passe oublié?" → `text-green-700` | `Login.tsx:235` | 1 min |

### Sprint 3 — Performance (estimé : 20min)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| **PERF-1** | Convertir `login-hero.png` en WebP + ajouter `loading="lazy"` | `public/login-hero.png`, `Login.tsx:164` | 10 min |
| **PERF-2** | Déplacer Google Fonts vers `<link rel="preload">` dans `index.html` | `globals.css`, `index.html` | 5 min |
| **PERF-3** | Supprimer `useSessionSecurity()` de la page Login | `Login.tsx:32-38` | 2 min |

---

## Résumé des Scores

| Catégorie | Score | Commentaire |
|-----------|-------|-------------|
| **Design Desktop** | 7/10 | Bon layout, mais CTA gris incohérent, hero sous-exploité |
| **Mobile** | 6/10 | Fonctionnel mais `min-h-screen` bug iOS, padding insuffisant |
| **Accessibilité** | 4/10 | Manque `aria-label`, `autocomplete`, contraste insuffisant |
| **Cohérence DS** | 3/10 | Aucune classe du design system utilisée |
| **Performance** | 6/10 | Image non optimisée, font bloquante |
| **Score Global** | **5.2/10** | Fonctionnel mais nécessite un polish significatif |

---

## Priorité d'Implémentation

```
FIX-1 → FIX-2 → FIX-5 → FIX-4 → FIX-6 → FIX-7 → UX-1 → UX-7 → UX-6 → PERF-1 → PERF-3
```

**Temps total estimé : ~2h pour atteindre un score 8/10**
