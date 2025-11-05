import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { RelatedLinks } from "@/components/grants/related-links";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchGrants } from "@/lib/search";
import type { Grant } from "@/lib/types";
import { sentenceCase } from "@/lib/utils";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: { state: string; city: string };
}): Promise<Metadata> {
  const stateName = sentenceCase(params.state);
  const cityName = sentenceCase(params.city);
  return {
    title: `${cityName}, ${stateName} Grants`,
    description: `Find funding opportunities that support organizations in ${cityName}, ${stateName}, from local agencies to statewide programs.`,
  };
}

export default async function CityGrantsPage({
  params,
  searchParams,
}: {
  params: { state: string; city: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { state, city } = params;
  const page = safeNumber(searchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(searchParams?.pageSize, PAGE_SIZE));
  const stateName = sentenceCase(state);
  const cityName = sentenceCase(city);
  const stateFilter = state.length <= 2 ? state.toUpperCase() : stateName;
  const cityFilter = cityName;

  const { grants, total } = await searchGrants({ state: stateFilter, city: cityFilter, page, pageSize });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: stateName, href: `/grants/${state}` },
    { label: cityName, href: `/grants/${state}/${city}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);
  const hasResults = grants.length > 0;

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (targetPage > 1) {
      params.set("page", String(targetPage));
    }
    if (pageSize !== PAGE_SIZE) {
      params.set("pageSize", String(pageSize));
    }
    const query = params.toString();
    return query ? `/grants/${state}/${city}?${query}` : `/grants/${state}/${city}`;
  };

  const relatedLinks = [
    { label: `All ${stateName} grants`, href: `/grants/${state}` },
    { label: `${cityName} business funding`, href: `/grants/${state}/${city}/business` },
  ];

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{cityName} grants</h1>
        <p className="text-slate-600">
          Browse active grants supporting organizations in {cityName}. Filter by category to discover opportunities tailored to
          your community.
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-4">
          {hasResults ? (
            grants.map((grant: Grant) => <GrantCard key={grant.id} grant={grant} />)
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-600">
              <p>No grants published for this city yet. Try nearby regions or statewide programs.</p>
            </div>
          )}
        </div>
        {hasResults && (
          <Pagination
            total={total}
            pageSize={pageSize}
            currentPage={page}
            hrefBuilder={buildPageHref}
          />
        )}
      </section>

      <RelatedLinks links={relatedLinks} />

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
