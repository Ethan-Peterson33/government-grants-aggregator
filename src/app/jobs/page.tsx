import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/jobs/breadcrumb";
import { RelatedLinks } from "@/components/jobs/related-links";
import { FiltersBar, type FilterOption } from "@/components/jobs/filters-bar";
import { Pagination } from "@/components/jobs/pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildJobPath } from "@/lib/slug";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { getFacetSets, safeNumber, searchJobs } from "@/lib/search";
import type { JobWithLocation } from "@/lib/types";

const PAGE_SIZE = 12;

// ✅ Required for live, dynamic filter updates
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0; // ensures every query param refreshes data
export const dynamicParams = true;
export const runtime = "nodejs"; // ensures server behaves consistently on Vercel

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const category = typeof searchParams?.category === "string" ? searchParams.category : undefined;
  const keyword = typeof searchParams?.q === "string" ? searchParams.q : undefined;
  const location = typeof searchParams?.location === "string" ? searchParams.location : undefined;

  const segments: string[] = ["Government Jobs"];
  if (category) segments.unshift(`${category} Jobs`);
  if (location) segments.unshift(`${location} openings`);
  if (keyword) segments.unshift(`Search results for "${keyword}"`);

  return {
    title: segments.join(" | "),
    description:
      "Explore the latest government job openings across the United States with filters for agency, keyword, and category.",
  };
}

export default async function JobsIndexPage({
  searchParams: rawSearchParams,
}: {
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | Promise<URLSearchParams | Record<string, string | string[] | undefined>>;
}) {
  // ✅ Handle async or sync searchParams correctly
  const resolvedParams = rawSearchParams instanceof Promise
    ? await rawSearchParams
    : rawSearchParams;

  // ✅ Normalize to plain object
  const params =
    resolvedParams instanceof URLSearchParams
      ? Object.fromEntries(resolvedParams.entries())
      : (resolvedParams as Record<string, string | string[] | undefined>);

  console.log("🧩 Resolved searchParams:", params);

  const page = safeNumber(params?.page, 1);
  const pageSize = Math.min(50, safeNumber(params?.pageSize, PAGE_SIZE));
  const category = typeof params?.category === "string" ? params.category : undefined;
  const query = typeof params?.q === "string" ? params.q : undefined;
  const location = typeof params?.location === "string" ? params.location : undefined;
  const type = typeof params?.type === "string" ? params.type : undefined;
  const state = typeof params?.state === "string" ? params.state : undefined;

  const filters = {
    page,
    pageSize,
    category,
    query,
    location,
    type,
    state,
  };

  // ✅ Fetch jobs + facets in parallel
  const [{ jobs, total }, facets] = await Promise.all([
    searchJobs(filters),
    getFacetSets(),
  ]);

  const categoryOptions: FilterOption[] = facets.categories.map((value) => ({ label: value, value }));
  const locationOptions: FilterOption[] = facets.locations.map((value) => ({ label: value, value }));
  const typeOptions: FilterOption[] = facets.employmentTypes.map((value) => ({ label: value, value }));
  const stateOptions: FilterOption[] = facets.states.map((value) => ({ label: value, value }));

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Jobs", href: "/jobs" },
  ];

  const itemListJsonLd = generateItemListJsonLd(jobs);
  const hasResults = jobs.length > 0;

  const relatedLinks = [
    locationOptions[0] && locationOptions[0].value !== location
      ? {
          label: `Jobs in ${locationOptions[0].label}`,
          href: `/jobs?location=${encodeURIComponent(locationOptions[0].value)}`,
        }
      : null,
    categoryOptions[0] && categoryOptions[0].value !== category
      ? {
          label: `${categoryOptions[0].label} roles`,
          href: `/jobs?category=${encodeURIComponent(categoryOptions[0].value)}`,
        }
      : null,
    typeOptions[0] && typeOptions[0].value !== type
      ? {
          label: `${typeOptions[0].label} jobs`,
          href: `/jobs?type=${encodeURIComponent(typeOptions[0].value)}`,
        }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1 space-y-6">
          <section className="space-y-4">
            <header className="space-y-2">
              <h1 className="text-3xl font-semibold text-slate-900">Government jobs</h1>
              <p className="text-slate-600">
                Browse fresh openings across agencies, disciplines, and locations. Use filters to hone in on the roles that align with your mission.
              </p>
            </header>
            <FiltersBar
              filters={{ query, category, location, type, state }}
              categories={categoryOptions}
              locations={locationOptions}
              employmentTypes={typeOptions}
              states={stateOptions}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Latest openings ({total})
            </h2>
            <div className="space-y-4">
              {hasResults ? (
                jobs.map((job: JobWithLocation) => (
                  <Card key={job.id}>
                    <CardHeader>
                      <CardTitle className="flex flex-col gap-1 text-lg">
                        <Link
                          href={{ pathname: buildJobPath(job), query: { id: job.id } }}
                          className="text-slate-900 hover:text-blue-700"
                        >
                          {job.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
                        {job.department && <span className="font-medium text-slate-700">{job.department}</span>}
                        {job.location && (
                          <>
                            {job.department && <span aria-hidden="true">•</span>}
                            <span>{job.location}</span>
                          </>
                        )}
                        {job.employment_type && (
                          <>
                            <span aria-hidden="true">•</span>
                            <span>{job.employment_type}</span>
                          </>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-slate-700">
                      {job.salary && <div className="font-medium text-slate-900">Salary: {job.salary}</div>}
                      {job.closing_at && (
                        <div>Closes {new Date(job.closing_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</div>
                      )}
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Posted {job.scraped_at ? new Date(job.scraped_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Recently"}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-slate-600">
                    <p>No jobs match your filters yet. Try adjusting your search or explore nearby locations.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          {hasResults && <Pagination total={total} pageSize={pageSize} currentPage={page} />}
        </div>

        <div className="w-full space-y-4 lg:w-72">
          <RelatedLinks
            links={
              relatedLinks.length
                ? relatedLinks
                : [
                    { label: "Federal jobs", href: "/jobs?category=Federal" },
                    { label: "Remote government jobs", href: "/jobs?location=Remote" },
                    { label: "Public health roles", href: "/jobs?category=Public%20Health" },
                  ]
            }
          />
        </div>
      </div>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateBreadcrumbJsonLd(
              breadcrumbItems.map((item) => ({ name: item.label, url: item.href }))
            ),
            itemListJsonLd,
          ]),
        }}
      />
    </div>
  );
}
