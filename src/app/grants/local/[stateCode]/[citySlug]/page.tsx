import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { RelatedLinks } from "@/components/grants/related-links";
import { cityNameFromSlug, resolveStateParam } from "@/lib/grant-location";
import { wordsFromSlug } from "@/lib/strings";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchGrants } from "@/lib/search";
import type { Grant } from "@/lib/types";

const PAGE_SIZE = 12;

function formatCategory(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return wordsFromSlug(value.toLowerCase().replace(/\s+/g, "-"));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { stateCode: string; citySlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const stateInfo = resolveStateParam(params.stateCode);
  const cityName = cityNameFromSlug(params.citySlug);
  const rawCategory = typeof searchParams?.category === "string" ? searchParams.category : undefined;
  const category = formatCategory(rawCategory);

  const title = category
    ? `${category} Grants in ${cityName}, ${stateInfo.code}`
    : `${cityName}, ${stateInfo.code} Grants`;
  const description = category
    ? `Find ${category.toLowerCase()} grants supporting organizations in ${cityName}, ${stateInfo.name}.`
    : `Discover local funding initiatives helping ${cityName}, ${stateInfo.name} communities grow.`;

  return { title, description };
}

export default async function LocalGrantsPage({
  params,
  searchParams,
}: {
  params: { stateCode: string; citySlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const stateInfo = resolveStateParam(params.stateCode);
  const citySlug = params.citySlug;
  const cityName = cityNameFromSlug(citySlug);
  const page = safeNumber(searchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(searchParams?.pageSize, PAGE_SIZE));
  const rawCategory = typeof searchParams?.category === "string" ? searchParams.category : undefined;
  const category = formatCategory(rawCategory);

  const { grants, total } = await searchGrants({
    stateCode: stateInfo.code,
    state: stateInfo.name,
    city: cityName,
    category,
    jurisdiction: "local",
    page,
    pageSize,
  });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: stateInfo.name, href: `/grants/state/${stateInfo.code}` },
    { label: cityName, href: `/grants/local/${stateInfo.code}/${citySlug}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);
  const hasResults = grants.length > 0;

  const buildPageHref = (targetPage: number) => {
    const queryParams = new URLSearchParams();
    if (targetPage > 1) queryParams.set("page", String(targetPage));
    if (pageSize !== PAGE_SIZE) queryParams.set("pageSize", String(pageSize));
    if (rawCategory) queryParams.set("category", rawCategory);
    const query = queryParams.toString();
    return query
      ? `/grants/local/${stateInfo.code}/${citySlug}?${query}`
      : `/grants/local/${stateInfo.code}/${citySlug}`;
  };

  const relatedLinks = [
    { label: `${stateInfo.name} statewide programs`, href: `/grants/state/${stateInfo.code}` },
    { label: "Federal grants", href: "/grants/federal" },
    category
      ? {
          label: `More ${category.toLowerCase()} funding`,
          href: `/grants/local/${stateInfo.code}/${citySlug}?category=${encodeURIComponent(category)}`,
        }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {category ? `${category} grants in ${cityName}` : `${cityName}, ${stateInfo.code} grants`}
        </h1>
        <p className="text-slate-600">
          Explore local programs funding organizations in {cityName}. Filter by category to find opportunities tailored to your
          community.
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-4">
          {hasResults ? (
            grants.map((grant: Grant) => <GrantCard key={grant.id} grant={grant} />)
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-600">
              <p>No local grants are published for this city yet. Try a different category or review statewide options.</p>
            </div>
          )}
        </div>
{hasResults && (
  <Pagination
    total={total}
    pageSize={pageSize}
    currentPage={page}
    basePath={`/grants/local/${stateInfo.code}/${citySlug}`}
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
            generateBreadcrumbJsonLd(breadcrumbItems.map((item) => ({ name: item.label, url: item.href }))),
            itemListJsonLd,
          ]),
        }}
      />
    </div>
  );
}
