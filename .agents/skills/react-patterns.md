# React Patterns

Principles for building production-ready React applications.

## 1. Component Design

| Type | Use | State |
|------|-----|-------|
| Presentational | UI display | Props only |
| Container | Logic/state | Heavy state |
| Client | Interactivity | useState, effects |

Rules:
- One responsibility per component
- Props down, events up
- Composition over inheritance
- Prefer small, focused components

## 2. Hook Patterns

Extract hooks when:
- Same logic needed in multiple components (useLocalStorage, useDebounce)
- Complex form state (useForm)
- Repeated fetch patterns (useFetch)

Rules:
- Hooks at top level only
- Same order every render
- Custom hooks start with "use"
- Clean up effects on unmount

## 3. State Management

| Complexity | Solution |
|------------|----------|
| Simple | useState, useReducer |
| Shared local | Context |
| Server state | React Query |
| Complex global | Zustand |

| Scope | Where |
|-------|-------|
| Single component | useState |
| Parent-child | Lift state up |
| Subtree | Context |
| App-wide | Global store |

## 4. Performance

| Signal | Action |
|--------|--------|
| Slow renders | Profile first |
| Large lists | Virtualize |
| Expensive calc | useMemo |
| Stable callbacks | useCallback |

Order: Check if slow → Profile with DevTools → Identify bottleneck → Apply targeted fix

## 5. Error Handling

- App-wide error boundary at root level
- Feature-level error boundaries around risky components
- Show fallback UI, log error, offer retry, preserve user data

## 6. TypeScript Patterns

| Pattern | Use |
|---------|-----|
| Interface | Component props |
| Type | Unions, complex |
| Generic | Reusable components |

## 7. Testing

| Level | Focus |
|-------|-------|
| Unit | Pure functions, hooks |
| Integration | Component behavior |
| E2E | User flows |

Priorities: User-visible behavior → Edge cases → Error states → Accessibility

## 8. Anti-Patterns

| Don't | Do |
|-------|-----|
| Prop drilling deep | Use context |
| Giant components | Split smaller |
| useEffect for everything | Proper data fetching |
| Premature optimization | Profile first |
| Index as key | Stable unique ID |
