/**
 * FactureX Design Tokens
 * Single source of truth for all design primitives.
 * These tokens feed into Tailwind config, CSS variables, and component variants.
 */

// ─── Color Palette ───────────────────────────────────────────────────────────

export const colors = {
  /** Brand / Primary — Emerald green, financial trust */
  primary: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
    950: '#022C22',
  },

  /** Accent — Indigo, for CTAs and highlights */
  accent: {
    50:  '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    950: '#1E1B4B',
  },

  /** Neutral — Slate gray, for text and backgrounds */
  neutral: {
    0:   '#FFFFFF',
    25:  '#FCFCFD',
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  /** Semantic — Status colors */
  success: {
    50:  '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
  },
  warning: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  danger: {
    50:  '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  info: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  },

  /** Font sizes — [fontSize, lineHeight] */
  fontSize: {
    'xs':   ['0.75rem',  { lineHeight: '1rem' }],
    'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
    'base': ['1rem',     { lineHeight: '1.5rem' }],
    'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
    'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
    '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
    '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl':  ['2.25rem',  { lineHeight: '2.5rem' }],
    '5xl':  ['3rem',     { lineHeight: '1' }],
  },

  fontWeight: {
    normal:   '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    extrabold:'800',
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight:   '-0.025em',
    normal:  '0em',
    wide:    '0.025em',
  },
} as const;

// ─── Spacing (4px grid) ─────────────────────────────────────────────────────

export const spacing = {
  px:   '1px',
  0:    '0px',
  0.5:  '0.125rem',  // 2px
  1:    '0.25rem',   // 4px
  1.5:  '0.375rem',  // 6px
  2:    '0.5rem',    // 8px
  2.5:  '0.625rem',  // 10px
  3:    '0.75rem',   // 12px
  3.5:  '0.875rem',  // 14px
  4:    '1rem',      // 16px
  5:    '1.25rem',   // 20px
  6:    '1.5rem',    // 24px
  7:    '1.75rem',   // 28px
  8:    '2rem',      // 32px
  9:    '2.25rem',   // 36px
  10:   '2.5rem',    // 40px
  11:   '2.75rem',   // 44px
  12:   '3rem',      // 48px
  14:   '3.5rem',    // 56px
  16:   '4rem',      // 64px
  20:   '5rem',      // 80px
  24:   '6rem',      // 96px
  28:   '7rem',      // 112px
  32:   '8rem',      // 128px
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const borderRadius = {
  none: '0px',
  sm:   '0.25rem',   // 4px
  DEFAULT: '0.375rem', // 6px
  md:   '0.5rem',    // 8px
  lg:   '0.75rem',   // 12px
  xl:   '1rem',      // 16px
  '2xl':'1.25rem',   // 20px
  '3xl':'1.5rem',    // 24px
  full: '9999px',
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  xs:   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm:   '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md:   '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg:   '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl:   '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl':'0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner:'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  /** Card elevation — subtle lift */
  card: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
  /** Card hover — elevated */
  'card-hover': '0 8px 24px -4px rgb(0 0 0 / 0.08), 0 2px 8px -2px rgb(0 0 0 / 0.04)',
  /** Dropdown / Popover */
  dropdown: '0 4px 16px -2px rgb(0 0 0 / 0.12), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  /** Focus ring glow */
  'focus-primary': '0 0 0 3px rgba(16, 185, 129, 0.25)',
  'focus-danger':  '0 0 0 3px rgba(239, 68, 68, 0.25)',
} as const;

// ─── Borders ─────────────────────────────────────────────────────────────────

export const borders = {
  width: {
    DEFAULT: '1px',
    0: '0px',
    2: '2px',
    4: '4px',
  },
  style: 'solid',
} as const;

// ─── Transitions ─────────────────────────────────────────────────────────────

export const transitions = {
  duration: {
    fast:    '100ms',
    default: '150ms',
    normal:  '200ms',
    slow:    '300ms',
    slower:  '500ms',
  },
  easing: {
    default:  'cubic-bezier(0.4, 0, 0.2, 1)',
    in:       'cubic-bezier(0.4, 0, 1, 1)',
    out:      'cubic-bezier(0, 0, 0.2, 1)',
    inOut:    'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ─── Z-Index Scale ───────────────────────────────────────────────────────────

export const zIndex = {
  hide:     -1,
  base:     0,
  docked:   10,
  dropdown: 1000,
  sticky:   1100,
  banner:   1200,
  overlay:  1300,
  modal:    1400,
  popover:  1500,
  toast:    1600,
  tooltip:  1700,
} as const;

// ─── Breakpoints ─────────────────────────────────────────────────────────────

export const breakpoints = {
  xs:  '475px',
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1400px',
} as const;

// ─── Layout ──────────────────────────────────────────────────────────────────

export const layout = {
  sidebar: {
    width: '280px',
    collapsedWidth: '72px',
  },
  topbar: {
    height: '64px',
  },
  container: {
    maxWidth: '1400px',
    padding: {
      mobile: '1rem',
      tablet: '1.5rem',
      desktop: '2rem',
    },
  },
} as const;

// ─── Composite Export ────────────────────────────────────────────────────────

export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  borders,
  transitions,
  zIndex,
  breakpoints,
  layout,
} as const;

export type DesignTokens = typeof tokens;
export default tokens;
