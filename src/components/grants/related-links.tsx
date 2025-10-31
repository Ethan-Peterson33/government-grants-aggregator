import Link from "next/link";

export type RelatedLink = {
  label: string;
  href: string;
};

export function RelatedLinks({ links }: { links: RelatedLink[] }) {
  if (!links.length) return null;

  return (
    <aside className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Related searches
      </h2>
      <ul className="space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-slate-700 hover:text-slate-900">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
