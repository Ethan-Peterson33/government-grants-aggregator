import type { Metadata } from "next";

import Link from "next/link";
import { AffiliateOfferCard } from "@/components/affiliate-offer-card";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import type { FilterOption } from "@/components/grants/filters-bar";
import { GrantsSearchClient } from "@/components/grants/grants-search-client";
import { digitalProducts } from "@/config/digital-products";
import { stateGrantContent } from "@/lib/state-content";
import {
  resolveRouteParams,
  resolveSearchParams,
  extractSearchParam,
  type SearchParamsLike,
} from "@/app/grants/_components/route-params";

import { resolveStateParam, stateNameCandidatesFromCode } from "@/lib/grant-location";
import { slugify, wordsFromSlug } from "@/lib/strings";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchGrants, getFacetSets } from "@/lib/search";
import type { GrantFilters } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PAGE_SIZE = 12;

type StateCategoryLink = {
  label: string;
  slug: string;
  count: number;
};

function formatCategory(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return wordsFromSlug(value.toLowerCase().replace(/\s+/g, "-"));
}

async function loadStateCategoryLinks(stateCode: string, stateName: string): Promise<StateCategoryLink[]> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const stateCandidates = Array.from(
    new Set([stateCode, stateCode.toUpperCase(), stateCode.toLowerCase(), stateName, ...stateNameCandidatesFromCode(stateCode)])
  ).filter(Boolean);

  const { data, error } = await supabase
    .from("grants")
    .select("category, grant_categories(category_label, slug)")
    .in("state", stateCandidates)
    .or("active.is.null,active.eq.true");

  if (error) {
    console.error("[state] Error loading category links", { stateCode, error });
    return [];
  }

  const accumulator = new Map<string, StateCategoryLink>();

  for (const entry of data ?? []) {
    const categoryLabel =
      typeof entry?.grant_categories?.category_label === "string" && entry.grant_categories.category_label.trim().length > 0
        ? entry.grant_categories.category_label.trim()
        : typeof entry?.category === "string" && entry.category.trim().length > 0
          ? entry.category.trim()
          : null;

    const categorySlug =
      typeof entry?.grant_categories?.slug === "string" && entry.grant_categories.slug.trim().length > 0
        ? entry.grant_categories.slug.trim()
        : categoryLabel
          ? slugify(categoryLabel)
          : null;

    if (!categoryLabel || !categorySlug) continue;

    const existing = accumulator.get(categorySlug);
    if (existing) {
      existing.count += 1;
    } else {
      accumulator.set(categorySlug, { label: categoryLabel, slug: categorySlug, count: 1 });
    }
  }

  return Array.from(accumulator.values()).sort((a, b) => a.label.localeCompare(b.label));
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
  const stateSeoContent = stateGrantContent[stateInfo.code];
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

  const [[{ grants, total, totalPages }, facets], categoryLinks] = await Promise.all([
    Promise.all([searchGrants(filters), getFacetSets()]),
    loadStateCategoryLinks(stateInfo.code, stateInfo.name),
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
  const homebuyerProduct = digitalProducts.find(
    (product) => product.category === "homebuyer"
  );

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
{/* ---- NEW STATIC CONTENT BLOCK ---- */}
      {stateSeoContent && (
        <section className="prose prose-slate max-w-none py-4">
          {stateSeoContent.heading && (
            <h2 className="text-2xl font-semibold">{stateSeoContent.heading}</h2>
          )}

    {stateSeoContent.intro && (
      <p className="text-slate-700">{stateSeoContent.intro}</p>
    )}

          {stateSeoContent.body && (
            <p className="text-slate-700">{stateSeoContent.body}</p>
          )}
        </section>
      )}

      {categoryLinks.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Browse by category</h2>
            <p className="text-sm text-slate-600">
              Jump straight to {stateInfo.name} grants filtered by focus area.
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {categoryLinks.map((category) => (
              <Link
                key={category.slug}
                href={`/grants/category/${category.slug}/${stateInfo.code}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                {category.label}
                <span className="ml-1 text-slate-500">({category.count})</span>
              </Link>
            ))}
          </div>
        </section>
      )}
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

      {homebuyerProduct ? (
        <section className="mt-6 space-y-3 border-t border-slate-200 pt-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-slate-900">
              First-time homebuyer? Start with this guide.
            </h2>
            <p className="text-sm text-slate-700">
              This downloadable workbook walks you through grants, timelines, and checklists so you can buy with confidence in
              {" "}
              {stateInfo.name}.
            </p>
          </div>
          <AffiliateOfferCard
            offer={{
              title: homebuyerProduct.name,
              description: homebuyerProduct.shortDescription,
              href: `/resources/${homebuyerProduct.slug}`,
              cta: "View details",
              secondaryHref: homebuyerProduct.lemonSqueezyUrl,
              secondaryCta: "Buy now",
              tags: homebuyerProduct.tags,
              color: "blue",
              secondaryExternal: true,
            }}
          />
        </section>
      ) : null}

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
