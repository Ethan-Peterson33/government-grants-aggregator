import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchGrants } from "@/lib/search";
import type { Grant } from "@/lib/types";
import { sentenceCase } from "@/lib/utils";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: { state: string; city: string; category: string };
}): Promise<Metadata> {
  const stateName = sentenceCase(params.state);
  const cityName = sentenceCase(params.city);
  const categoryName = sentenceCase(params.category);
  return {
    title: `${categoryName} Grants in ${cityName}, ${stateName}`,
    description: `Browse ${categoryName.toLowerCase()} funding available in ${cityName}, ${stateName}, including local and statewide opportunities.`,
  };
}

export default async function CategoryGrantsPage({
  params,
  searchParams,
}: {
  params: { state: string; city: string; category: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { state, city, category } = params;
  const page = safeNumber(searchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(searchParams?.pageSize, PAGE_SIZE));
  const stateName = sentenceCase(state);
  const cityName = sentenceCase(city);
  const categoryName = sentenceCase(category);
  const stateFilter = state.length <= 2 ? state.toUpperCase() : stateName;
  const cityFilter = cityName;

  const { grants, total } = await searchGrants({
    state: stateFilter,
    city: cityFilter,
    category: categoryName,
    page,
    pageSize,
  });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: stateName, href: `/grants/${state}` },
    { label: cityName, href: `/grants/${state}/${city}` },
    { label: categoryName, href: `/grants/${state}/${city}/${category}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);
  const hasResults = grants.length > 0;

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {categoryName} grants in {cityName}
        </h1>
        <p className="text-slate-600">
          Specialized funding in {cityName} for {categoryName.toLowerCase()} initiatives. Review details to confirm eligibility and deadlines.
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-4">
          {hasResults ? (
            grants.map((grant: Grant) => <GrantCard key={grant.id} grant={grant} />)
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-600">
              <p>No {categoryName.toLowerCase()} funding is available right now. Check another category or broaden your search radius.</p>
            </div>
          )}
        </div>
        {hasResults && <Pagination total={total} pageSize={pageSize} currentPage={page} />}
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
