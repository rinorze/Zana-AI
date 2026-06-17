import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-secondary text-white",
        outline: "border ek-border text-ek-text",
        muted: "bg-brand-light text-brand-primary",
        success: "bg-emerald-100 text-emerald-900",
        warning: "bg-amber-100 text-amber-900",
        danger: "bg-rose-100 text-rose-900",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
