import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/grants/breadcrumb";
import { CategoryStateFthbFilters } from "@/components/grants/category-state-fthb-filters";
import { GrantCard } from "@/components/grants/grant-card";
import { GrantsSearchClient } from "@/components/grants/grants-search-client";
import { categoryStateCopy } from "@/content/categoryStateCopy";
import {
  resolveRouteParams,
  resolveSearchParams,
  extractSearchParam,
  type SearchParamsLike,
} from "@/app/grants/_components/route-params";
import { resolveStateParam, stateNameCandidatesFromCode } from "@/lib/grant-location";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FilterOption } from "@/components/grants/filters-bar";
import type { Grant, GrantFilters } from "@/lib/types";
import { wordsFromSlug } from "@/lib/strings";
import { getFacetSets, safeNumber, searchGrants } from "@/lib/search";

const PAGE_SIZE = 12;
const FTHB_PAGE_SIZE = 100;


type Params = { categorySlug: string; stateSlug: string };

type CategoryRecord = {
  category_code: string;
  category_label: string;
  slug: string;
};

type PageContext = {
  category: CategoryRecord;
  state: { code: string; name: string };
  stateSlug: string;
};

async function loadCategory(categorySlug: string): Promise<CategoryRecord | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("grant_categories")
    .select("category_code, category_label, slug")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (error) {
    console.error("[category-state] Error loading category", { categorySlug, error });
    return null;
  }

  return data ?? null;
}

async function loadContext(params: Params): Promise<PageContext | null> {
  const category = await loadCategory(params.categorySlug);
  const stateInfo = resolveStateParam(params.stateSlug);

  if (!category || !stateInfo.code) {
    return null;
  }

  return { category, state: stateInfo, stateSlug: params.stateSlug };
}

function buildStateCandidates(stateCode: string, stateName: string) {
  const candidates = new Set<string>([stateCode, stateName]);
  for (const candidate of stateNameCandidatesFromCode(stateCode)) {
    candidates.add(candidate);
  }
  return Array.from(candidates).filter(Boolean);
}

async function loadCategoryStateGrants(
  category: CategoryRecord,
  state: { code: string; name: string },
  opts?: {
    applicantTypes?: string[];
    geographyScope?: string | null;
  }
) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const stateCandidates = buildStateCandidates(state.code, state.name);

  let query = supabase
    .from("grants")
    .select("*")
    .eq("category_code", category.category_code)
    .in("state", stateCandidates)
    .order("scraped_at", { ascending: false })
    .limit(FTHB_PAGE_SIZE);

  query = query.or("active.is.null,active.eq.true");

  if (opts?.applicantTypes && opts.applicantTypes.length > 0) {
    query = query.filter("applicant_types", "cs", `{${opts.applicantTypes.join(",")}}`);
  }

  if (opts?.geographyScope) {
    query = query.eq("geography_scope", opts.geographyScope);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[category-state] Error loading grants", {
      category: category.slug,
      state: state.code,
      error,
    });
    return [];
  }

  return (data ?? []) as Grant[];
}

