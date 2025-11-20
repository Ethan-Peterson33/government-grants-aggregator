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
