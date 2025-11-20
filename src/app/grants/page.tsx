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

      <section className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] items-start">
        {/* MAIN COLUMN */}
        <div className="space-y-8">
          {/* HERO / INTRO */}
          <header className="space-y-4 rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Find funding faster
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                Search grants from public and private funders in one place
              </h1>
              <p className="text-slate-600 text-sm sm:text-base">
                Browse funding opportunities from federal agencies, states, local governments,
                private foundations, and corporate programs. Filter by keyword, agency, or
                eligibility to find grants that match your nonprofit, small business, or community
                project.
              </p>
            </div>

            {/* QUICK INTERNAL LINKS / CHIPS */}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Link
                href="/grants/federal"
                className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-medium text-blue-800 hover:bg-blue-100"
              >
                Federal grants overview
              </Link>
              {randomState && (
              <Link
                href={`/grants/state/${slugify(randomState.value) ?? randomState.value}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800 hover:bg-slate-100"
              >
                Funding in {randomState.label}
                </Link>
              )}
              {randomCategory && (
                <Link
                  href={`/grants/category/${randomCategory.slug}`}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800 hover:bg-slate-100"
                >
                  {randomCategory.label} programs
                </Link>
              )}
              {/* <Link
                href="/grants?has_apply_link=1"
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800 hover:bg-slate-100"
              >
                Grants with apply links
              </Link>*/}
            </div>
          </header>

        {/* SEARCH + RESULTS */}
        <section className="space-y-6">
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
                <li className="text-slate-500 text-xs">
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
                    href="/grants/category/nonprofit"
                    className="text-blue-700 hover:text-blue-900"
                  >
                    Nonprofit grants
                  </Link>
                </li>
                <li>
                  <Link
                    href="/grants/category/community"
                    className="text-blue-700 hover:text-blue-900"
                  >
                    Local community funding
                  </Link>
                </li>
                <li>
                  {/* Ensure first-time homebuyer category is discoverable alongside other program types */}
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Helpful links
          </h2>

          <ul className="space-y-2">
            <li>
              <Link
                href="/grants/category/small-business"
                className="text-blue-700 font-medium hover:text-blue-900 transition"
              >
                Small business grant resources
              </Link>
              <p className="text-slate-500 text-xs mt-1">
                Search funding and guides tailored to startups and established businesses.
              </p>
            </li>

            <li>
              <Link
                href="/grants/category/nonprofit"
                className="text-blue-700 font-medium hover:text-blue-900 transition"
              >
                Nonprofit funding resources
              </Link>
              <p className="text-slate-500 text-xs mt-1">
                Explore private and government programs that support charitable missions.
              </p>
            </li>

            <li>
              <Link
                href="/grants/category/first-time-homeowner"
                className="text-blue-700 font-medium hover:text-blue-900 transition"
              >
                First-time homebuyer grants
              </Link>
              <p className="text-slate-500 text-xs mt-1">
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
          generateBreadcrumbJsonLd(breadcrumbItems.map((item) => ({ name: item.label, url: item.href }))),
          itemListJsonLd,
        ]),
      }}
    />
  </div>
);

}
