# Cotheme — UI Kit & Design System Guidelines

> **Version** : 3.0 — Dernière mise à jour : 2026-03-15
> **Mainteneur** : Équipe Design System FactureX
> **Color Space** : OKLCH (perceptually uniform)

## Philosophie

Le design system Cotheme repose sur quatre principes fondamentaux :

1. **Token-first** — Toute valeur visuelle (couleur, espacement, typographie) provient du fichier `tokens.ts`. Aucune valeur "magique" dans le code.
2. **Composants CVA** — Les variantes sont gérées via `class-variance-authority` pour la cohérence.
3. **OKLCH Color Space** — Toutes les couleurs utilisent OKLCH pour l'uniformité perceptuelle. Les CSS variables dans `globals.css` utilisent `oklch()`.
4. **Density & Presets** — Supporte plusieurs palettes de couleurs (presets) et modes de densité (compact, comfortable, spacious).

---

## Architecture

```
src/
├── lib/
│   └── design-system/
│       ├── index.ts          # Public API — re-exports everything
│       ├── tokens.ts         # Design primitives (colors, spacing, shadows…)
│       └── theme.ts          # Light/dark theme maps, semantic colors
├── styles/
│   └── design-system.css     # Utility classes (@apply-based)
├── globals.css               # CSS variables (:root / .dark)
├── components/
│   └── ui/                   # Reusable UI components (shadcn + custom)
│       ├── button.tsx         # CVA variants: default, destructive, outline, secondary, ghost, link, warning, success
│       ├── badge.tsx          # CVA variants: default, secondary, destructive, outline, success, warning, error, info, neutral
│       ├── alert.tsx          # CVA variants: default, destructive, success, warning, info
│       ├── spinner.tsx        # Spinner, PageLoader, InlineLoader
│       ├── skeleton.tsx       # Skeleton loader
│       ├── stat-card.tsx      # StatCard with trend indicators
│       ├── empty-state.tsx    # EmptyState with icon + action
│       ├── status-dot.tsx     # StatusDot (success, warning, error, info, neutral)
│       ├── enhanced-table.tsx # Sortable table with dark mode
│       ├── pagination-custom.tsx # Responsive pagination
│       ├── card.tsx           # Card, CardHeader, CardTitle, CardContent, CardFooter
│       ├── input.tsx          # Input with focus ring
│       ├── select.tsx         # Radix Select
│       ├── checkbox.tsx       # Radix Checkbox
│       ├── dialog.tsx         # Modal/Dialog
│       ├── tabs.tsx           # Radix Tabs
│       └── ...                # 60+ shadcn components
└── tailwind.config.ts         # Tailwind config consuming tokens
```

---

## 1. Design Tokens

Import from `@/lib/design-system`:

```typescript
import { colors, spacing, shadows, typography, transitions } from '@/lib/design-system';
```

### Color System (OKLCH)

All colors are defined in OKLCH color space for perceptual uniformity. CSS variables use `oklch()` directly.

| Token          | Role                       | Light OKLCH                | Dark OKLCH                 |
|----------------|----------------------------|----------------------------|----------------------------|
| `primary`      | Brand actions, CTAs        | `oklch(0.55 0.19 160)`    | `oklch(0.6 0.19 160)`     |
| `secondary`    | Secondary surfaces         | `oklch(0.97 0 0)`         | `oklch(0.25 0.02 260)`    |
| `muted`        | Muted text, backgrounds    | `oklch(0.97 0 0)`         | `oklch(0.25 0.02 260)`    |
| `accent`       | Hover states, highlights   | `oklch(0.97 0 0)`         | `oklch(0.25 0.02 260)`    |
| `destructive`  | Error/destructive actions  | `oklch(0.637 0.237 25)`   | `oklch(0.5 0.2 25)`       |
| `success`      | Positive states            | `oklch(0.627 0.194 149)`  | `oklch(0.627 0.194 149)`  |
| `warning`      | Caution states             | `oklch(0.75 0.183 55)`    | `oklch(0.75 0.183 55)`    |
| `info`         | Informational states       | `oklch(0.6 0.19 240)`     | `oklch(0.6 0.19 240)`     |

