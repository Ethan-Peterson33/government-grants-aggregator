import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import type { FilterOption } from "@/components/grants/filters-bar";
import { GrantsSearchClient } from "@/components/grants/grants-search-client";
import { RelatedLinks } from "@/components/grants/related-links";
import { normalizeStateCode, resolveStateQueryValue } from "@/lib/grant-location";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { getFacetSets, safeNumber, searchGrants } from "@/lib/search";
import { slugify } from "@/lib/strings";
import { pickRandom } from "@/lib/utils";

const PAGE_SIZE = 12;

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const dynamicParams = true;
export const runtime = "nodejs";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  // ✅ Unwrap the async searchParams
  const params = await searchParams;

  const keyword = typeof params?.keyword === "string" ? params.keyword : undefined;
  const legacyQuery = typeof params?.query === "string" ? params.query : undefined;
  const query = keyword ?? legacyQuery;
  const category = typeof params?.category === "string" ? params.category : undefined;
  const state = typeof params?.state === "string" ? params.state : undefined;
  const stateDisplay = resolveStateQueryValue(state).label || state;
  const agency = typeof params?.agency === "string" ? params.agency : undefined;

  const segments: string[] = ["Government Grants"];
  if (category) segments.unshift(`${category} grants`);
  if (stateDisplay) segments.unshift(`${stateDisplay} opportunities`);
  if (agency) segments.unshift(`${agency} programs`);
  if (query) segments.unshift(`Results for "${query}"`);

  const canonical = "https://www.grantdirectory.org/grants";

  return {
    title: segments.join(" | "),
    description:
      "Explore the latest funding opportunities from government agencies and private funders with powerful filters for category, agency, state, and keyword.",
    alternates: {
      canonical,
    },
    openGraph: {
      url: canonical,
      title: segments.join(" | "),
      description:
        "Explore the latest funding opportunities from government agencies and private funders with powerful filters for category, agency, state, and keyword.",
    },
  };
}



