import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { FiltersBar, type FilterOption } from "@/components/grants/filters-bar";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { RelatedLinks } from "@/components/grants/related-links";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { getFacetSets, safeNumber, searchGrants } from "@/lib/search";
import type { Grant } from "@/lib/types";

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
  const query = typeof searchParams?.query === "string" ? searchParams.query : undefined;
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
  const query = typeof params?.query === "string" ? params.query : undefined;
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

  const [{ grants, total }, facets] = await Promise.all([searchGrants(filters), getFacetSets()]);

  const categoryOptions: FilterOption[] = facets.categories.map((value) => ({ label: value, value }));
  const stateOptions: FilterOption[] = facets.states.map((value) => ({ label: value, value }));
  const agencyOptions: FilterOption[] = facets.agencies.map((value) => ({ label: value, value }));

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);
  const hasResults = grants.length > 0;

  const relatedLinks = [
    categoryOptions[0] && categoryOptions[0].value !== category
      ? {
          label: `${categoryOptions[0].label} grants`,
          href: `/grants?category=${encodeURIComponent(categoryOptions[0].value)}`,
        }
      : null,
    stateOptions[0] && stateOptions[0].value !== state
      ? {
          label: `Funding in ${stateOptions[0].label}`,
          href: `/grants?state=${encodeURIComponent(stateOptions[0].value)}`,
        }
      : null,
    agencyOptions[0] && agencyOptions[0].value !== agency
      ? {
          label: `Programs from ${agencyOptions[0].label}`,
          href: `/grants?agency=${encodeURIComponent(agencyOptions[0].value)}`,
        }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  const fallbackLinks = [
    { label: "Federal grants", href: "/grants?category=Federal" },
    { label: "Education funding", href: "/grants?category=Education" },
    { label: "Small business grants", href: "/grants?category=Business" },
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
            <FiltersBar
              filters={{ query, category, state, agency, hasApplyLink }}
              categories={categoryOptions}
              states={stateOptions}
              agencies={agencyOptions}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Latest opportunities ({total})</h2>
            <div className="space-y-4">
              {hasResults ? (
                grants.map((grant: Grant) => <GrantCard key={grant.id} grant={grant} />)
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-600">
                  <p>No grants match your filters yet. Try broadening your search or exploring another category.</p>
                </div>
              )}
            </div>
          </section>

          {hasResults && <Pagination total={total} pageSize={pageSize} currentPage={page} />}
        </div>

        <div className="w-full space-y-4 lg:w-72">
          <RelatedLinks links={relatedLinks.length ? relatedLinks : fallbackLinks} />
          <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Need help?</h2>
            <p className="mt-2">
              Review eligibility requirements carefully and confirm deadlines on the official agency website before applying.
            </p>
            <Link href="https://www.grants.gov/" className="mt-3 inline-block text-blue-700 hover:text-blue-900">
              Visit Grants.gov
            </Link>
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