### Color Presets

Switchable via CSS class on `<html>` element:

| Preset      | Hue  | Chroma | CSS Class          |
|-------------|------|--------|--------------------|
| Emerald     | 160  | 0.19   | `.preset-emerald`  |
| Blue        | 240  | 0.19   | `.preset-blue`     |
| Violet      | 300  | 0.18   | `.preset-violet`   |
| Rose        | 350  | 0.20   | `.preset-rose`     |
| Orange      | 55   | 0.20   | `.preset-orange`   |
| Slate       | 260  | 0.02   | `.preset-slate`    |

### Density Modes

| Mode        | Factor | CSS Class            |
|-------------|--------|----------------------|
| Compact     | 0.75   | `.density-compact`   |
| Comfortable | 1.00   | `.density-comfortable` |
| Spacious    | 1.25   | `.density-spacious`  |

### Spacing (4px grid)

```
0.5 = 2px  |  1 = 4px  |  2 = 8px  |  3 = 12px  |  4 = 16px
5 = 20px   |  6 = 24px |  8 = 32px |  10 = 40px |  12 = 48px
```

### Typography

| Token     | Family                          | Notes                      |
|-----------|---------------------------------|----------------------------|
| `sans`    | Geist Sans → Inter → system-ui  | Primary UI font            |
| `mono`    | Geist Mono → JetBrains Mono     | Code, tabular numbers      |

| Size    | Value    | Use case                       |
|---------|----------|--------------------------------|
| `2xs`   | 10px     | Sidebar section headers, badges|
| `xs`    | 12px     | Captions, meta text            |
| `sm`    | 14px     | Body text, labels              |
| `base`  | 16px     | Default body                   |
| `lg`    | 18px     | Section titles                 |
| `xl`    | 20px     | Page subtitles                 |
| `2xl`   | 24px     | Page titles                    |
| `3xl`   | 30px     | Hero headings                  |

### Border Radius

```
sm = calc(var(--radius) - 4px)    → ~6px
md = calc(var(--radius) - 2px)    → ~8px
lg = var(--radius)                → 10px (0.625rem)
xl = calc(var(--radius) + 4px)    → ~14px
2xl = calc(var(--radius) + 8px)   → ~18px
full = 9999px                     → pill shape
```

### Shadow System

| Token           | Use case                |
|-----------------|-------------------------|
| `xs`            | Subtle depth            |
| `card`          | Card resting state      |
| `card-hover`    | Card hover elevation    |
| `md`            | Dropdowns               |
| `dropdown`      | Popovers, menus         |
| `lg`            | Modals                  |
| `focus-primary` | Focus ring glow (OKLCH) |

### Transitions

| Duration | Use case                     |
|----------|------------------------------|
| `100ms`  | Color changes                |
| `150ms`  | Interactive elements (hover) |
| `200ms`  | Shadow transitions           |
| `300ms`  | Layout changes (sidebar)     |

Easing: `cubic-bezier(0.4, 0, 0.2, 1)` for interactions, `ease-in-out` for layout.

---

## 2. Component Reference

### Button

```tsx
import { Button } from '@/components/ui/button';

// Variants
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Danger</Button>
<Button variant="warning">Warning</Button>
<Button variant="success">Success</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="xs">Tiny</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">🔍</Button>
<Button size="icon-sm">🔍</Button>

// Loading state
<Button loading>Saving...</Button>

// Mobile: use full width
<Button className="w-full sm:w-auto">Responsive</Button>
```

### Badge

```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="info">New</Badge>
<Badge variant="neutral">Draft</Badge>

// With status dot
<Badge variant="success" dot>Online</Badge>
<Badge variant="error" dot>Offline</Badge>
```

### Alert

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

<Alert variant="success">
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>Operation completed.</AlertDescription>
</Alert>

<Alert variant="warning">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>Check your data.</AlertDescription>
</Alert>

<Alert variant="info">
  <Info className="h-4 w-4" />
  <AlertTitle>Info</AlertTitle>
  <AlertDescription>New feature available.</AlertDescription>
</Alert>

<Alert variant="destructive">
  <XCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

### Spinner / Loaders

