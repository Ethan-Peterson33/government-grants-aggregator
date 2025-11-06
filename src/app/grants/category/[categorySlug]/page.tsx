import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchGrants } from "@/lib/search";
import type { GrantFilters } from "@/lib/types";
import { wordsFromSlug } from "@/lib/strings";

const PAGE_SIZE = 12;

function normalizeCategory(slug: string) {
  return wordsFromSlug(slug.toLowerCase());
}

export async function generateMetadata({ params }: { params: { categorySlug: string } }): Promise<Metadata> {
  const category = normalizeCategory(params.categorySlug);
  return {
    title: `${category} Grants`,
    description: `Browse active ${category.toLowerCase()} grants across agencies and jurisdictions.`,
  };
}

export default async function CategoryGrantsPage({
  params,
  searchParams,
}: {
  params: { categorySlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = safeNumber(searchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(searchParams?.pageSize, PAGE_SIZE));
  const jurisdictionParam = typeof searchParams?.jurisdiction === "string" ? searchParams.jurisdiction : undefined;
  const allowedJurisdictions: GrantFilters["jurisdiction"][] = ["federal", "state", "local"];
  const jurisdiction = allowedJurisdictions.includes(jurisdictionParam as GrantFilters["jurisdiction"])
    ? (jurisdictionParam as GrantFilters["jurisdiction"])
    : undefined;
  const category = normalizeCategory(params.categorySlug);

  const { grants, total } = await searchGrants({
    page,
    pageSize,
    category,
    jurisdiction,
  });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: category, href: `/grants/category/${params.categorySlug}` },
  ];

  const getHref = (targetPage: number) => {
    const qs = new URLSearchParams();
    if (targetPage > 1) qs.set("page", String(targetPage));
    if (pageSize !== PAGE_SIZE) qs.set("pageSize", String(pageSize));
    if (jurisdiction) qs.set("jurisdiction", jurisdiction);
    const query = qs.toString();
    return query ? `/grants/category/${params.categorySlug}?${query}` : `/grants/category/${params.categorySlug}`;
  };

  const itemListJsonLd = generateItemListJsonLd(grants);

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{category} grants</h1>
        <p className="text-slate-600">
          Discover current {category.toLowerCase()} funding across federal, state, and local programs.
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-4">
          {grants.length ? (
            grants.map((grant) => <GrantCard key={grant.id} grant={grant} />)
          ) : (
            <div className="rounded-md border border-slate-200 p-8 text-center text-slate-600">
              No results yet. Try another category or jurisdiction.
            </div>
          )}
        </div>
        {grants.length > 0 && (
          <Pagination total={total} pageSize={pageSize} currentPage={page} getHref={getHref} />
        )}
      </section>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateBreadcrumbJsonLd(breadcrumbItems.map((item) => ({ name: item.label, url: item.href }))),
            itemListJsonLd,
          ]),
        }}
      />
    </div>
  );
}
