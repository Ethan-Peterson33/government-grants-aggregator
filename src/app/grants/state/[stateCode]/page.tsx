import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { RelatedLinks } from "@/components/grants/related-links";
import {
  resolveRouteParams,
  resolveSearchParams,
  extractSearchParam,
  type SearchParamsLike,
} from "@/app/grants/_components/route-params";
import { resolveStateParam } from "@/lib/grant-location";
import { wordsFromSlug } from "@/lib/strings";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchGrants } from "@/lib/search";
import type { Grant } from "@/lib/types";

const PAGE_SIZE = 12;

function formatCategory(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return wordsFromSlug(value.toLowerCase().replace(/\s+/g, "-"));
}

/** -------------------------------------------
 *  FIXED generateMetadata — unwrap params/searchParams
 * ------------------------------------------ */
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
    ? `Explore ${category.toLowerCase()} funding available to organizations across ${stateInfo.name}.`
    : `Discover statewide grant programs supporting communities throughout ${stateInfo.name}.`;

  return { title, description };
}

/** -------------------------------------------
 *  FIXED default export — unwrap params/searchParams
 * ------------------------------------------ */
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

  const page = safeNumber(extractSearchParam(resolvedSearch, "page") ?? undefined, 1);
  const pageSize = Math.min(
    50,
    safeNumber(extractSearchParam(resolvedSearch, "pageSize") ?? undefined, PAGE_SIZE)
  );

  const rawCategory = extractSearchParam(resolvedSearch, "category");

  const category = formatCategory(rawCategory);

  /** -------------------------------------------
   *  FIX: Always pass stateCode (postal code) to searchGrants
   * ------------------------------------------ */
  const { grants, total } = await searchGrants({
    stateCode: stateInfo.code, // ⬅️ VA, TX, CA…
    state: stateInfo.name,     // ⬅️ "Virginia" (fallback local match)
    category,
    jurisdiction: "state",
    page,
    pageSize,
  });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: stateInfo.name, href: `/grants/state/${stateInfo.code}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);
  const hasResults = grants.length > 0;

  const relatedLinks = [
    { label: "Federal programs", href: "/grants/federal" },
    {
      label: `Search all ${stateInfo.code} funding`,
      href: `/grants?state=${encodeURIComponent(stateInfo.code)}`
    },
    category
      ? {
          label: `More ${category.toLowerCase()} grants`,
          href: `/grants/state/${stateInfo.code}?category=${encodeURIComponent(category)}`,
        }
      : null,
  ].filter(Boolean) as { label: string; href: string }[];

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
          Review active funding initiatives supporting communities across {stateInfo.name}.
          Filter by category to focus on programs that align with your mission.
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-4">
          {hasResults ? (
            grants.map((grant: Grant) => <GrantCard key={grant.id} grant={grant} />)
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-600">
              <p>No statewide grants match these filters right now. Try another category or check back soon.</p>
            </div>
          )}
        </div>

        {hasResults && (
          <Pagination
            total={total}
            pageSize={pageSize}
            currentPage={page}
            basePath={`/grants/state/${stateInfo.code}`}
            rawCategory={rawCategory}
          />
        )}
      </section>

      <RelatedLinks links={relatedLinks} />

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
