import type { Metadata } from "next";
import Link from "next/link";
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
  <div className="container-grid space-y-8 py-10">
    <Breadcrumb items={breadcrumbItems} />

    {/* Hero / intro */}
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Federal funding directory
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          {category ? `${category} federal grants` : "Federal grants"}
        </h1>
        <p className="mt-2 text-slate-600">
          Explore active federal funding programs across the United States. Filter by topic,
          agency, or state on the main grants page, then drill into individual opportunities
          for deadlines and application details.
        </p>

        {/* Internal linking row */}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/grants"
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 hover:border-slate-300 hover:bg-slate-100"
          >
            ← Back to all government grants
          </Link>
          <Link
            href="/grants?state=Federal%20(nationwide)"
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 hover:border-slate-300 hover:bg-slate-100"
          >
            View federal grants with keyword filters
          </Link>
          <Link
            href="/agencies"
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 hover:border-slate-300 hover:bg-slate-100"
          >
            Browse grants by federal agency
          </Link>
        </div>
      </header>

      {/* Main list */}
      <section className="space-y-4">
        <header className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Active federal opportunities
          </h2>
          {hasResults && (
            <p className="text-xs text-slate-500">
              Showing {grants.length} of {total.toLocaleString()} results
            </p>
          )}
        </header>

        <div className="space-y-4">
          {hasResults ? (
            grants.map((grant: Grant) => (
              <div key={grant.id} className="space-y-3">
                <GrantCard grant={grant} />
              {/* <AffiliateOfferCard
                  category={grant.category ?? undefined}
                  agency={grant.agency ?? undefined}
                />*/}
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-600">
              <p>
                No federal grants found for this filter. Try another category or adjust your
                search keywords.
              </p>
              <p className="mt-2">
                You can also return to{" "}
                <Link href="/grants" className="text-blue-700 hover:text-blue-900">
                  the full grants directory
                </Link>
                .
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

      {/* Extra internal linking / exploration block */}
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm md:grid-cols-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Browse by topic
          </h3>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/grants/federal?category=Education"
                className="text-blue-700 hover:text-blue-900"
              >
                Education & training grants
              </Link>
            </li>
            <li>
              <Link
                href="/grants/federal?category=Health"
                className="text-blue-700 hover:text-blue-900"
              >
                Health & research programs
              </Link>
            </li>
            <li>
              <Link
                href="/grants/federal?category=Business"
                className="text-blue-700 hover:text-blue-900"
              >
                Small business & innovation
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Browse by agency
          </h3>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/agencies/department-of-health-and-human-services"
                className="text-blue-700 hover:text-blue-900"
              >
                HHS (Health & Human Services)
              </Link>
            </li>
            <li>
              <Link
                href="/agencies/national-science-foundation"
                className="text-blue-700 hover:text-blue-900"
              >
                National Science Foundation (NSF)
              </Link>
            </li>
            <li>
              <Link
                href="/agencies/department-of-education"
                className="text-blue-700 hover:text-blue-900"
              >
                U.S. Department of Education
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Next steps
          </h3>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/resources" className="text-blue-700 hover:text-blue-900">
                Grant writing & nonprofit resources
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-blue-700 hover:text-blue-900">
                Partner with Grant Directory
              </Link>
            </li>
            <li>
              <Link
                href="https://www.grants.gov/"
                target="_blank"
                className="text-blue-700 hover:text-blue-900"
              >
                Confirm details on Grants.gov
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* Existing related links component for extra internal linking */}
      <RelatedLinks links={relatedLinks} />
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
