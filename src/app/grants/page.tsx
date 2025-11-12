import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import type { FilterOption } from "@/components/grants/filters-bar";
import { GrantsSearchClient } from "@/components/grants/grants-search-client";
import { RelatedLinks } from "@/components/grants/related-links";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { getFacetSets, safeNumber, searchGrants } from "@/lib/search";
import { slugify } from "@/lib/strings";

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
  const agency = typeof params?.agency === "string" ? params.agency : undefined;

  const segments: string[] = ["Government Grants"];
  if (category) segments.unshift(`${category} grants`);
  if (state) segments.unshift(`${state} opportunities`);
  if (agency) segments.unshift(`${agency} programs`);
  if (query) segments.unshift(`Results for "${query}"`);

  const canonical = "https://www.grantdirectory.org/grants";

  return {
    title: segments.join(" | "),
    description:
      "Explore the latest government funding opportunities with powerful filters for category, agency, state, and keyword.",
    alternates: {
      canonical,
    },
    openGraph: {
      url: canonical,
      title: segments.join(" | "),
      description:
        "Explore the latest government funding opportunities with powerful filters for category, agency, state, and keyword.",
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
  const state = typeof params?.state === "string" ? params.state : undefined;
  const agency = typeof params?.agency === "string" ? params.agency : undefined;
  const hasApplyLink = params?.has_apply_link === "1";

  const filters = {
    page,
    pageSize,
    query,
    category,
    state,
    agency,
    hasApplyLink,
  };

  const [searchResult, facets] = await Promise.all([searchGrants(filters), getFacetSets()]);
  const { grants, total, totalPages } = searchResult;

  const categoryOptions: FilterOption[] = facets.categories.map((value) => ({ label: value, value }));
  const stateOptions: FilterOption[] = facets.states.map((value) => ({ label: value, value }));
  const agencyOptions: FilterOption[] = facets.agencies.map((value) => ({ label: value, value }));

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);

  const relatedLinks = [
    categoryOptions[0] && categoryOptions[0].value !== category
      ? (() => {
          const slug = slugify(categoryOptions[0].value);
          return slug
            ? {
                label: `${categoryOptions[0].label} grants`,
                href: `/grants/category/${slug}`,
              }
            : {
                label: `${categoryOptions[0].label} grants`,
                href: `/grants?category=${encodeURIComponent(categoryOptions[0].value)}`,
              };
        })()
      : null,
    stateOptions[0] && stateOptions[0].value !== state
      ? {
          label: `Funding in ${stateOptions[0].label}`,
          href: `/grants?state=${encodeURIComponent(stateOptions[0].value)}`,
        }
      : null,
    agencyOptions[0] && agencyOptions[0].value !== agency
      ? (() => {
          const slug = slugify(agencyOptions[0].value);
          return slug
            ? {
                label: `Programs from ${agencyOptions[0].label}`,
                href: `/agencies/${slug}`,
              }
            : {
                label: `Programs from ${agencyOptions[0].label}`,
                href: `/grants?agency=${encodeURIComponent(agencyOptions[0].value)}`,
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
            Find public funding faster
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              Search government grants in one place
            </h1>
            <p className="text-slate-600 text-sm sm:text-base">
              Browse federal opportunities and growing coverage of state and local programs.
              Filter by keyword, agency, or eligibility to find grants that match your nonprofit,
              small business, or community project.
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
            {stateOptions[0] && (
              <Link
                href={`/grants?state=${encodeURIComponent(stateOptions[0].value)}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800 hover:bg-slate-100"
              >
                Funding in {stateOptions[0].label}
              </Link>
            )}
            {categoryOptions[0] && (
              <Link
                href={`/grants?category=${encodeURIComponent(categoryOptions[0].value)}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800 hover:bg-slate-100"
              >
                {categoryOptions[0].label} programs
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
                {stateOptions.slice(0, 2).map((opt) => (
                  <li key={opt.value}>
                    <Link
                      href={`/grants?state=${encodeURIComponent(opt.value)}`}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      Funding in {opt.label}
                    </Link>
                  </li>
                ))}
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
                {categoryOptions.slice(0, 2).map((opt) => (
                  <li key={opt.value}>
                    <Link
                      href={`/grants?category=${encodeURIComponent(opt.value)}`}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      {opt.label} grants
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/resources" className="text-blue-700 hover:text-blue-900">
                    Tools for grant writing & planning
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
                href="/resources"
                className="text-blue-700 font-medium hover:text-blue-900 transition"
              >
                🧰 Explore tools & resources
              </Link>
              <p className="text-slate-500 text-xs mt-1">
                Grant writing templates, formation kits, and proposal tools.
              </p>
            </li>

            <li>
              <Link
                href="/contact"
                className="text-blue-700 font-medium hover:text-blue-900 transition"
              >
                📬 Contact our team
              </Link>
              <p className="text-slate-500 text-xs mt-1">
                Reach out for partnership, corrections, or support inquiries.
              </p>
            </li>

            <li>
              <Link
                href="https://www.grants.gov/"
                target="_blank"
                className="text-blue-700 font-medium hover:text-blue-900 transition"
              >
                🏛 Visit Grants.gov
              </Link>
              <p className="text-slate-500 text-xs mt-1">
                Confirm official eligibility, deadlines, and application instructions.
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
