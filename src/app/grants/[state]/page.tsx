import type { Metadata } from "next";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { RelatedLinks } from "@/components/grants/related-links";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchGrants } from "@/lib/search";
import type { Grant } from "@/lib/types";
import { sentenceCase } from "@/lib/utils";

const PAGE_SIZE = 12;

export async function generateMetadata({ params }: { params: { state: string } }): Promise<Metadata> {
  const stateName = sentenceCase(params.state);
  return {
    title: `${stateName} Government Grants`,
    description: `Explore funding opportunities available in ${stateName}, including statewide and local grant programs.`,
  };
}

export default async function StateGrantsPage({
  params,
  searchParams,
}: {
  params: { state: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const stateSlug = params.state;
  const page = safeNumber(searchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(searchParams?.pageSize, PAGE_SIZE));
  const stateName = sentenceCase(stateSlug);
  const stateFilter = stateSlug.length <= 2 ? stateSlug.toUpperCase() : stateName;

  const { grants, total } = await searchGrants({ state: stateFilter, page, pageSize });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: stateName, href: `/grants/${stateSlug}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);
  const hasResults = grants.length > 0;

  const relatedLinks = [
    { label: `${stateName} statewide programs`, href: `/grants/${stateSlug}/statewide` },
    { label: `${stateName} education funding`, href: `/grants/${stateSlug}/statewide/education` },
  ];

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{stateName} grants</h1>
        <p className="text-slate-600">
          Discover federal and state programs supporting communities across {stateName}. Filter by category or drill down into
          local opportunities to find the right fit.
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-4">
          {hasResults ? (
            grants.map((grant: Grant) => <GrantCard key={grant.id} grant={grant} />)
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-600">
              <p>No grants published for this state yet. Check back soon or explore national programs.</p>
            </div>
          )}
        </div>
        {hasResults && <Pagination total={total} pageSize={pageSize} currentPage={page} />}
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
