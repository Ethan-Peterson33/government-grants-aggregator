import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchGrants } from "@/lib/search";
import type { GrantFilters } from "@/lib/types";
import { normalizeCategory } from "@/lib/strings";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = normalizeCategory(categorySlug);
  return {
    title: `${category} Grants | Grant Directory`,
    description: `Browse active ${category.toLowerCase()} grants across agencies and jurisdictions.`,
  };
}

export default async function CategoryGrantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const page = safeNumber(resolvedSearchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(resolvedSearchParams?.pageSize, PAGE_SIZE));
  const jurisdictionParam =
    typeof resolvedSearchParams?.jurisdiction === "string" ? resolvedSearchParams.jurisdiction : undefined;
  const allowedJurisdictions: GrantFilters["jurisdiction"][] = ["federal", "state", "local"];
  const jurisdiction = allowedJurisdictions.includes(jurisdictionParam as GrantFilters["jurisdiction"])
    ? (jurisdictionParam as GrantFilters["jurisdiction"])
    : undefined;
  const category = normalizeCategory(resolvedParams.categorySlug);

  const { grants, total } = await searchGrants({
    page,
    pageSize,
    category,
    jurisdiction,
  });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: category, href: `/grants/category/${resolvedParams.categorySlug}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{category} Grants</h1>
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
          <Pagination
            total={total}
            pageSize={pageSize}
            currentPage={page}
            basePath={`/grants/category/${resolvedParams.categorySlug}`}
            staticParams={jurisdiction ? { jurisdiction } : undefined}
          />
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
