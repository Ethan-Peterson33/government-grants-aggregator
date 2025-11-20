import Link from "next/link";
import type { Metadata } from "next";

import { AffiliateOfferCard } from "@/components/affiliate-offer-card";
import { digitalProducts } from "@/config/digital-products";

export const metadata: Metadata = {
  title: "Resources & Digital Guides | GrantDirectory.org",
  description:
    "Browse premium workbooks and digital tools from GrantDirectory.org, including our first-time homebuyer starter pack.",
};

export default function ResourcesPage() {
  return (
    <main className="bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl px-4">
        <header className="space-y-4 text-center sm:text-left">
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Resources &amp; Digital Guides
          </h1>
          <p className="text-base text-slate-700 sm:text-lg">
            Explore premium workbooks, templates, and tools to help you win grants and
            navigate homebuying with confidence. More resources will be added over time.
          </p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {digitalProducts.map((product) => (
            <AffiliateOfferCard
              key={product.slug}
              offer={{
                title: product.name,
                description: product.shortDescription,
                href: `/resources/${product.slug}`,
                cta: "View details",
                secondaryHref: product.lemonSqueezyUrl,
                secondaryCta: "Buy now",
                tags: product.tags,
                color: "blue",
                secondaryExternal: true,
              }}
            />
          ))}
        </div>

        <section className="mt-12 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Affiliate disclosure</h2>
          <p className="mt-2 text-sm text-slate-700">
            Some resource links may be affiliate links, which means we may earn a commission if you purchase through them. This
            comes at no extra cost to you and helps keep GrantDirectory.org running.
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Prefer to keep browsing? Visit the <Link href="/grants" className="text-blue-700 hover:underline">grants</Link> page
            to explore funding opportunities.
          </p>
        </section>
      </div>
    </main>
  );
}
