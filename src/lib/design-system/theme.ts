/**
 * Cotheme Theme Configuration
 * Maps design tokens to semantic theme values for light/dark modes.
 * Uses OKLCH color space for perceptual uniformity.
 * Used by CSS variables in globals.css and component variants.
 */

import { colors } from './tokens';

// ─── OKLCH Theme Maps ────────────────────────────────────────────────────────

/**
 * CSS variable values in OKLCH format.
 * These are reference maps for JS-side theme logic.
 * The actual CSS variables are defined in globals.css using oklch() syntax.
 */

// ─── Light Theme (OKLCH) ────────────────────────────────────────────────────

export const lightTheme = {
  // Core
  background:           'oklch(1 0 0)',
  foreground:           'oklch(0.145 0 0)',

  // Cards & Surfaces
  card:                 'oklch(1 0 0)',
  'card-foreground':    'oklch(0.145 0 0)',
  popover:              'oklch(1 0 0)',
  'popover-foreground': 'oklch(0.145 0 0)',

  // Brand — Emerald (default preset)
  primary:              'oklch(0.55 0.19 160)',
  'primary-foreground': 'oklch(1 0 0)',

  // Secondary
  secondary:            'oklch(0.97 0 0)',
  'secondary-foreground':'oklch(0.145 0 0)',

  // Muted
  muted:                'oklch(0.97 0 0)',
  'muted-foreground':   'oklch(0.55 0 0)',

  // Accent
  accent:               'oklch(0.97 0 0)',
  'accent-foreground':  'oklch(0.145 0 0)',

  // Destructive
  destructive:          'oklch(0.637 0.237 25)',
  'destructive-foreground': 'oklch(1 0 0)',

  // Semantic status
  success:              'oklch(0.627 0.194 149)',
  'success-foreground': 'oklch(1 0 0)',
  warning:              'oklch(0.75 0.183 55)',
  'warning-foreground': 'oklch(0.145 0 0)',
  info:                 'oklch(0.6 0.19 240)',
  'info-foreground':    'oklch(1 0 0)',

  // Borders & Inputs
  border:               'oklch(0.92 0 0)',
  input:                'oklch(0.92 0 0)',
  ring:                 'oklch(0.55 0.19 160)',

  // Radius
  radius:               '0.625rem',

  // Sidebar
  'sidebar-background':          'oklch(1 0 0)',
  'sidebar-foreground':          'oklch(0.145 0 0)',
  'sidebar-primary':             'oklch(0.55 0.19 160)',
  'sidebar-primary-foreground':  'oklch(1 0 0)',
  'sidebar-accent':              'oklch(0 0 0 / 0.05)',
  'sidebar-accent-foreground':   'oklch(0.145 0 0)',
  'sidebar-border':              'oklch(0.92 0 0)',
  'sidebar-ring':                'oklch(0.55 0.19 160)',

  // Chart colors
  'chart-1': 'oklch(0.55 0.19 160)',
  'chart-2': 'oklch(0.6 0.18 200)',
  'chart-3': 'oklch(0.5 0.2 30)',
  'chart-4': 'oklch(0.7 0.15 280)',
  'chart-5': 'oklch(0.65 0.16 100)',
} as const;

// ─── Dark Theme (OKLCH) ─────────────────────────────────────────────────────

export const darkTheme = {
  // Core
  background:           'oklch(0.15 0.02 260)',
  foreground:           'oklch(0.97 0 0)',

  // Cards & Surfaces
  card:                 'oklch(0.18 0.02 260)',
  'card-foreground':    'oklch(0.97 0 0)',
  popover:              'oklch(0.18 0.02 260)',
  'popover-foreground': 'oklch(0.97 0 0)',

  // Brand — Emerald (slightly lighter for dark)
  primary:              'oklch(0.6 0.19 160)',
  'primary-foreground': 'oklch(0.97 0 0)',

  // Secondary
  secondary:            'oklch(0.25 0.02 260)',
  'secondary-foreground':'oklch(0.97 0 0)',

  // Muted
  muted:                'oklch(0.25 0.02 260)',
  'muted-foreground':   'oklch(0.65 0 0)',

  // Accent
  accent:               'oklch(0.25 0.02 260)',
  'accent-foreground':  'oklch(0.97 0 0)',

  // Destructive
  destructive:          'oklch(0.5 0.2 25)',
  'destructive-foreground': 'oklch(0.97 0 0)',

  // Semantic status
  success:              'oklch(0.627 0.194 149)',
  'success-foreground': 'oklch(0.97 0 0)',
  warning:              'oklch(0.75 0.183 55)',
  'warning-foreground': 'oklch(0.145 0 0)',
  info:                 'oklch(0.6 0.19 240)',
  'info-foreground':    'oklch(0.97 0 0)',

  // Borders & Inputs
  border:               'oklch(0.25 0.02 260)',
  input:                'oklch(0.25 0.02 260)',
  ring:                 'oklch(0.6 0.19 160)',

  // Radius
  radius:               '0.625rem',

  // Sidebar
  'sidebar-background':          'oklch(0.16 0.02 260)',
  'sidebar-foreground':          'oklch(0.95 0 0)',
  'sidebar-primary':             'oklch(0.6 0.19 160)',
  'sidebar-primary-foreground':  'oklch(1 0 0)',
  'sidebar-accent':              'oklch(1 0 0 / 0.06)',
  'sidebar-accent-foreground':   'oklch(0.95 0 0)',
  'sidebar-border':              'oklch(0.22 0.02 260)',
  'sidebar-ring':                'oklch(0.6 0.19 160)',

  // Chart colors
  'chart-1': 'oklch(0.6 0.19 160)',
  'chart-2': 'oklch(0.65 0.18 200)',
  'chart-3': 'oklch(0.6 0.2 30)',
  'chart-4': 'oklch(0.72 0.15 280)',
  'chart-5': 'oklch(0.68 0.16 100)',
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
    borderRadius: '0.375rem',  // rounded-md
    fontWeight: '500',
    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  input: {
    borderRadius: '0.375rem',  // rounded-md
    height: '2rem',            // h-8
    fontSize: '0.875rem',
  },
  card: {
    borderRadius: '0.75rem',   // rounded-xl
    padding: '1.25rem',        // p-5
  },
  badge: {
    borderRadius: '9999px',
    fontSize: '0.625rem',      // text-[10px]
    fontWeight: '600',
  },
  table: {
    headerBg: 'linear-gradient(to right, var(--table-header-from), var(--table-header-to))',
    rowHoverBg: 'var(--accent)',
    borderColor: 'var(--border)',
  },
  modal: {
    borderRadius: '0.75rem',
    maxWidth: '32rem',
    overlayBg: 'rgba(0, 0, 0, 0.6)',
  },
  sidebar: {
    width: '260px',
    collapsedWidth: '48px',
    logoHeight: '64px',
    transition: 'all 300ms ease-in-out',
  },
  header: {
    height: '64px',
    backdropBlur: '8px',
  },
  metricCard: {
    borderRadius: '0.75rem',   // rounded-xl
    padding: '1.25rem',        // p-5
    iconSize: '2.5rem',        // h-10 w-10
    iconContainerRadius: '0.75rem',
  },
} as const;

export type ThemeMode = 'light' | 'dark';
export type SemanticColorKey = keyof typeof semanticColors;
