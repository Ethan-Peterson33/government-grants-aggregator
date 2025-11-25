import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantsSearchClient } from "@/components/grants/grants-search-client";

import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { getFacetSets, safeNumber, searchGrants } from "@/lib/search";
import type { GrantFilters } from "@/lib/types";
import { normalizeCategory, slugify, wordsFromSlug } from "@/lib/strings";
import { findStateInfo, resolveStateQueryValue } from "@/lib/grant-location";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { CATEGORY_CONTENT } from "@/lib/category-content";  // ← NEW

const PAGE_SIZE = 12;

type CategoryRecord = {
  category_code: string;
  category_label: string;
  slug: string;
};

type CategoryStateLink = {
  label: string;
  slug: string;
  count: number;
};

async function loadCategoryRecord(categorySlug: string): Promise<CategoryRecord | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("grant_categories")
    .select("category_code, category_label, slug")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (error) {
    console.error("[category] Error loading category record", { categorySlug, error });
    return null;
  }

  return data ?? null;
}

function toStateLink(rawState?: string): Omit<CategoryStateLink, "count"> | null {
  if (typeof rawState !== "string") return null;
  const cleaned = rawState.trim();
  if (!cleaned) return null;

  const stateInfo = findStateInfo(cleaned);
  const label = stateInfo?.name ?? wordsFromSlug(slugify(cleaned) ?? cleaned) ?? cleaned;
  const slug = stateInfo?.code ?? slugify(label);

  if (!label || !slug) return null;
  return { label, slug };
}

async function loadCategoryStateLinks(categorySlug: string): Promise<CategoryStateLink[]> {
  const categoryRecord = await loadCategoryRecord(categorySlug);
  if (!categoryRecord) return [];

  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("grants")
    .select("state")
    .eq("category_code", categoryRecord.category_code)
    .or("active.is.null,active.eq.true");

  if (error) {
    console.error("[category] Error loading category states", { categorySlug, error });
    return [];
  }

  const accumulator = new Map<string, CategoryStateLink>();

  for (const entry of data ?? []) {
    const link = toStateLink(entry?.state);
    if (!link) continue;

    const existing = accumulator.get(link.slug);
    if (existing) {
      existing.count += 1;
    } else {
      accumulator.set(link.slug, { ...link, count: 1 });
    }
  }

  return Array.from(accumulator.values()).sort((a, b) => a.label.localeCompare(b.label));
}

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

  const [{ grants, total, totalPages }, facets, categoryStates] = await Promise.all([
    searchGrants(filters),
    getFacetSets(),
    loadCategoryStateLinks(categorySlug),
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

   {/* CATEGORY HERO */}
<header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-sky-50 to-blue-50 px-5 py-8 shadow-sm sm:px-8 sm:py-10">
  <style>{`
    @keyframes category-hero-fade-up {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .category-hero-fade-up {
      opacity: 0;
      transform: translateY(20px);
      animation: category-hero-fade-up 0.85s ease-out forwards;
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
    <p className="category-hero-fade-up text-xs font-semibold uppercase tracking-wide text-blue-700 [animation-delay:0.02s]">
      {categoryLabel} Grants
    </p>

    <div className="space-y-4">
      <h1 className="category-hero-fade-up text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl [animation-delay:0.06s]">
        Explore {categoryLabel} Grants Nationwide
      </h1>

      <p className="category-hero-fade-up text-sm text-slate-700 sm:text-base lg:text-lg [animation-delay:0.12s]">
        Discover active {categoryLabel.toLowerCase()} funding across federal, state, local, and private funders.
        Updated daily with new programs and opportunities.
      </p>
    </div>

    {/* CTAs */}
    <div className="category-hero-fade-up flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:0.18s]">
      <a
        href="#category-search"
        className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-300/70 transition hover:bg-emerald-700 hover:shadow-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        Search {categoryLabel} grants
      </a>

      <a
        href="/resources/first-time-homebuyer-starter-pack"
        className="inline-flex items-center justify-center rounded-xl border border-[#FF5A5F] bg-white/80 px-6 py-3 text-sm font-semibold text-[#FF5A5F] shadow-sm backdrop-blur transition hover:bg-[#FF5A5F] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A5F] focus-visible:ring-offset-2"
      >
        Download the 2025 FTHB Toolkit – $17
      </a>
    </div>

    {/* Trust Line */}
    <p className="category-hero-fade-up text-xs font-medium uppercase tracking-wide text-slate-600 sm:text-sm [animation-delay:0.24s]">
      {total.toLocaleString()} active programs listed • Updated daily • All 50 states + DC
    </p>
  </div>
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

      {categoryStates.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Browse by state</h2>
            <p className="text-sm text-slate-600">
              Jump straight to state-specific {categoryLabel.toLowerCase()} programs.
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {categoryStates.map((state) => (
              <Link
                key={state.slug}
                href={`/grants/category/${categorySlug}/${state.slug}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                {state.label}
                <span className="ml-1 text-slate-500">({state.count})</span>
              </Link>
            ))}
          </div>
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