```tsx
import { Spinner, PageLoader, InlineLoader } from '@/components/ui/spinner';

// Standalone spinner
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" variant="muted" />

// Full page loader
<PageLoader message="Chargement des données..." />

// Inline loader
<InlineLoader message="Mise à jour..." />
```

### StatCard

```tsx
import { StatCard } from '@/components/ui/stat-card';
import { DollarSign } from 'lucide-react';

<StatCard
  title="Total Revenue"
  value="$12,450"
  icon={DollarSign}
  iconColor="text-green-600"
  trend={{ value: 12.5, label: "vs last month" }}
/>

// Loading state
<StatCard title="Revenue" value="" loading />
```

### EmptyState

```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

<EmptyState
  icon={FileText}
  title="Aucune facture"
  description="Créez votre première facture pour commencer."
  action={<Button>Créer une facture</Button>}
/>
```

### StatusDot

```tsx
import { StatusDot } from '@/components/ui/status-dot';

<StatusDot status="success" />
<StatusDot status="warning" size="lg" />
<StatusDot status="error" pulse />

// With label
<div className="flex items-center gap-2">
  <StatusDot status="active" label="Online" />
  <span className="text-sm">En ligne</span>
</div>
```

### EnhancedTable

```tsx
import { EnhancedTable } from '@/components/ui/enhanced-table';

<EnhancedTable
  data={items}
  columns={[
    { key: 'name', title: 'Nom', sortable: true },
    { key: 'amount', title: 'Montant', align: 'right', sortable: true },
    { key: 'status', title: 'Statut', hiddenOn: 'md', render: (v) => <Badge>{v}</Badge> },
  ]}
  loading={isLoading}
  emptyMessage="Aucune donnée"
  onSort={handleSort}
  sortKey={sortKey}
  sortDirection={sortDir}
  actionsColumn={{ render: (item) => <ActionMenu item={item} /> }}
/>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Revenue</CardTitle>
  </CardHeader>
  <CardContent>
    <p>$12,450.00</p>
  </CardContent>
</Card>
```

---

## 3. CSS Utility Classes

Available in `src/styles/design-system.css`:

### Typography
- `.heading-1` through `.heading-4`
- `.body-text`, `.small-text`, `.label-base`, `.text-mono`
- `.section-label` — 10px uppercase tracking-widest (sidebar section headers)

### Layout
- `.container-page` — max-w-7xl with responsive padding
- `.container-fluid`, `.container-boxed` — layout modes
- `.grid-responsive-2`, `.grid-responsive-3`, `.grid-responsive-4`
- `.mobile-full-width`, `.mobile-stack`, `.mobile-hide`, `.desktop-hide`

### Cards & Surfaces
- `.card-base`, `.card-clean`, `.stat-card`
- `.metric-card`, `.metric-card-icon`, `.metric-card-value`, `.metric-card-sparkline`
- `.banner-gradient-green`, `.banner-compact`

### Status
- `.badge-success`, `.badge-error`, `.badge-warning`, `.badge-info`, `.badge-neutral`
- `.badge-sidebar` — sidebar notification badge (primary/15 bg)
- `.text-status-success`, `.text-status-error`, `.text-status-warning`, `.text-status-info`
- `.trend-positive`, `.trend-negative`, `.trend-neutral`

### Sidebar & Header (Cotheme)
- `.sidebar-section-header` — uppercase 10px section labels
- `.sidebar-nav-item`, `.sidebar-nav-item-active`
- `.sidebar-collapse-btn` — collapse button positioned on edge
- `.header-sticky` — sticky header with backdrop-blur

### Interactive
- `.focus-ring`, `.focus-ring-primary`, `.focus-ring-danger`
- `.transition-base`, `.transition-colors-fast`, `.transition-shadow-hover`, `.transition-layout`
- `.bg-hover`, `.table-row-hover`

### Animation
- `.stagger-entrance` — staggered slide-in-up for child elements (80ms intervals)
- `.notification-dot` — positioned dot indicator

### Loading
- `.skeleton` — `bg-accent` pulse animation
- `.skeleton-shimmer` — gradient shimmer effect

---

