// Global type fix for UI components
declare module '@/components/ui/button' {
  export const Button: any;
  export const buttonVariants: any;
  export type ButtonProps = any;
}

declare module '@/components/ui/badge' {
  export const Badge: any;
  export const badgeVariants: any;
  export type BadgeProps = any;
}

// Supabase types fix
declare module '@supabase/supabase-js' {
  export type Session = any;
  export type User = any;
}
