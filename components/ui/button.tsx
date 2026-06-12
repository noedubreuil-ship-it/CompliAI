"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-[#003399] text-white shadow-md shadow-blue-900/20 hover:bg-[#0044cc] hover:shadow-lg hover:shadow-blue-900/25 hover:-translate-y-0.5",
        destructive:
          "bg-red-500 text-white shadow-md shadow-red-500/20 hover:bg-red-600 hover:-translate-y-0.5",
        outline:
          "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5",
        secondary:
          "bg-slate-100 text-slate-800 hover:bg-slate-200 hover:-translate-y-0.5",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        link:
          "text-[#003399] underline-offset-4 hover:underline p-0 h-auto font-medium",
        gold:
          "bg-[#FFCC00] text-[#003399] font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-300 hover:shadow-yellow-500/30 hover:-translate-y-0.5",
        "glass-dark":
          "bg-white/10 backdrop-blur-sm border border-white/15 text-white hover:bg-white/20 hover:-translate-y-0.5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 py-1.5 text-xs rounded-lg",
        lg: "h-12 px-7 py-3 text-base rounded-2xl",
        xl: "h-14 px-9 py-4 text-lg rounded-2xl",
        icon: "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
