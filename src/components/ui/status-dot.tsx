import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusDotVariants = cva("inline-block rounded-full shrink-0", {
  variants: {
    status: {
      success: "bg-green-500",
      warning: "bg-amber-500",
      error: "bg-red-500",
      info: "bg-blue-500",
      neutral: "bg-gray-400 dark:bg-gray-500",
      active: "bg-green-500",
      inactive: "bg-gray-300 dark:bg-gray-600",
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
