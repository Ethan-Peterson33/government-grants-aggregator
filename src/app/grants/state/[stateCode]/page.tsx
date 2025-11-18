import type { Metadata } from "next";

import { Breadcrumb } from "@/components/grants/breadcrumb";
import type { FilterOption } from "@/components/grants/filters-bar";
import { GrantsSearchClient } from "@/components/grants/grants-search-client";

import {
  resolveRouteParams,
  resolveSearchParams,
  extractSearchParam,
  type SearchParamsLike,
} from "@/app/grants/_components/route-params";

import { resolveStateParam } from "@/lib/grant-location";
import { wordsFromSlug } from "@/lib/strings";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";

import { safeNumber, searchGrants, getFacetSets } from "@/lib/search";
import type { GrantFilters } from "@/lib/types";

const PAGE_SIZE = 12;

function formatCategory(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return wordsFromSlug(value.toLowerCase().replace(/\s+/g, "-"));
}

/* --------------------------
   METADATA
--------------------------- */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { stateCode: string } | Promise<{ stateCode: string }>;
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | Promise<URLSearchParams | Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolvedParams = await resolveRouteParams(params, "state.metadata");
  const resolvedSearch = (await resolveSearchParams(searchParams, "state.metadata")) as
    | SearchParamsLike
    | undefined;

  const stateInfo = resolveStateParam(resolvedParams?.stateCode);
  const rawCategory = extractSearchParam(resolvedSearch, "category");
  const category = formatCategory(rawCategory);

  const title = category
    ? `${category} Grants in ${stateInfo.name}`
    : `${stateInfo.name} Statewide Grants`;

  const description = category
    ? `Explore ${category.toLowerCase()} funding available across ${stateInfo.name}.`
    : `Discover statewide grant programs supporting communities throughout ${stateInfo.name}.`;

  return { title, description };
}

/* --------------------------
   PAGE
--------------------------- */
export default async function StateGrantsPage({
  params,
  searchParams,
}: {
  params: { stateCode: string } | Promise<{ stateCode: string }>;
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | Promise<URLSearchParams | Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await resolveRouteParams(params, "state.page");
  const resolvedSearch = (await resolveSearchParams(searchParams, "state.page")) as
    | SearchParamsLike
    | undefined;

  const stateInfo = resolveStateParam(resolvedParams?.stateCode);

  /* --------------------------
      Resolve URL params
  --------------------------- */
  const page = safeNumber(extractSearchParam(resolvedSearch, "page") ?? undefined, 1);
  const pageSize = Math.min(
    50,
    safeNumber(extractSearchParam(resolvedSearch, "pageSize") ?? undefined, PAGE_SIZE)
  );

  const rawCategory = extractSearchParam(resolvedSearch, "category");
  const category = formatCategory(rawCategory);

  /* --------------------------
      Construct filters for initial SSR request
  --------------------------- */
  const filters: GrantFilters = {
    page,
    pageSize,
    state: stateInfo.name,
    stateCode: stateInfo.code,
    category,
    jurisdiction: "state",
  };

  const [{ grants, total, totalPages }, facets] = await Promise.all([
    searchGrants(filters),
    getFacetSets(),
  ]);

  /* --------------------------
      Build filter options
  --------------------------- */
  const categoryOptions: FilterOption[] = facets.categories.map((item) => ({
    label: `${item.label} (${item.grantCount})`,
    value: item.slug,
  }));

  const stateOptions: FilterOption[] = [
    { label: stateInfo.name, value: stateInfo.code },
  ];

  const agencyOptions: FilterOption[] = facets.agencies.map((a) => ({
    label: `${a.label} (${a.grantCount})`,
    value: a.value,
  }));

  /* --------------------------
      Breadcrumbs
  --------------------------- */
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: stateInfo.name, href: `/grants/state/${stateInfo.code}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {category
            ? `${category} grants in ${stateInfo.name}`
            : `${stateInfo.name} statewide grants`}
        </h1>
        <p className="text-slate-600">
          Explore active funding opportunities throughout {stateInfo.name}.
        </p>
      </header>

      {/* --------------------------
           FILTER + CLIENT SEARCH
      --------------------------- */}
      <GrantsSearchClient
        initialFilters={{
          query: "",
          category: category ?? "",
          state: stateInfo.code,          // default to the state (Behavior D)
          agency: "",
          hasApplyLink: false,
          page,
          pageSize,
        }}
        initialResults={{
          grants,
          total,
          page,
          pageSize,
          totalPages,
        }}
        categories={categoryOptions}
        states={stateOptions}
        agencies={agencyOptions}
        lockedFilters={{
          state: stateInfo.code,          // Behavior D: default AND locked
        }}
        staticParams={{
          jurisdiction: "state",
          stateCode: stateInfo.code,
        }}
        showStateFilter={false}           // State is locked, hide selector
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