## 4. Responsive Design Rules

| Breakpoint | Width   | Usage                           |
|------------|---------|----------------------------------|
| `sm`       | 640px   | Mobile landscape                 |
| `md`       | 768px   | Tablet                           |
| `lg`       | 1024px  | Desktop                          |
| `xl`       | 1280px  | Wide desktop                     |
| `2xl`      | 1400px  | Container max-width              |

### Patterns

- **Sidebar**: Collapsed on mobile (`< md`), expanded on desktop
- **Tables**: Horizontal scroll on mobile (`overflow-x-auto`, `min-w-[900px]`)
- **Buttons**: `w-full sm:w-auto` for mobile full-width
- **Forms**: Stack vertically on mobile, grid on desktop
- **Grids**: Use `.grid-responsive-*` classes
- **Pagination**: Horizontal scroll with `min-w-max` on mobile

---

## 5. Accessibility Checklist

- [x] **Focus rings**: All interactive elements have `focus-visible:ring-2`
- [x] **ARIA labels**: Buttons with icons use `aria-label`, spinners use `role="status"`
- [x] **Keyboard nav**: All components support Tab/Enter/Escape
- [x] **Color contrast**: WCAG AA minimum (4.5:1 for text, 3:1 for large text)
- [x] **Reduced motion**: `prefers-reduced-motion` disables animations
- [x] **Screen reader**: `.sr-only` class for visually hidden text
- [x] **Semantic HTML**: `role="alert"`, `aria-sort`, `aria-busy` where appropriate

---

## 6. Dark Mode

All components are dark-mode ready via CSS variables in OKLCH:

```css
/* Light */
:root { --primary: oklch(0.55 0.19 160); }

/* Dark */
.dark { --primary: oklch(0.6 0.19 160); }
```

### Rules
- Never use hardcoded colors like `bg-white` — use `bg-background` or `bg-card`
- Never use `text-gray-900` — use `text-foreground`
- For status colors, use semantic CSS variable classes: `bg-success/10 text-success`
- Sidebar uses `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent`
- Table headers use CSS variables: `--table-header-from`, `--table-header-to`
- Scrollbar styles adapt automatically via `.dark` class

---

## 7. Layout Structure

### Sidebar (260px)
- **Width**: 260px expanded, 48px collapsed
- **Logo area**: 64px height, `bg-sidebar-primary` icon
- **Navigation**: `bg-sidebar-accent` for active items, `text-sidebar-primary` for active text
- **Section headers**: `text-2xs uppercase tracking-widest` (`.sidebar-section-header`)
- **Sub-menus**: `border-l-2 border-sidebar-border` left accent line

### Header (64px)
- **Height**: 64px
- **Background**: `bg-background/95` with `backdrop-blur-sm`
- **Border**: `border-b border-border`
- **Position**: `sticky top-0 z-40`

### Main Content
- **Background**: `bg-background`
- **Padding**: `p-4 md:p-6`
- **Container**: max-width 1280px (boxed mode) or full-width (fluid mode)

---

## 8. Do's and Don'ts

### DO
- Use CVA component variants instead of inline Tailwind for common patterns
- Use CSS variables (`var(--primary)`) for theme colors — OKLCH format
- Use `transition-all duration-150` for interactive elements
- Use `rounded-lg` (or `rounded-xl` for cards) consistently
- Use `shadow-card` for cards, `shadow-card-hover` for hover states
- Import from `@/components/ui/*` for all UI components
- Use `.stagger-entrance` for dashboard metric card grids
- Use `text-2xs` for sidebar section headers and badges
- Test with multiple color presets (not just emerald)

### DON'T
- Duplicate styles inline — extract to design-system.css or a component
- Use hardcoded hex/HSL colors — use OKLCH CSS variables or Tailwind tokens
- Use `hsl(var(...))` — variables are now raw OKLCH values, use `var(--primary)` directly
- Mix animation durations — stick to 100/150/200/300ms
- Ignore dark mode — always test both themes
- Skip focus states — every interactive element needs a focus ring
- Use `!important` — fix specificity issues properly
- Hardcode sidebar/header colors — always use `sidebar-*` and semantic vars
