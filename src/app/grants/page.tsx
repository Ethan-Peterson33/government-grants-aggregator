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
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const keyword = typeof searchParams?.keyword === "string" ? searchParams.keyword : undefined;
  const legacyQuery = typeof searchParams?.query === "string" ? searchParams.query : undefined;
  const query = keyword ?? legacyQuery;
  const category = typeof searchParams?.category === "string" ? searchParams.category : undefined;
  const state = typeof searchParams?.state === "string" ? searchParams.state : undefined;
  const agency = typeof searchParams?.agency === "string" ? searchParams.agency : undefined;

  const segments: string[] = ["Government Grants"];
  if (category) segments.unshift(`${category} grants`);
  if (state) segments.unshift(`${state} opportunities`);
  if (agency) segments.unshift(`${agency} programs`);
  if (query) segments.unshift(`Results for "${query}"`);

  return {
    title: segments.join(" | "),
    description:
      "Explore the latest government funding opportunities with powerful filters for category, agency, state, and keyword.",
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
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1 space-y-6">
          <section className="space-y-4">
            <header className="space-y-2">
              <h1 className="text-3xl font-semibold text-slate-900">Government grants</h1>
              <p className="text-slate-600">
                Discover grants across agencies, categories, and regions. Filter results to find funding that matches your
                mission.
              </p>
            </header>
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
          </section>
        </div>

        <div className="w-full space-y-4 lg:w-72">
          <RelatedLinks links={relatedLinks.length ? relatedLinks : fallbackLinks} />
            <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Helpful Links</h2>

              <ul className="space-y-2">
                <li>
                  <Link
                    href="/resources"
                    className="text-blue-700 font-medium hover:text-blue-900 transition"
                  >
                    🧰 Explore Tools & Resources
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
                    📬 Contact Our Team
                  </Link>
                  <p className="text-slate-500 text-xs mt-1">
                    Reach out for partnership or support inquiries.
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
                    Review eligibility requirements and official deadlines.
                  </p>
                </li>
              </ul>
            </section>

        </div>
      </div>

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