export default async function GrantsIndexPage({
  searchParams: rawSearchParams,
}: {
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | Promise<URLSearchParams | Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = rawSearchParams instanceof Promise ? await rawSearchParams : rawSearchParams;
  const params =
    resolvedParams instanceof URLSearchParams
      ? Object.fromEntries(resolvedParams.entries())
      : (resolvedParams as Record<string, string | string[] | undefined>);

  const page = safeNumber(params?.page, 1);
  const pageSize = Math.min(50, safeNumber(params?.pageSize, PAGE_SIZE));
  const queryParam = typeof params?.query === "string" ? params.query : undefined;
  const keywordParam = typeof params?.keyword === "string" ? params.keyword : undefined;
  const query = keywordParam ?? queryParam;
  const category = typeof params?.category === "string" ? params.category : undefined;
  const stateParam = typeof params?.state === "string" ? params.state : undefined;
  const resolvedState = resolveStateQueryValue(stateParam);
  const state = resolvedState.value || stateParam;
  const agency = typeof params?.agency === "string" ? params.agency : undefined;
  const hasApplyLink = params?.has_apply_link === "1";
  const stateCode = normalizeStateCode(resolvedState.code ?? state ?? undefined) ?? undefined;

  const filters = {
    page,
    pageSize,
    query,
    category,
    state,
    stateCode,
    agency,
    hasApplyLink,
  };

  const [searchResult, facets] = await Promise.all([searchGrants(filters), getFacetSets()]);
  const { grants, total, totalPages } = searchResult;

  const categoriesWithCounts = facets.categories;
  const categoryOptions: FilterOption[] = categoriesWithCounts.map((item) => ({
    label: `${item.label} (${item.grantCount})`,
    value: item.slug,
  }));
  const stateOptions: FilterOption[] = facets.states.map((facet) => ({
    label: `${facet.label} (${facet.grantCount})`,
    value: facet.value,
  }));
  const agencyOptions: FilterOption[] = facets.agencies.map((facet) => ({
    label: `${facet.label} (${facet.grantCount})`,
    value: facet.value,
  }));

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);
  const [randomState] = pickRandom(facets.states, 1);
  const [randomCategory] = pickRandom(categoriesWithCounts, 1);
  const primaryCategory = categoriesWithCounts[0];
  const primaryState = facets.states[0];
  const primaryAgency = facets.agencies[0];
  const relatedLinks = [
    primaryCategory && primaryCategory.slug !== category
      ? {
          label: `${primaryCategory.label} grants`,
          href: `/grants/category/${primaryCategory.slug}`,
        }
      : null,
    primaryState && primaryState.value !== state
      ? {
          label: `Funding in ${primaryState.label}`,
          href: `/grants/state/${slugify(primaryState.value) ?? primaryState.value}`,
        }
      : null,
    primaryAgency && primaryAgency.value !== agency
      ? (() => {
          const slug = slugify(primaryAgency.value);
          return slug
            ? {
                label: `Programs from ${primaryAgency.label}`,
                href: `/agencies/${slug}`,
              }
            : {
                label: `Programs from ${primaryAgency.label}`,
                href: `/grants?agency=${slugify(primaryAgency.value)}`,
              };
        })()
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  const fallbackLinks = [
    { label: "Federal grants", href: "/grants/federal" },
    { label: "California statewide funding", href: "/grants/state/CA" },
    { label: "New York City grants", href: "/grants/local/NY/new-york-city" },
  ];

    return (
    <div className="container-grid space-y-8 py-10">
      <Breadcrumb items={breadcrumbItems} />

      <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        {/* MAIN COLUMN */}
        <div className="space-y-8">
          {/* HERO / INTRO */}
          <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-sky-50 to-blue-50 px-5 py-8 shadow-sm sm:px-8 sm:py-10">
            <style>{`
              @keyframes hero-fade-up {
                0% { opacity: 0; transform: translateY(20px); }
                100% { opacity: 1; transform: translateY(0); }
              }
              .hero-fade-up {
                opacity: 0;
                transform: translateY(20px);
                animation: hero-fade-up 0.85s ease-out forwards;
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
              <p className="hero-fade-up text-xs font-semibold uppercase tracking-wide text-blue-700 [animation-delay:0.02s]">
                Find funding faster
              </p>

              <div className="space-y-4">
                <h1 className="hero-fade-up text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl [animation-delay:0.06s]">
                  Find every first-time home buyer grant &amp; down payment assistance program in
                  the U.S.
                </h1>
                <p className="hero-fade-up text-sm text-slate-700 sm:text-base lg:text-lg [animation-delay:0.12s]">
                  $0 – $100,000+ in free money. Updated daily across all 50 states + DC. Compare
                  programs from HUD-approved agencies, lenders, cities, and state housing
                  authorities in one place.
                </p>
              </div>

              {/* CTAS */}
              <div className="hero-fade-up flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:0.18s]">
                <Link
                  href="#grant-search"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-300/70 transition hover:bg-emerald-700 hover:shadow-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  Search all grants now
                </Link>

                <Link
                  href="/resources/first-time-homebuyer-starter-pack"
                  className="inline-flex items-center justify-center rounded-xl border border-[#FF5A5F] bg-white/80 px-6 py-3 text-sm font-semibold text-[#FF5A5F] shadow-sm backdrop-blur transition hover:bg-[#FF5A5F] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A5F] focus-visible:ring-offset-2"
                >
                  Download the 2025 FTHB Toolkit – Only $17
                </Link>
              </div>

              {/* Trust line */}
              <p className="hero-fade-up text-xs font-medium uppercase tracking-wide text-slate-600 sm:text-sm [animation-delay:0.24s]">
                2,000+ programs listed • Verified by HUD &amp; state
                agencies
              </p>

              {/* Quick internal links / chips */}
              <div className="hero-fade-up mt-2 flex flex-wrap gap-2 text-xs sm:text-sm [animation-delay:0.3s]">
                <Link
                  href="/grants/category/first-time-homeowner"
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  First-time homebuyer grants
                </Link>

                <Link
                  href="/grants/category/small-business"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-800 hover:bg-slate-100"
                >
                  Small business grants
                </Link>

                {randomState && (
                  <Link
                    href={`/grants/state/${slugify(randomState.value) ?? randomState.value}`}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-800 hover:bg-slate-100"
                  >
                    Funding in {randomState.label}
                  </Link>
                )}

                {randomCategory && (
                  <Link
                    href={`/grants/category/${randomCategory.slug}`}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-800 hover:bg-slate-100"
                  >
                    {randomCategory.label} programs
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* SEARCH + RESULTS */}
          <section id="grant-search" className="space-y-6">
            <GrantsSearchClient
              initialFilters={{
                query: query ?? "",
                category: category ?? "",
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
            />

            {/* BROWSE POPULAR SECTIONS (INTERNAL LINK HUB) */}
            <section
              aria-label="Popular ways to browse grants"
              className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3"
            >
              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  By level of government
                </h2>
                <ul className="space-y-1 text-sm">
                  <li>
                    <Link href="/grants/federal" className="text-blue-700 hover:text-blue-900">
                      Federal grants (nationwide)
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  By location
                </h2>
                <ul className="space-y-1 text-sm">
                  {randomState && (
                    <li key={randomState.value}>
                      <Link
                        href={`/grants/state/${slugify(randomState.value) ?? randomState.value}`}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        Funding in {randomState.label}
                      </Link>
                    </li>
                  )}
                  <li className="text-xs text-slate-500">
                    More states will appear here as coverage expands.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  By program type
                </h2>
                <ul className="space-y-1 text-sm">
                  <li>
                    <Link
                      href="/grants/category/small-business"
                      className="text-blue-700 hover:text-blue-900"
                    >
                      Small business grants
                    </Link>
                  </li>
        
      
                  <li>
                    <Link
                      href="/grants/category/first-time-homeowner"
                      className="text-blue-700 hover:text-blue-900"
                    >
                      First-time homebuyer grants
                    </Link>
                  </li>
                </ul>
              </div>
            </section>
          </section>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="w-full space-y-4 lg:w-72">
          <RelatedLinks links={relatedLinks.length ? relatedLinks : fallbackLinks} />

          <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Helpful links
            </h2>

            <ul className="space-y-2">
              <li>
                <Link
                  href="/grants/category/small-business"
                  className="font-medium text-blue-700 transition hover:text-blue-900"
                >
                  Small business grant resources
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  Search funding and guides tailored to startups and established businesses.
                </p>
              </li>

              <li>
                <Link
                  href="/grants/category/nonprofit"
                  className="font-medium text-blue-700 transition hover:text-blue-900"
                >
                  Nonprofit funding resources
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  Explore private and government programs that support charitable missions.
                </p>
              </li>

              <li>
                <Link
                  href="/grants/category/first-time-homeowner"
                  className="font-medium text-blue-700 transition hover:text-blue-900"
                >
                  First-time homebuyer grants
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  Browse programs supporting new homeowners, including down payment assistance.
                </p>
              </li>
            </ul>
          </section>
        </div>
      </section>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateBreadcrumbJsonLd(
              breadcrumbItems.map((item) => ({ name: item.label, url: item.href })),
            ),
            itemListJsonLd,
          ]),
        }}
      />
    </div>
  );


}
