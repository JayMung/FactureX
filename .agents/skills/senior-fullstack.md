# Senior Fullstack

Complete toolkit for senior fullstack development with modern tools and best practices.

## Tech Stack (FactureX)

- **Language**: TypeScript
- **Frontend**: React 19, Vite, TailwindCSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth, RLS)
- **State**: React Query, custom hooks
- **Testing**: Vitest
- **Deployment**: Vercel

## Code Quality

- Follow established patterns in the codebase
- Write comprehensive tests
- Document architectural decisions
- Review code regularly (especially OpenClaw agent commits)

## Performance

- Measure before optimizing
- Use appropriate caching (React Query staleTime)
- Optimize critical paths (dashboard, financial operations)
- Monitor in production

## Security

- Validate all inputs
- Use parameterized queries (Supabase client or $1 params)
- Implement proper authentication (Supabase Auth + RBAC)
- Keep dependencies updated
- RLS on all tables

## Maintainability

- Write clear, self-documenting code
- Use consistent naming conventions
- Keep components small (<300 lines, extract when larger)
- Separate business logic from UI components
- Use custom hooks for complex state logic
- Organize in feature folders

## Architecture Patterns

- Clean separation: hooks (logic) → components (UI) → pages (composition)
- React Query for all server state
- Supabase triggers for data consistency (not manual JS updates)
- Multi-tenancy via organization_id on all tables
- Permission-based access control (finances module)
