import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import type { FilterOption } from "@/components/grants/filters-bar";
import { GrantsSearchClient } from "@/components/grants/grants-search-client";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { getFacetSets, safeNumber, searchGrants } from "@/lib/search";
import type { Grant } from "@/lib/types";

const PAGE_SIZE = 12;

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const dynamicParams = true;
export const runtime = "nodejs";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const keywordParam = typeof searchParams?.keyword === "string" ? searchParams.keyword : undefined;
  const legacyQueryParam = typeof searchParams?.query === "string" ? searchParams.query : undefined;
  const keyword = keywordParam ?? legacyQueryParam;
  const category = typeof searchParams?.category === "string" ? searchParams.category : undefined;
  const agency = typeof searchParams?.agency === "string" ? searchParams.agency : undefined;

  const baseTitle = "Private Grants & Foundation Funding";
  const titleSegments = [baseTitle];
  if (category) titleSegments.unshift(`${category} grants`);
  if (agency) titleSegments.unshift(`${agency} programs`);
  if (keyword) titleSegments.unshift(`Results for "${keyword}"`);

  const title = titleSegments.join(" | ");
  const description =
    "Explore private, corporate, and foundation funding opportunities.";
  const canonical = "https://www.grantdirectory.org/grants/private";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title,
      description,
      type: "website",
    },
  };
}

export default async function PrivateGrantsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = safeNumber(searchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(searchParams?.pageSize, PAGE_SIZE));
  const keywordParam = typeof searchParams?.keyword === "string" ? searchParams.keyword : undefined;
  const legacyQueryParam = typeof searchParams?.query === "string" ? searchParams.query : undefined;
  const query = keywordParam ?? legacyQueryParam;
  const category = typeof searchParams?.category === "string" ? searchParams.category : undefined;
  const agency = typeof searchParams?.agency === "string" ? searchParams.agency : undefined;
  const hasApplyLink = searchParams?.has_apply_link === "1";

  const filters = {
    page,
    pageSize,
    query,
    category,
    agency,
    hasApplyLink,
    jurisdiction: "private" as const,
  };

  const [{ grants, total, totalPages }, facets] = await Promise.all([
    searchGrants(filters),
    getFacetSets(),
  ]);

  const categoryOptions: FilterOption[] = facets.categories.map((item) => ({
    label: `${item.label} (${item.grantCount})`,
    value: item.slug,
  }));
  const agencyOptions: FilterOption[] = facets.agencies.map((facet) => ({
    label: `${facet.label} (${facet.grantCount})`,
    value: facet.value,
  }));

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: "Private & foundation", href: "/grants/private" },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants as Grant[]);

  return (
    <div className="container-grid space-y-8 py-10">
      <Breadcrumb items={breadcrumbItems} />

      <header className="space-y-3 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Private & foundation funding
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Private & Foundation Grants</h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Explore private, corporate, and foundation opportunities with filters for keyword,
          category, agency, and application links.
        </p>
      </header>

      <GrantsSearchClient
        initialFilters={{
          query: query ?? "",
          category: category ?? "",
          agency: agency ?? "",
          hasApplyLink,
          page,
          pageSize,
        }}
        initialResults={{ grants, total, page, pageSize, totalPages }}
        categories={categoryOptions}
        states={[]}
        agencies={agencyOptions}
        showStateFilter={false}
        staticParams={{ jurisdiction: "private" }}
      />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateBreadcrumbJsonLd(
              breadcrumbItems.map((item) => ({
                name: item.label,
                url: item.href,
              }))
            ),
            itemListJsonLd,
          ]),
        }}
      />
    </div>
  );
}
