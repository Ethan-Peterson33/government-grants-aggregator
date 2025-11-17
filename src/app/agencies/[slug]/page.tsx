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

type RouteParams = { slug?: string };
type RouteSearchParams = Record<string, string | string[] | undefined>;

type MaybePromise<T> = T | Promise<T>;

async function resolveMaybePromise<T>(
  value?: MaybePromise<T>,
  scope: string = "agency.page",
): Promise<T | undefined> {
  if (typeof value === "undefined") return undefined;
  try {
    return await value;
  } catch (error) {
    console.error({ scope, message: "Failed to resolve route argument", error });
    return undefined;
  }
}

const DEFAULT_PAGE_SIZE = 12;

async function resolveAgency(slug: string, scope: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error({ scope, message: "Supabase client unavailable while resolving agency", slug });
    return null;
  }
  const normalized = typeof slug === "string" ? slug.trim() : "";
  console.log({ scope, message: "resolveAgency received slug", slug, normalized });
  if (!normalized) {
    console.error({ scope, message: "Missing slug parameter for agency lookup", slug });
    return null;
  }
  const agency = await findAgencyBySlug(supabase, normalized, { logScope: scope });
  if (!agency) {
    console.warn({ scope, message: "resolveAgency did not find agency", normalized });
  } else {
    console.log({
      scope,
      message: "resolveAgency resolved agency",
      normalized,
      agency: {
        id: agency.id,
        slug: agency.slug,
        agency_code: agency.agency_code,
        agency_name: agency.agency_name,
      },
    });
  }
  return agency;
}

export async function generateMetadata({
  params,
}: {
  params?: MaybePromise<RouteParams>;
}): Promise<Metadata> {
  const resolvedParams = await resolveMaybePromise(params, "agency.metadata");
  const slugParam = typeof resolvedParams?.slug === "string" ? resolvedParams.slug : "";

  const agency = await resolveAgency(slugParam, "agency.metadata");

  if (!agency) {
    return {
      title: "Agency Not Found",
      description: "The requested funding agency could not be located. Browse other government funders.",
      // Optionally: point back to /agencies
      alternates: {
        canonical: "/agencies",
      },
    };
  }

  const agencyName = agency.agency_name ?? "Government Agency";
  const description =
    agency.description ??
    `Explore current and past grant opportunities, funding programs, and announcements from ${agencyName}.`;

  const canonicalPath = `/agencies/${encodeURIComponent(slugParam)}`;

  return {
    title: `${agencyName} Grants & Funding Opportunities`,
    description,
    alternates: {
      // This tells Google “THIS is the main URL for this content”
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${agencyName} Grants & Funding Opportunities`,
      description,
      type: "website",
      // optional but nice:
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title: `${agencyName} Grants`,
      description,
    },
  };
}

export default async function AgencyPage({
  params,
  searchParams,
}: {
  params?: MaybePromise<RouteParams>;
  searchParams?: MaybePromise<RouteSearchParams>;
}) {
  console.log({ scope: "agency.page", message: "AgencyPage invoked", params, searchParams });
  const resolvedParams = await resolveMaybePromise(params, "agency.page");
  const resolvedSearchParams = await resolveMaybePromise(searchParams, "agency.page");
  console.log({
    scope: "agency.page",
    message: "AgencyPage resolved routing data",
    resolvedParams,
    resolvedSearchParams,
  });

  const page = safeNumber(resolvedSearchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(resolvedSearchParams?.pageSize, DEFAULT_PAGE_SIZE));

  const slugParam = typeof resolvedParams?.slug === "string" ? resolvedParams.slug : "";
const agency = await resolveAgency(slugParam, "agency.page");

    if (!agency) {
      notFound();
    }

    
    const displaySlug =
      agency.slug ??
      (agency.agency_code ? agency.agency_code.toLowerCase() : "") ??
      "";

  const [initialResults, facets] = await Promise.all([
    searchGrants({
      page,
      pageSize,
      agency: agency.agency_name,
      agencySlug: agency.slug ?? undefined,
      agencyCode: agency.agency_code ?? undefined,
    })
    

,
    getFacetSets(),
  ]);

  const categoryOptions: FilterOption[] = facets.categories.map((item) => ({
    label: `${item.label} (${item.grantCount})`,
    value: item.slug,
  }));
  const stateOptions: FilterOption[] = facets.states.map((facet) => ({
    label: `${facet.label} (${facet.grantCount})`,
    value: facet.value,
  }));
  const agencyOptions: FilterOption[] = facets.agencies.map((facet) => ({
    label: `${facet.label} (${facet.grantCount})`,
    value: facet.value,
  }));

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
                      slug: displaySlug,                 // ✅ now always a string
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
