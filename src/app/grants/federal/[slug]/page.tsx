import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { GrantDetail } from "@/components/grants/grant-detail";
import { RelatedLinks } from "@/components/grants/related-links";
import { loadGrant } from "@/app/grants/_components/load-grant";
import { AffiliateOfferCard } from "@/components/affiliate-offer-card";
import {
  extractSearchParam,
  resolveRouteParams,
  resolveSearchParams,
  type MaybePromise,
  type SearchParamsLike,
} from "@/app/grants/_components/route-params";
import { generateBreadcrumbJsonLd, generateGrantJsonLd } from "@/lib/seo";
import { searchGrants } from "@/lib/search";
import { grantPath } from "@/lib/slug";
import type { Grant } from "@/lib/types";
import { wordsFromSlug } from "@/lib/strings";
import { inferGrantLocation } from "@/lib/grant-location";

type FederalParams = { slug: string };

type FederalSearchParams = SearchParamsLike;

function formatCategory(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return wordsFromSlug(value.toLowerCase().replace(/\s+/g, "-"));
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: MaybePromise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams; // <-- REQUIRED FIX

  const rawCategory =
    typeof sp?.category === "string" ? sp.category : undefined;

  const category = formatCategory(rawCategory);

  const baseTitle = category ? `${category} Federal Grants` : "Federal Government Grants";
  const baseDescription = category
    ? `Browse federal ${category.toLowerCase()} funding opportunities available nationwide.`
    : "Explore national funding opportunities from federal agencies across the United States.";

  const baseUrl = "https://www.grantdirectory.org";
  const canonical =
    rawCategory && rawCategory.trim().length > 0
      ? `${baseUrl}/grants/federal?category=${encodeURIComponent(rawCategory)}`
      : `${baseUrl}/grants/federal`;

  return {
    title: baseTitle,
    description: baseDescription,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title: baseTitle,
      description: baseDescription,
      type: "website",
    },
  };
}


export default async function FederalGrantDetailPage({
  params,
  searchParams,
}: {
  params: MaybePromise<FederalParams>;
  searchParams?: MaybePromise<FederalSearchParams>;
}) {
  const resolvedParams = await resolveRouteParams(params, "federal.page.params");
  const sp = await searchParams; // <-- REQUIRED FIX
  const slug = typeof resolvedParams?.slug === "string" ? resolvedParams.slug : undefined;

  const grant = await loadGrant(slug, sp); // <-- Pass resolved searchParams

  if (!grant) notFound();

  const canonical = grantPath(grant);

  const resolvedSearchParams = await resolveSearchParams(
    sp,
    "federal.page.searchParams"
  );

  const currentId = extractSearchParam(resolvedSearchParams, "id");
  const currentSlug = slug ?? null;

  if (currentSlug) {
    const currentPath = `/grants/federal/${currentSlug}${
      currentId ? `?id=${encodeURIComponent(currentId)}` : ""
    }`;

    if (currentPath !== canonical) redirect(canonical);
  }

  const location = inferGrantLocation(grant);
  if (location.jurisdiction !== "federal") redirect(canonical);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: "Federal", href: "/grants/federal" },
    { label: grant.title, href: canonical },
  ];

  const categoryRelated = grant.category
    ? await searchGrants({
        category: grant.category,
        jurisdiction: "federal",
        page: 1,
        pageSize: 6,
      })
    : { grants: [] as Grant[], total: 0, page: 1, pageSize: 6, totalPages: 0 };

  const relatedGrants = (categoryRelated.grants ?? [])
    .filter((g) => g.id !== grant.id)
    .slice(0, 6);

  const relatedLinks = [
    { label: "All federal grants", href: "/grants/federal" },
    grant.category
      ? {
          label: `More ${grant.category} grants`,
          href: `/grants/federal?category=${encodeURIComponent(grant.category)}`,
        }
      : null,
  ].filter(Boolean) as { label: string; href: string }[];

  const grantJsonLd = generateGrantJsonLd(grant, { path: canonical });

  return (
    <div className="container-grid space-y-10 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <GrantDetail grant={grant} />

      <AffiliateOfferCard
        category={grant.category ?? undefined}
        agency={grant.agency ?? undefined}
      />

      {relatedGrants.length > 0 && (
        <section className="space-y-4">
          <header>
            <h2 className="text-2xl font-semibold text-slate-900">
              More federal grants like this
            </h2>
            <p className="text-sm text-slate-600">
              Explore additional programs from federal agencies that align with
              this opportunity.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedGrants.map((related) => (
              <GrantCard key={related.id} grant={related} />
            ))}
          </div>
        </section>
      )}

      <RelatedLinks links={relatedLinks} />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateBreadcrumbJsonLd(
              breadcrumbItems.map((x) => ({ name: x.label, url: x.href }))
            ),
            grantJsonLd,
          ]),
        }}
      />
    </div>
  );
}