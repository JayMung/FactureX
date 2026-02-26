import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusDotVariants = cva("inline-block rounded-full shrink-0", {
  variants: {
    status: {
      success: "bg-success",
      warning: "bg-warning",
      error: "bg-destructive",
      info: "bg-info",
      neutral: "bg-muted-foreground",
      active: "bg-success",
      inactive: "bg-muted-foreground/40",
    },
    size: {
      sm: "h-1.5 w-1.5",
      md: "h-2 w-2",
      lg: "h-2.5 w-2.5",
    },
    pulse: {
      true: "animate-pulse-soft",
      false: "",
    },
  },
  defaultVariants: {
    status: "neutral",
    size: "md",
    pulse: false,
  },
});

export interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {
  label?: string;
}

function StatusDot({ className, status, size, pulse, label, ...props }: StatusDotProps) {
  return (
    <span
      className={cn(statusDotVariants({ status, size, pulse }), className)}
      role={label ? "status" : "presentation"}
      aria-label={label}
      {...props}
    />
  );
}

export { StatusDot, statusDotVariants };
