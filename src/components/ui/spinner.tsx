import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spinner rounded-full border-2 border-current border-t-transparent", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
      xl: "h-12 w-12",
    },
    variant: {
      default: "text-primary",
      muted: "text-muted-foreground",
      white: "text-white",
    },
  },
  defaultVariants: {
    size: "md",
    variant: "default",
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

function Spinner({ className, size, variant, label, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(spinnerVariants({ size, variant }), className)}
      role="status"
      aria-label={label || "Loading"}
      {...props}
    >
      <span className="sr-only">{label || "Loading..."}</span>
    </div>
  );
}

export interface PageLoaderProps {
  message?: string;
  className?: string;
}

function PageLoader({ message, className }: PageLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}>
      <Spinner size="lg" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

export interface InlineLoaderProps {
  message?: string;
  className?: string;
}

function InlineLoader({ message = "Chargement...", className }: InlineLoaderProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Spinner size="sm" variant="muted" />
      <span>{message}</span>
    </div>
  );
}

export { Spinner, spinnerVariants, PageLoader, InlineLoader };
