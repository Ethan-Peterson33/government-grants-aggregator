"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface MenuItem {
  label: string;
  href?: string;
  onItemClick?: () => Promise<void> | void;
  isPrimary?: boolean;
}

interface MenuProps {
  items: MenuItem[];
  onItemClick?: (item: MenuItem) => void;
  className?: string;
}

export function Menu({ items, onItemClick, className }: MenuProps) {
  const pathname = usePathname();

  return (
    <nav className={clsx("flex flex-wrap gap-2", className)}>
      {items.map((item) => {
        const active = item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false;
        const baseClasses = item.isPrimary
          ? "inline-flex items-center justify-center rounded-full border border-blue-100 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          : "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";
        const activeClasses = item.isPrimary
          ? "bg-blue-700"
          : "bg-slate-900/5 text-slate-900";

        if (item.onItemClick) {
          return (
            <button
              key={item.label}
              type="button"
              className={clsx(baseClasses, active ? activeClasses : null)}
              onClick={() => {
                onItemClick?.(item);
                item.onItemClick?.();
              }}
            >
              {item.label}
            </button>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href ?? "#"}
            className={clsx(baseClasses, active ? activeClasses : null)}
            onClick={() => {
              if (item) {
                onItemClick?.(item);
              }
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
