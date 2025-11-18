import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import type { FilterOption } from "@/components/grants/filters-bar";
import { GrantsSearchClient } from "@/components/grants/grants-search-client";

import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { getFacetSets, safeNumber, searchGrants } from "@/lib/search";
import type { GrantFilters } from "@/lib/types";
import { normalizeCategory } from "@/lib/strings";
import { resolveStateQueryValue } from "@/lib/grant-location";

import { CATEGORY_CONTENT } from "@/lib/category-content";  // ← NEW

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const categoryLabel = normalizeCategory(categorySlug);

  return {
    title: `${categoryLabel} Grants`,
    description: `Browse active ${categoryLabel.toLowerCase()} grants across public and private funders.`,
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

  const keywordParam = typeof resolvedSearchParams?.keyword === "string" ? resolvedSearchParams.keyword : undefined;
  const legacyQueryParam = typeof resolvedSearchParams?.query === "string" ? resolvedSearchParams.query : undefined;
  const query = keywordParam ?? legacyQueryParam;

  const stateParam = typeof resolvedSearchParams?.state === "string" ? resolvedSearchParams.state : undefined;
  const resolvedState = resolveStateQueryValue(stateParam);
  const state = resolvedState.value || stateParam;

  const agency = typeof resolvedSearchParams?.agency === "string" ? resolvedSearchParams.agency : undefined;
  const hasApplyLink = resolvedSearchParams?.has_apply_link === "1";

  const jurisdictionParam =
    typeof resolvedSearchParams?.jurisdiction === "string" ? resolvedSearchParams.jurisdiction : undefined;
  const allowedJurisdictions: GrantFilters["jurisdiction"][] = ["federal", "state", "local", "private"];
  const jurisdiction = allowedJurisdictions.includes(jurisdictionParam as GrantFilters["jurisdiction"])
    ? (jurisdictionParam as GrantFilters["jurisdiction"])
    : undefined;

  const categorySlug = resolvedParams.categorySlug;
  const categoryLabel = normalizeCategory(categorySlug);

  const filters = {
    page,
    pageSize,
    query,
    category:
      typeof resolvedSearchParams?.category === "string" &&
      resolvedSearchParams.category.trim() !== ""
        ? resolvedSearchParams.category
        : categorySlug,
    state,
    stateCode: resolvedState.code,
    agency,
    hasApplyLink,
    jurisdiction,
  };

  const [{ grants, total, totalPages }, facets] = await Promise.all([
    searchGrants(filters),
    getFacetSets(),
  ]);

  const categoryOptions = facets.categories.map((item) => ({
    label: `${item.label} (${item.grantCount})`,
    value: item.slug,
  }));

  const stateOptions = facets.states.map((facet) => ({
    label: `${facet.label} (${facet.grantCount})`,
    value: facet.value,
  }));

  const agencyOptions = facets.agencies.map((facet) => ({
    label: `${facet.label} (${facet.grantCount})`,
    value: facet.value,
  }));

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: categoryLabel, href: `/grants/category/${categorySlug}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);

  // ✅ Load category static content
  const categoryContent = CATEGORY_CONTENT[categorySlug];

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{categoryLabel} Grants</h1>
        <p className="text-slate-600">
          Discover current {categoryLabel.toLowerCase()} funding across federal, state, local, and private programs.
        </p>
      </header>

      {/* -------------------------------------------
          CATEGORY STATIC CONTENT (if exists)
      ------------------------------------------- */}
      {categoryContent && (
        <section className="prose prose-slate max-w-none bg-slate-50 p-6 rounded-lg border border-slate-200">
          <p>{categoryContent.intro}</p><br></br>
          <p>{categoryContent.body}</p>
        </section>
      )}

      <GrantsSearchClient
        initialFilters={{
          query: query ?? "",
          category: categorySlug,
          state: state ?? "",
          agency: agency ?? "",
          hasApplyLink,
          page,
          pageSize,
        }}
        initialResults={{ grants, total, page, pageSize, totalPages }}
        categories={categoryOptions}
        states={stateOptions}
        agencies={agencyOptions}
        lockedFilters={undefined}
      />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateBreadcrumbJsonLd(
              breadcrumbItems.map((item) => ({ name: item.label, url: item.href }))
            ),
            itemListJsonLd,
          ]),
        }}
      />
    </div>
  );
}
