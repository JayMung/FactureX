# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

FactureX is a React/TypeScript application for managing USD/CDF currency exchange transactions and clients. Built with Vite, React Router, shadcn/ui, and Supabase backend.

## Development Commands

### Essential Commands
```powershell
npm run dev          # Start dev server on http://localhost:8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Development Server
- Default port: 8080
- Host: `::`  (IPv6 all interfaces)

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 6
- **Routing**: React Router v6
- **UI**: shadcn/ui components (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (authentication, database)
- **Forms**: React Hook Form + Zod validation
- **Icons**: lucide-react

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── auth/        # Authentication components (AuthProvider, ProtectedRoute)
│   ├── charts/      # Data visualization components
│   ├── clients/     # Client-related components
│   ├── dashboard/   # Dashboard widgets (StatCard, etc.)
│   ├── filters/     # Filter components
│   ├── forms/       # Form components (ClientForm, TransactionForm, etc.)
│   ├── layout/      # Layout components (Layout, Header, Sidebar)
│   └── ui/          # shadcn/ui base components (DO NOT EDIT)
├── contexts/        # React contexts
│   ├── AuthContext.tsx      # Authentication state
│   └── PageContext.tsx      # Page metadata (title, subtitle)
├── hooks/           # Custom React hooks
│   ├── useClients.ts        # Client CRUD operations
│   ├── useTransactions.ts   # Transaction CRUD operations
│   ├── useDashboard.ts      # Dashboard statistics
│   ├── useSettings.ts       # App settings (exchange rates, fees)
│   ├── useActivityLogs.ts   # Activity logging
│   ├── useBulkOperations.ts # Batch operations
│   └── use-page-setup.ts    # Page metadata setup
├── integrations/    # External service integrations
│   └── supabase/    # Supabase client and auth
├── pages/           # Route pages
│   ├── Index.tsx            # Dashboard (default route)
│   ├── Clients.tsx          # Client management
│   ├── Transactions.tsx     # Transaction management
│   ├── Settings.tsx         # Admin settings
│   ├── Login.tsx           # Login page
│   └── AdminSetup.tsx      # Initial admin setup
├── services/        # Business logic services
│   └── supabase.ts         # SupabaseService class with API methods
├── types/           # TypeScript type definitions
│   └── index.ts            # Client, Transaction, Setting, etc.
├── utils/           # Utility functions
└── App.tsx          # Root component with routing
```

## Architecture Patterns

### Routing Architecture
- All routes are defined in `src/App.tsx`
- Route structure:
  - `/` - Dashboard (protected)
  - `/clients` - Client management (protected)
  - `/transactions` - Transaction management (protected)
  - `/settings` - Admin settings (protected, admin only)
  - `/login` - Login page
  - `/admin-setup` - Initial setup
- Protected routes use `<ProtectedRoute>` wrapper
- Admin-only routes use `<ProtectedRoute adminOnly>`

### State Management
- **TanStack Query**: Server state, caching, and async operations
- **Context**: Authentication (AuthContext), page metadata (PageContext)
- **Custom Hooks**: Business logic abstraction (useClients, useTransactions, etc.)

### Data Layer
- **SupabaseService** (`src/services/supabase.ts`): Centralized API client
  - Handles all database operations
  - Returns typed responses: `ApiResponse<T>` and `PaginatedResponse<T>`
  - Automatic activity logging for mutations
  - Methods include: `getClients()`, `createTransaction()`, `updateSettings()`, etc.

### Authentication Flow
1. `AuthContext` manages auth state via Supabase Auth
2. `AuthProvider` wraps the app in `App.tsx`
3. `ProtectedRoute` guards routes requiring authentication
4. User profiles stored in `user_profiles` table with roles (admin, agent)
5. First user setup via `/admin-setup` route

### Component Architecture
- **Pages**: Route-level components in `src/pages/`
- **Layout**: Consistent layout with `<Layout>` wrapper (Header + Sidebar + content)
- **Forms**: React Hook Form + Zod validation
- **shadcn/ui**: Base components in `src/components/ui/` - DO NOT MODIFY these files
- **Custom Components**: Build new components by composing shadcn/ui primitives

### Data Types
Core types in `src/types/index.ts`:
- `Client`: Customer records (nom, telephone, ville)
- `Transaction`: Payment transactions (montant, devise, statut, benefice, frais, taux)
- `Setting`: App configuration (exchange rates, fees)
- `PaymentMethod`: Payment method definitions
- `UserProfile`: User metadata and roles
- `ActivityLog`: Audit trail

## Development Guidelines

### Adding New Features
1. Define TypeScript types in `src/types/index.ts`
2. Add database methods to `SupabaseService` in `src/services/supabase.ts`
3. Create custom hook in `src/hooks/`
4. Build UI components in `src/components/`
5. Create page in `src/pages/` if needed
6. **ALWAYS** add route to `src/App.tsx` if creating a new page
7. Update main page (`src/pages/Index.tsx`) if adding dashboard features

### Creating Components
- Use shadcn/ui components from `@/components/ui/*`
- Create custom components in appropriate subdirectory under `src/components/`
- Use Tailwind CSS for all styling
- Import shadcn/ui components, don't edit them
- For icons, use `lucide-react`

### Working with Supabase
- Import client: `import { supabase } from '@/integrations/supabase/client'`
- Use `SupabaseService` class for structured operations
- All mutations automatically log activities
- Supabase URL and keys are in `src/integrations/supabase/client.ts`

### Path Aliases
- `@/*` maps to `src/*` (configured in vite.config.ts)
- Example: `import { Button } from '@/components/ui/button'`

### Styling
- Use Tailwind CSS exclusively
- Leverage utility classes for layout, spacing, colors
- Responsive design: `md:`, `lg:` breakpoints
- Theme colors: emerald (primary), blue, purple, orange

### Forms
- Use React Hook Form for form state
- Zod for validation schemas
- shadcn/ui form components
- Example: `ClientForm`, `TransactionForm` in `src/components/forms/`

### Page Setup
- Use `usePageSetup()` hook to set page title and subtitle
- Displayed in Header component
- Example: `usePageSetup({ title: 'Clients', subtitle: 'Manage your clients' })`

## Database Schema (Supabase)

Key tables:
- `clients`: Client records
- `transactions`: Payment transactions
- `settings`: App configuration (categories: taux, frais)
- `payment_methods`: Available payment methods
- `user_profiles`: User metadata and permissions
- `activity_logs`: Audit trail

## Important Notes

- **Route Registration**: When creating new pages, always register routes in `src/App.tsx`
- **Main Page Updates**: Update `src/pages/Index.tsx` to integrate new dashboard features
- **shadcn/ui**: Never edit files in `src/components/ui/` - create wrapper components instead
- **Package Installation**: All shadcn/ui components and Radix UI dependencies are pre-installed
- **TypeScript**: Strict mode enabled - always use proper types
- **Currency Handling**: App handles USD, CDF, and CNY with configurable exchange rates
