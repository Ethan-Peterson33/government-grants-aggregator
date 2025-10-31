"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
          variant === "default" && "bg-slate-900 text-white hover:bg-slate-800",
          variant === "outline" && "border border-slate-200 bg-white hover:bg-slate-100",
          variant === "ghost" && "hover:bg-slate-100",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
