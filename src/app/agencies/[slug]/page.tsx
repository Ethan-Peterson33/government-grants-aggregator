import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantsSearchClient } from "@/components/grants/grants-search-client";
import type { FilterOption } from "@/components/grants/filters-bar";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { findAgencyBySlug } from "@/lib/agency";
import { getFacetSets, safeNumber, searchGrants } from "@/lib/search";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const DEFAULT_PAGE_SIZE = 12;

async function resolveAgency(slug: string, scope: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error({ scope, message: "Supabase client unavailable while resolving agency", slug });
    return null;
  }
  return findAgencyBySlug(supabase, slug, { logScope: scope });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const agency = await resolveAgency(params.slug, "agency.metadata");
  if (!agency) {
    return { title: "Agency Not Found" };
  }
  return {
    title: `${agency.agency_name} Grants`,
    description: agency.description ?? `Explore grants from ${agency.agency_name}.`,
  };
}

export default async function AgencyPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = safeNumber(searchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(searchParams?.pageSize, DEFAULT_PAGE_SIZE));

  const agency = await resolveAgency(params.slug, "agency.page");
  if (!agency) {
    notFound();
  }

  const [initialResults, facets] = await Promise.all([
    searchGrants({
      page,
      pageSize,
      agency: agency.agency_name,
      agencySlug: agency.slug,
      agencyCode: agency.agency_code ?? undefined,
    }),
    getFacetSets(),
  ]);

  const categoryOptions: FilterOption[] = facets.categories.map((value) => ({ label: value, value }));
  const stateOptions: FilterOption[] = facets.states.map((value) => ({ label: value, value }));
  const agencyOptions: FilterOption[] = facets.agencies.map((value) => ({ label: value, value }));

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: agency.agency_name, href: `/agencies/${agency.slug}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(initialResults.grants);

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-slate-900">{agency.agency_name}</h1>
          {agency.agency_code && (
            <p className="text-sm text-slate-600">
              Agency code: <span className="font-mono text-slate-700">{agency.agency_code}</span>
            </p>
          )}
          {agency.description && <p className="text-slate-700">{agency.description}</p>}
          {agency.website && (
            <p className="text-sm">
              Website:{" "}
              <a
                className="text-blue-600 underline"
                href={agency.website}
                target="_blank"
                rel="noreferrer"
              >
                {agency.website}
              </a>
            </p>
          )}
        </div>
        <p className="text-sm text-slate-600">
          <Link href="/grants" className="text-blue-600 underline">
            Browse all grants
          </Link>{" "}
          to compare opportunities across agencies.
        </p>
      </header>

      <section className="space-y-6">
        <GrantsSearchClient
          initialFilters={{
            query: "",
            category: "",
            state: "",
            agency: agency.agency_name,
            hasApplyLink: false,
            page,
            pageSize,
          }}
          initialResults={initialResults}
          categories={categoryOptions}
          states={stateOptions}
          agencies={agencyOptions}
          lockedAgency={{
            label: agency.agency_name,
            slug: agency.slug,
            code: agency.agency_code ?? undefined,
          }}
        />
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
