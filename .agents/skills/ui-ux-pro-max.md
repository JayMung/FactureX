# UI/UX Pro Max — Design Intelligence

Comprehensive design guide for web applications. Use when designing UI components, choosing palettes/typography, reviewing UX, building dashboards, or implementing accessibility.

## Rule Priorities

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Accessibility | CRITICAL |
| 2 | Touch & Interaction | CRITICAL |
| 3 | Performance | HIGH |
| 4 | Layout & Responsive | HIGH |
| 5 | Typography & Color | MEDIUM |
| 6 | Animation | MEDIUM |
| 7 | Charts & Data | LOW |

## 1. Accessibility (CRITICAL)

- Color contrast minimum 4.5:1 ratio for normal text
- Visible focus rings on interactive elements
- Descriptive alt text for meaningful images
- aria-label for icon-only buttons
- Tab order matches visual order
- Use label with for attribute on forms

## 2. Touch & Interaction (CRITICAL)

- Minimum 44x44px touch targets
- Use click/tap for primary interactions
- Disable button during async operations (loading state)
- Clear error messages near the problem
- Add cursor-pointer to all clickable elements

## 3. Performance (HIGH)

- Use WebP, srcset, lazy loading for images
- Check prefers-reduced-motion
- Reserve space for async content (prevent layout shift)

## 4. Layout & Responsive (HIGH)

- viewport meta: width=device-width initial-scale=1
- Minimum 16px body text on mobile
- Ensure content fits viewport width (no horizontal scroll)
- Define z-index scale (10, 20, 30, 50)

## 5. Typography & Color (MEDIUM)

- Line height 1.5-1.75 for body text
- Limit to 65-75 characters per line
- Match heading/body font personalities

## 6. Animation (MEDIUM)

- 150-300ms for micro-interactions
- Use transform/opacity, not width/height
- Skeleton screens or spinners for loading states

## Icons & Visual Elements

| Do | Don't |
|----|-------|
| Use SVG icons (Lucide) | Use emojis as UI icons |
| Stable hover states (color/opacity) | Scale transforms that shift layout |
| Fixed viewBox (24x24) with w-6 h-6 | Mix different icon sizes |

## Light/Dark Mode

| Do | Don't |
|----|-------|
| bg-white/80 or higher in light mode | bg-white/10 (too transparent) |
| slate-900 for text | slate-400 for body text |
| slate-600 minimum for muted text | gray-400 or lighter |
| border-gray-200 in light mode | border-white/10 (invisible) |

## Pre-Delivery Checklist

- [ ] No emojis used as icons (use SVG)
- [ ] All icons from consistent set (Lucide)
- [ ] Hover states don't cause layout shift
- [ ] All clickable elements have cursor-pointer
- [ ] Transitions smooth (150-300ms)
- [ ] Focus states visible for keyboard nav
- [ ] Light mode text has sufficient contrast (4.5:1)
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] prefers-reduced-motion respected
