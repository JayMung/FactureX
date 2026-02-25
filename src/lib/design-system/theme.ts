/**
 * FactureX Theme Configuration
 * Maps design tokens to semantic theme values for light/dark modes.
 * Used by CSS variables in globals.css and component variants.
 */

import { colors } from './tokens';

// ─── HSL Helpers ─────────────────────────────────────────────────────────────

/**
 * CSS variable values in HSL format (without hsl() wrapper)
 * This matches shadcn/ui convention: `--primary: 142.1 76.2% 36.3%`
 */

// ─── Light Theme ─────────────────────────────────────────────────────────────

export const lightTheme = {
  // Core
  background:           '0 0% 100%',
  foreground:           '215 25% 9%',

  // Cards & Surfaces
  card:                 '0 0% 100%',
  'card-foreground':    '215 25% 9%',
  popover:              '0 0% 100%',
  'popover-foreground': '215 25% 9%',

  // Brand
  primary:              '160 84% 39%',
  'primary-foreground': '0 0% 98%',

  // Secondary
  secondary:            '214 32% 96%',
  'secondary-foreground':'215 25% 9%',

  // Muted
  muted:                '214 32% 96%',
  'muted-foreground':   '215 16% 47%',

  // Accent
  accent:               '214 32% 96%',
  'accent-foreground':  '215 25% 9%',

  // Destructive
  destructive:          '0 84% 60%',
  'destructive-foreground': '0 0% 98%',

  // Semantic status
  success:              '142 71% 45%',
  'success-foreground': '0 0% 98%',
  warning:              '38 92% 50%',
  'warning-foreground': '0 0% 9%',
  info:                 '217 91% 60%',
  'info-foreground':    '0 0% 98%',

  // Borders & Inputs
  border:               '214 32% 91%',
  input:                '214 32% 91%',
  ring:                 '160 84% 39%',

  // Radius
  radius:               '0.75rem',

  // Sidebar
  'sidebar-background':          '210 20% 98%',
  'sidebar-foreground':          '215 25% 27%',
  'sidebar-primary':             '215 25% 10%',
  'sidebar-primary-foreground':  '0 0% 98%',
  'sidebar-accent':              '214 20% 95%',
  'sidebar-accent-foreground':   '215 25% 10%',
  'sidebar-border':              '214 20% 92%',
  'sidebar-ring':                '217 91% 60%',

  // Chart colors
  'chart-1': '160 84% 39%',
  'chart-2': '234 89% 74%',
  'chart-3': '38 92% 50%',
  'chart-4': '0 84% 60%',
  'chart-5': '271 81% 56%',
} as const;

// ─── Dark Theme ──────────────────────────────────────────────────────────────

export const darkTheme = {
  // Core
  background:           '222 47% 6%',
  foreground:           '210 40% 98%',

  // Cards & Surfaces
  card:                 '222 47% 8%',
  'card-foreground':    '210 40% 98%',
  popover:              '222 47% 8%',
  'popover-foreground': '210 40% 98%',

  // Brand
  primary:              '160 84% 39%',
  'primary-foreground': '210 40% 98%',

  // Secondary
  secondary:            '217 33% 17%',
  'secondary-foreground':'210 40% 98%',

  // Muted
  muted:                '217 33% 17%',
  'muted-foreground':   '215 20% 65%',

  // Accent
  accent:               '217 33% 17%',
  'accent-foreground':  '210 40% 98%',

  // Destructive
  destructive:          '0 63% 31%',
  'destructive-foreground': '0 0% 98%',

  // Semantic status
  success:              '142 71% 45%',
  'success-foreground': '0 0% 98%',
  warning:              '38 92% 50%',
  'warning-foreground': '0 0% 9%',
  info:                 '217 91% 60%',
  'info-foreground':    '0 0% 98%',

  // Borders & Inputs
  border:               '217 33% 17%',
  input:                '217 33% 17%',
  ring:                 '160 84% 39%',

  // Radius
  radius:               '0.75rem',

  // Sidebar
  'sidebar-background':          '222 47% 7%',
  'sidebar-foreground':          '210 40% 96%',
  'sidebar-primary':             '217 91% 60%',
  'sidebar-primary-foreground':  '0 0% 100%',
  'sidebar-accent':              '222 40% 13%',
  'sidebar-accent-foreground':   '210 40% 96%',
  'sidebar-border':              '222 40% 13%',
  'sidebar-ring':                '217 91% 60%',

  // Chart colors
  'chart-1': '160 84% 39%',
  'chart-2': '234 89% 74%',
  'chart-3': '38 92% 50%',
  'chart-4': '0 84% 60%',
  'chart-5': '271 81% 56%',
} as const;

// ─── Semantic Color Map (for JS usage) ───────────────────────────────────────

export const semanticColors = {
  success: {
    bg:     colors.success[50],
    bgDark: 'rgba(34, 197, 94, 0.12)',
    text:   colors.success[700],
    textDark: colors.success[200],
    border: colors.success[200],
    borderDark: colors.success[700],
    icon:   colors.success[500],
  },
  warning: {
    bg:     colors.warning[50],
    bgDark: 'rgba(245, 158, 11, 0.12)',
    text:   colors.warning[700],
    textDark: colors.warning[200],
    border: colors.warning[200],
    borderDark: colors.warning[700],
    icon:   colors.warning[500],
  },
  danger: {
    bg:     colors.danger[50],
    bgDark: 'rgba(239, 68, 68, 0.12)',
    text:   colors.danger[700],
    textDark: colors.danger[200],
    border: colors.danger[200],
    borderDark: colors.danger[700],
    icon:   colors.danger[500],
  },
  info: {
    bg:     colors.info[50],
    bgDark: 'rgba(59, 130, 246, 0.12)',
    text:   colors.info[700],
    textDark: colors.info[200],
    border: colors.info[200],
    borderDark: colors.info[700],
    icon:   colors.info[500],
  },
  neutral: {
    bg:     colors.neutral[50],
    bgDark: 'rgba(100, 116, 139, 0.12)',
    text:   colors.neutral[700],
    textDark: colors.neutral[300],
    border: colors.neutral[200],
    borderDark: colors.neutral[700],
    icon:   colors.neutral[500],
  },
} as const;

// ─── Component-level theme tokens ────────────────────────────────────────────

export const componentTheme = {
  button: {
    borderRadius: '0.5rem',
    fontWeight: '500',
    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  input: {
    borderRadius: '0.5rem',
    height: '2.5rem',
    fontSize: '0.875rem',
  },
  card: {
    borderRadius: '0.75rem',
    padding: '1.5rem',
  },
  badge: {
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  table: {
    headerBg: 'linear-gradient(to right, var(--table-header-from), var(--table-header-to))',
    rowHoverBg: 'rgba(16, 185, 129, 0.04)',
    borderColor: colors.neutral[100],
  },
  modal: {
    borderRadius: '0.75rem',
    maxWidth: '32rem',
    overlayBg: 'rgba(0, 0, 0, 0.6)',
  },
  sidebar: {
    width: '280px',
    collapsedWidth: '72px',
    transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type ThemeMode = 'light' | 'dark';
export type SemanticColorKey = keyof typeof semanticColors;
