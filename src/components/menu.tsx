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
    <nav
      aria-label="Primary"
      className={clsx(
        "flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:gap-4 md:border-0 md:bg-transparent md:p-0",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false;
        const baseClasses = clsx(
          "inline-flex w-full items-center px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 md:w-auto",
          item.isPrimary
            ? "justify-center rounded-full border border-blue-100 bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
            : "justify-start rounded-lg text-slate-700 hover:bg-slate-100 md:justify-center md:rounded-full",
        );
        const activeClasses = item.isPrimary
          ? "bg-blue-700"
          : "bg-slate-900/5 text-slate-900";
        const inactiveClasses = item.isPrimary ? undefined : "text-slate-700";

        if (item.onItemClick) {
          return (
            <button
              key={item.label}
              type="button"
              className={clsx(baseClasses, active ? activeClasses : inactiveClasses)}
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
            aria-current={active ? "page" : undefined}
            className={clsx(baseClasses, active ? activeClasses : inactiveClasses)}
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
