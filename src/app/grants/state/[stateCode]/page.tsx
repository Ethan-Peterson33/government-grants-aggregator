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
    const categoryRelation = Array.isArray(entry?.grant_categories)
      ? entry.grant_categories[0]
      : entry?.grant_categories;

    const categoryLabel =
      typeof categoryRelation?.category_label === "string" && categoryRelation.category_label.trim().length > 0
        ? categoryRelation.category_label.trim()
        : typeof entry?.category === "string" && entry.category.trim().length > 0
          ? entry.category.trim()
          : null;

    const categorySlug =
      typeof categoryRelation?.slug === "string" && categoryRelation.slug.trim().length > 0
        ? categoryRelation.slug.trim()
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

    {/* STATE HERO */}
  <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-sky-50 to-blue-50 px-5 py-8 shadow-sm sm:px-8 sm:py-10">
    <style>{`
      @keyframes state-hero-fade-up {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .state-hero-fade-up {
        opacity: 0;
        transform: translateY(20px);
        animation: state-hero-fade-up 0.85s ease-out forwards;
      }
    `}</style>

    {/* Subtle blurred background image */}
    <div className="pointer-events-none absolute inset-0 opacity-60">
      <div
        className="h-full w-full bg-cover bg-center blur-sm"
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/7579121/pexels-photo-7579121.jpeg?auto=compress&cs=tinysrgb&w=1600')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/90 via-sky-50/90 to-blue-50/95" />
    </div>

    <div className="relative z-10 space-y-6">
      <p className="state-hero-fade-up text-xs font-semibold uppercase tracking-wide text-blue-700 [animation-delay:0.02s]">
        Grants in {stateInfo.name}
      </p>

      <div className="space-y-4">
        <h1 className="state-hero-fade-up text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl [animation-delay:0.06s]">
          {category
            ? `${category} grants in ${stateInfo.name}`
            : `${stateInfo.name} statewide grants & funding programs`}
        </h1>

        <p className="state-hero-fade-up text-sm text-slate-700 sm:text-base lg:text-lg [animation-delay:0.12s]">
          {stateSeoContent?.intro
            ? stateSeoContent.intro
            : `Explore active funding opportunities from state agencies, cities, and local partners across ${stateInfo.name}. Filter by category, agency, or keyword to find grants that match your project, business, or community.`}
        </p>
      </div>

      {/* CTAS */}
      <div className="state-hero-fade-up flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:0.18s]">
        <Link
          href="#state-grant-search"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-300/70 transition hover:bg-emerald-700 hover:shadow-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Search {stateInfo.name} grants now
        </Link>

        {homebuyerProduct && (
          <Link
            href={`/resources/${homebuyerProduct.slug}`}
            className="inline-flex items-center justify-center rounded-xl border border-[#FF5A5F] bg-white/80 px-6 py-3 text-sm font-semibold text-[#FF5A5F] shadow-sm backdrop-blur transition hover:bg-[#FF5A5F] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A5F] focus-visible:ring-offset-2"
          >
            Download the 2025 FTHB Toolkit – Only $17
          </Link>
        )}
      </div>

      {/* Trust / meta line */}
      <p className="state-hero-fade-up text-xs font-medium uppercase tracking-wide text-slate-600 sm:text-sm [animation-delay:0.24s]">
        {total.toLocaleString()} programs currently listed in {stateInfo.name} • Updated daily
      </p>
    </div>
  </header>

  
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
