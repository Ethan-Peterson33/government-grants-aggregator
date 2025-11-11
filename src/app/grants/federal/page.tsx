import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { RelatedLinks } from "@/components/grants/related-links";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchGrants } from "@/lib/search";
import type { Grant } from "@/lib/types";
import { wordsFromSlug } from "@/lib/strings";
import { AffiliateOfferCard } from "@/components/affiliate-offer-card";

const PAGE_SIZE = 12;

function formatCategory(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return wordsFromSlug(value.toLowerCase().replace(/\s+/g, "-"));
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const rawCategory = typeof searchParams?.category === "string" ? searchParams.category : undefined;
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
    alternates: {
      canonical,
    },
    openGraph: {
      url: canonical,
      title: baseTitle,
      description: baseDescription,
      type: "website",
    },
  };
}


export default async function FederalGrantsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = safeNumber(searchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(searchParams?.pageSize, PAGE_SIZE));
  const rawCategory = typeof searchParams?.category === "string" ? searchParams.category : undefined;
  const category = formatCategory(rawCategory);

  const { grants, total } = await searchGrants({
    page,
    pageSize,
    category: category,
    jurisdiction: "federal",
  });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: "Federal", href: "/grants/federal" },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);
  const hasResults = grants.length > 0;

  const relatedLinks = [
    !rawCategory
      ? { label: "Education programs", href: "/grants/federal?category=Education" }
      : null,
    rawCategory?.toLowerCase() !== "business"
      ? { label: "Small business opportunities", href: "/grants/federal?category=Business" }
      : null,
    { label: "Find state grants", href: "/grants/state/CA" },
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {category ? `${category} federal grants` : "Federal grants"}
        </h1>
        <p className="text-slate-600">
          Discover active federal funding programs with national reach. Filter by category to narrow results or explore state
          and local opportunities for regional support.
        </p>
      </header>
<section className="space-y-4">
  <div className="space-y-4">
    {hasResults ? (
      grants.map((grant: Grant) => (
        <div key={grant.id}>
          <GrantCard grant={grant} />
          {/* Offer card placed under each grant detail card */}
       <AffiliateOfferCard
                        category={grant.category ?? undefined}
                        agency={grant.agency ?? undefined}
                      />
        </div>
      ))
    ) : (
      <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-600">
        <p>
          No federal grants found for this filter. Try another category or adjust your search keywords.
        </p>
      </div>
    )}
  </div>
  {hasResults && (
    <Pagination
      total={total}
      pageSize={pageSize}
      currentPage={page}
      basePath="/grants/federal"
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