async function loadApplicantAndGeographyFacets(
  category: CategoryRecord,
  state: { code: string; name: string }
) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return { applicantTypes: [], geographyScopes: [] };
  }

  const stateCandidates = buildStateCandidates(state.code, state.name);

  let query = supabase
    .from("grants")
    .select("applicant_types, geography_scope")
    .eq("category_code", category.category_code)
    .in("state", stateCandidates);

  query = query.or("active.is.null,active.eq.true");

  const { data, error } = await query;

  if (error || !data) {
    console.error("[category-state] Error loading facets", {
      category: category.slug,
      state: state.code,
      error,
    });
    return { applicantTypes: [], geographyScopes: [] };
  }

  const EXCLUDED_APPLICANT_TYPES = new Set(["homebuyer", "first-time homebuyer"]);

  const applicantTypeCounts = new Map<string, number>();
  const geographyScopeCounts = new Map<string, number>();

  for (const row of data) {
    if (Array.isArray(row.applicant_types)) {
      for (const raw of row.applicant_types) {
        const key = String(raw ?? "").trim();
        if (!key) continue;
        if (EXCLUDED_APPLICANT_TYPES.has(key)) continue;

        applicantTypeCounts.set(key, (applicantTypeCounts.get(key) ?? 0) + 1);
      }
    }

    if (typeof row.geography_scope === "string") {
      const key = row.geography_scope.trim();
      if (!key) continue;
      geographyScopeCounts.set(key, (geographyScopeCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    applicantTypes: Array.from(applicantTypeCounts.entries())
      .map(([value, count]) => ({ value, label: value, grantCount: count }))
      .sort((a, b) => b.grantCount - a.grantCount || a.label.localeCompare(b.label)),
    geographyScopes: Array.from(geographyScopeCounts.entries())
      .map(([value, count]) => ({ value, label: value, grantCount: count }))
      .sort((a, b) => b.grantCount - a.grantCount || a.label.localeCompare(b.label)),
  };
}

function buildCopy(context: PageContext) {
  const copy = categoryStateCopy[context.category.slug]?.[context.stateSlug];
  const categoryLabel = context.category.category_label || wordsFromSlug(context.category.slug) || "Category";
  const heading =
    copy?.heading ?? `${categoryLabel} grants in ${context.state.name}`;
  const intro =
    copy?.intro ?? `Browse ${categoryLabel.toLowerCase()} grants available in ${context.state.name}, including statewide and local programs.`;

  return { copy, heading, intro, categoryLabel };
}

export async function generateMetadata({ params }: { params: Params | Promise<Params> }): Promise<Metadata> {
  console.group("🧭 [Metadata Generation] Category/State Page");

  try {
    const resolvedParams = await resolveRouteParams(params, "category-state.metadata");
    console.log("➡️ Resolved Params:", resolvedParams);
    if (!resolvedParams) {
      console.warn("⚠️ No route parameters resolved.");
      console.groupEnd();
      return {};
    }

    const context = await loadContext(resolvedParams);
    console.log("📦 Loaded Context:", context);
    if (!context) {
      console.warn("⚠️ Context could not be loaded.");
      console.groupEnd();
      return {};
    }

    const { copy, categoryLabel } = buildCopy(context);
    console.log("🧩 buildCopy Result:", { copy, categoryLabel });

    const defaultTitle = `${context.state.name} ${categoryLabel} Grants | GrantDirectory.org`;
    const title = copy?.seoTitle ?? defaultTitle;

    const description =
      copy?.seoDescription ??
      `Browse ${categoryLabel.toLowerCase()} grants available in ${context.state.name}, including state and local programs.`;

    const canonical = `https://www.grantdirectory.org/grants/category/${context.category.slug}/${context.stateSlug}`;
    const ogImageUrl = `https://www.grantdirectory.org/images/${context.stateSlug}-grants.jpg`;

    // Log the final metadata for inspection
    console.log("✅ Final Metadata:", {
      title,
      description,
      canonical,
      ogImageUrl,
    });

    console.groupEnd();

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: "Grant Directory",
        type: "article",
        locale: "en_US",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${context.state.name} ${categoryLabel} Grants`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    console.error("❌ [Metadata Error]:", error);
    console.groupEnd();
    return {};
  }
}


export default async function CategoryStatePage({
  params,
  searchParams,
}: {
  params: Params | Promise<Params>;
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | Promise<URLSearchParams | Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await resolveRouteParams(params, "category-state.page");
  const resolvedSearch = (await resolveSearchParams(searchParams, "category-state.page")) as
    | SearchParamsLike
    | undefined;

  if (!resolvedParams) return notFound();

  const context = await loadContext(resolvedParams);
  if (!context) return notFound();

  const isFthbCategory = context.category.slug === "first-time-homeowner";

  const page = safeNumber(extractSearchParam(resolvedSearch, "page") ?? undefined, 1);
  const pageSize = Math.min(50, safeNumber(extractSearchParam(resolvedSearch, "pageSize") ?? undefined, PAGE_SIZE));

  const keywordParam = extractSearchParam(resolvedSearch, "keyword");
  const legacyQueryParam = extractSearchParam(resolvedSearch, "query");
  const query = keywordParam ?? legacyQueryParam;

  const agency = extractSearchParam(resolvedSearch, "agency");
  const hasApplyLink = extractSearchParam(resolvedSearch, "has_apply_link") === "1";

  const jurisdictionParam = extractSearchParam(resolvedSearch, "jurisdiction");
  const allowedJurisdictions: GrantFilters["jurisdiction"][] = ["federal", "state", "local", "private"];
  const jurisdiction = allowedJurisdictions.includes(jurisdictionParam as GrantFilters["jurisdiction"])
    ? (jurisdictionParam as GrantFilters["jurisdiction"])
    : undefined;

  const applicantTypesParam = extractSearchParam(resolvedSearch, "applicant_types") ?? "";
  const selectedApplicantTypes = applicantTypesParam
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const selectedGeographyScopeRaw = extractSearchParam(resolvedSearch, "geography_scope") ?? "";
  const selectedGeographyScope = selectedGeographyScopeRaw.trim() ? selectedGeographyScopeRaw.trim() : null;

  const filters: GrantFilters = {
    page,
    pageSize,
    query,
    category: context.category.slug,
    state: context.state.code,
    stateCode: context.state.code,
    agency,
    hasApplyLink,
    jurisdiction,
  };

  const fthbFacets = isFthbCategory
    ? await loadApplicantAndGeographyFacets(context.category, context.state)
    : { applicantTypes: [], geographyScopes: [] };

  const searchData = !isFthbCategory ? await Promise.all([searchGrants(filters), getFacetSets()]) : null;
  const [{ grants, total, totalPages } = { grants: [] as Grant[], total: 0, totalPages: 0 }, facets] =
    searchData ?? [];

  const categoryOptions: FilterOption[] = facets
    ? facets.categories.map((item) => ({
        label: `${item.label} (${item.grantCount})`,
        value: item.slug,
      }))
    : [];

  const stateOptions: FilterOption[] = facets ? [{ label: context.state.name, value: context.state.code }] : [];

  const agencyOptions: FilterOption[] = facets
    ? facets.agencies.map((facet) => ({
        label: `${facet.label} (${facet.grantCount})`,
        value: facet.value,
      }))
    : [];

  const fthbGrants = isFthbCategory
    ? await loadCategoryStateGrants(context.category, context.state, {
        applicantTypes: selectedApplicantTypes,
        geographyScope: selectedGeographyScope,
      })
    : [];

  const { heading, intro, categoryLabel } = buildCopy(context);
  const displayTotal = isFthbCategory ? fthbGrants.length : total;

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: categoryLabel, href: `/grants/category/${context.category.slug}` },
    { label: `${context.state.name} ${categoryLabel}`, href: `/grants/category/${context.category.slug}/${context.stateSlug}` },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumb items={breadcrumbItems} />

     {/* HERO */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-sky-50 to-blue-50 px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        <style>{`
          @keyframes category-state-hero-fade-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .category-state-hero-fade-up {
            opacity: 0;
            transform: translateY(20px);
            animation: category-state-hero-fade-up 0.85s ease-out forwards;
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
          <p className="category-state-hero-fade-up text-xs font-semibold uppercase tracking-wide text-blue-700 [animation-delay:0.02s]">
            {context.state.name} • {categoryLabel} programs
          </p>

          <div className="space-y-4">
            <h1 className="category-state-hero-fade-up text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl [animation-delay:0.06s]">
              {heading}
            </h1>
            <p className="category-state-hero-fade-up text-sm text-slate-700 sm:text-base lg:text-lg [animation-delay:0.12s]">
              {intro}
            </p>
          </div>

          {/* CTAs */}
          <div className="category-state-hero-fade-up flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:0.18s]">
            <a
              href="#category-state-list"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-300/70 transition hover:bg-emerald-700 hover:shadow-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              View all programs below
            </a>
            <a
              href={`/grants/category/${context.category.slug}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:bg-slate-900 hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Browse all {categoryLabel.toLowerCase()} grants
            </a>
          </div>

          {/* Meta / trust line */}
          <p className="category-state-hero-fade-up text-xs font-medium uppercase tracking-wide text-slate-600 sm:text-sm [animation-delay:0.24s]">
            {displayTotal > 0
              ? `${displayTotal.toLocaleString()} active program${displayTotal === 1 ? "" : "s"} in ${context.state.name}`
              : `No active programs found yet in ${context.state.name} — new grants added weekly.`}
          </p>
        </div>
      </header>

      <section id="category-state-list" className="space-y-6">
        {isFthbCategory ? (
          <div className="space-y-6">
            <CategoryStateFthbFilters
              applicantTypeFacets={fthbFacets.applicantTypes}
              geographyScopeFacets={fthbFacets.geographyScopes}
              initialValue={{
                applicantTypes: selectedApplicantTypes,
                geographyScope: selectedGeographyScope,
              }}
            />

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {fthbGrants.length > 0
                  ? `${fthbGrants.length} grant${fthbGrants.length === 1 ? "" : "s"} available`
                  : "No grants found for this category and state combination yet."}
              </p>
            </div>

            {fthbGrants.length > 0 ? (
              <div className="grid gap-4">
                {fthbGrants.map((grant) => (
                  <GrantCard key={grant.id} grant={grant} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-700">
                <p>
                  We couldn&apos;t find any active grants for this category in {context.state.name} yet. Try exploring statewide
                  grants or a different focus area.
                </p>
              </div>
            )}
          </div>
        ) : (
          <GrantsSearchClient
            initialFilters={{
              query: query ?? "",
              category: context.category.slug,
              state: context.state.code,
              agency: agency ?? "",
              hasApplyLink,
              page,
              pageSize,
            }}
            initialResults={{ grants, total, page, pageSize, totalPages }}
            categories={categoryOptions}
            states={stateOptions}
            agencies={agencyOptions}
            lockedFilters={{
              category: context.category.slug,
              state: context.state.code,
            }}
            staticParams={{
              categorySlug: context.category.slug,
              stateSlug: context.stateSlug,
            }}
            showStateFilter={false}
          />
        )}
      </section>
    </div>
  );
}
