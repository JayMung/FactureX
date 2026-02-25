# FactureX — UI Kit & Design System

> Single source of truth for all UI patterns, tokens, and component usage.

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

### Color Palette

| Token       | Role                          | Light          | Dark           |
|-------------|-------------------------------|----------------|----------------|
| `primary`   | Brand actions, CTAs           | Emerald 500    | Emerald 500    |
| `accent`    | Highlights, secondary CTAs    | Indigo 500     | Indigo 400     |
| `neutral`   | Text, backgrounds, borders    | Slate scale    | Slate scale    |
| `success`   | Positive states               | Green 500      | Green 400      |
| `warning`   | Caution states                | Amber 500      | Amber 400      |
| `danger`    | Error/destructive states      | Red 500        | Red 400        |
| `info`      | Informational states          | Blue 500       | Blue 400       |

### Spacing (4px grid)

```
0.5 = 2px  |  1 = 4px  |  2 = 8px  |  3 = 12px  |  4 = 16px
5 = 20px   |  6 = 24px |  8 = 32px |  10 = 40px |  12 = 48px
```

### Border Radius

```
sm = calc(var(--radius) - 4px)    → ~8px
md = calc(var(--radius) - 2px)    → ~10px
lg = var(--radius)                → 12px (default)
xl = calc(var(--radius) + 4px)    → ~16px
2xl = calc(var(--radius) + 8px)   → ~20px
full = 9999px                     → pill shape
```

### Shadow System

| Token         | Use case                |
|---------------|-------------------------|
| `xs`          | Subtle depth            |
| `card`        | Card resting state      |
| `card-hover`  | Card hover elevation    |
| `md`          | Dropdowns               |
| `dropdown`    | Popovers, menus         |
| `lg`          | Modals                  |
| `focus-primary` | Focus ring glow       |

### Transitions

All interactive elements use `duration-150` (150ms) with `ease-in-out`.
Hover shadows use `duration-200`.

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

### Layout
- `.container-page` — max-w-7xl with responsive padding
- `.grid-responsive-2`, `.grid-responsive-3`, `.grid-responsive-4`
- `.mobile-full-width`, `.mobile-stack`, `.mobile-hide`, `.desktop-hide`

### Cards & Surfaces
- `.card-base`, `.card-clean`, `.stat-card`
- `.banner-gradient-green`, `.banner-compact`

### Status
- `.badge-success`, `.badge-error`, `.badge-warning`, `.badge-info`, `.badge-neutral`
- `.text-status-success`, `.text-status-error`, `.text-status-warning`, `.text-status-info`
- `.trend-positive`, `.trend-negative`, `.trend-neutral`

### Interactive
- `.focus-ring`, `.focus-ring-primary`, `.focus-ring-danger`
- `.transition-base`, `.transition-colors-fast`, `.transition-shadow-hover`
- `.bg-hover`, `.table-row-hover`

### Loading
- `.skeleton`, `.skeleton-shimmer`

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

All components are dark-mode ready via CSS variables:

```css
/* Light */
:root { --primary: 160 84% 39%; }

/* Dark */
.dark { --primary: 160 84% 39%; }
```

### Rules
- Never use hardcoded colors like `bg-white` — use `bg-background` or `bg-card`
- Never use `text-gray-900` — use `text-foreground`
- For status colors, use the semantic variants: `bg-green-50 dark:bg-green-500/10`
- Table headers use CSS variables: `--table-header-from`, `--table-header-to`

---

## 7. Do's and Don'ts

### DO
- Use CVA component variants instead of inline Tailwind for common patterns
- Use CSS variables (`hsl(var(--primary))`) for theme colors
- Use `transition-all duration-150` for interactive elements
- Use `rounded-lg` (or `rounded-xl` for cards) consistently
- Use `shadow-card` for cards, `shadow-card-hover` for hover states
- Import from `@/components/ui/*` for all UI components

### DON'T
- Duplicate styles inline — extract to design-system.css or a component
- Use hardcoded hex colors — use CSS variables or Tailwind tokens
- Mix animation durations — stick to 100/150/200/300ms
- Ignore dark mode — always test both themes
- Skip focus states — every interactive element needs a focus ring
- Use `!important` — fix specificity issues properly
