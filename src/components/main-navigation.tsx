"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  isButton?: boolean;
};

const navItems: NavItem[] = [
  { href: "/grants", label: "Search Grants" },
  { href: "/agencies", label: "Agencies" },
  { href: "/resources", label: "Resources", isButton: true },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(`${href}/`);
}

export function MainNavigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-4 text-sm font-medium sm:flex">
      {navItems.map((item) => {
        const active = isActive(pathname ?? "", item.href);
        const baseClasses = clsx(
          "transition-colors",
          item.isButton
            ? "rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm hover:border-blue-400 hover:text-blue-600"
            : "px-1 py-2 hover:text-slate-900"
        );
        const activeClasses = item.isButton
          ? "border-blue-500 text-blue-600 shadow"
          : "text-slate-900 font-semibold";
        const inactiveClasses = item.isButton
          ? "text-slate-700"
          : "text-slate-600";

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(baseClasses, active ? activeClasses : inactiveClasses)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
