import * as React from "react";
import clsx from "clsx";

type BadgeVariant = "secondary" | "outline";

export function Badge({
  variant = "secondary",
  className,
  children,
}: React.PropsWithChildren<{ variant?: BadgeVariant; className?: string }>) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variant === "secondary" && "bg-slate-100 text-slate-800",
        variant === "outline" && "border border-slate-200 text-slate-700 bg-white",
        className
      )}
    >
      {children}
    </span>
  );
}
