"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary-500)] text-white hover:bg-[var(--primary-600)] active:bg-[var(--primary-700)]",
        secondary:
          "border border-[var(--border-medium)] bg-white text-[var(--gray-700)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-tertiary)]",
        ghost:
          "text-[var(--gray-600)] hover:bg-[var(--bg-hover)] hover:text-[var(--gray-900)]",
        danger:
          "bg-[var(--danger-500)] text-white hover:bg-[var(--danger-700)]",
        accent:
          "bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { buttonVariants };
