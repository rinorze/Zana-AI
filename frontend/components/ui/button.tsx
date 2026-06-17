"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary disabled:pointer-events-none disabled:opacity-50 gap-2",
  {
    variants: {
      variant: {
        default: "bg-brand-secondary text-white hover:bg-brand-primary rounded-full",
        outline: "border border-brand-secondary text-brand-secondary bg-white hover:bg-brand-light rounded-full",
        ghost: "text-brand-secondary hover:bg-brand-light rounded-full",
        destructive: "bg-ek-danger text-white hover:opacity-90 rounded-full",
        secondary: "bg-brand-light text-brand-primary hover:bg-brand-soft rounded-full",
        link: "text-brand-secondary hover:underline",
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
