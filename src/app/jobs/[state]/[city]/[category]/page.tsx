import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/jobs/breadcrumb";
import { Pagination } from "@/components/jobs/pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildJobPath } from "@/lib/slug";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchJobs } from "@/lib/search";
import type { JobWithLocation } from "@/lib/types";
import { sentenceCase } from "@/lib/utils";

const PAGE_SIZE = 10;

export async function generateMetadata({
  params,
}: {
  params: { state: string; city: string; category: string };
}): Promise<Metadata> {
  const stateName = sentenceCase(params.state);
  const cityName = sentenceCase(params.city);
  const categoryName = sentenceCase(params.category);
  return {
    title: `${categoryName} Jobs in ${cityName}, ${stateName}`,
    description: `Browse ${categoryName.toLowerCase()} roles in ${cityName}, ${stateName}, and advance your public sector career.`,
  };
}

export default async function CategoryJobsPage({
  params,
  searchParams,
}: {
  params: { state: string; city: string; category: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = safeNumber(searchParams?.page, 1);
  const { state, city, category } = params;
  const stateName = sentenceCase(state);
  const cityName = sentenceCase(city);
  const categoryName = sentenceCase(category);
  const stateFilter = state.length <= 2 ? state.toUpperCase() : stateName;
  const locationFilter = `${cityName}, ${stateFilter}`;
  const { jobs, total } = await searchJobs({
    location: locationFilter,
    category: categoryName,
    page,
    pageSize: PAGE_SIZE,
  });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Jobs", href: "/jobs" },
    { label: stateName, href: `/jobs/${state}` },
    { label: cityName, href: `/jobs/${state}/${city}` },
    { label: categoryName, href: `/jobs/${state}/${city}/${category}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(jobs);

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {categoryName} jobs in {cityName}
        </h1>
        <p className="text-slate-600">
          Specialized openings in {cityName} that match your expertise in {categoryName.toLowerCase()}.
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-4">
          {jobs.length ? (
            jobs.map((job: JobWithLocation) => (
              <Card key={job.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
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
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-600">
                <p>No {categoryName.toLowerCase()} roles are posted right now. Adjust filters or explore nearby categories.</p>
              </CardContent>
            </Card>
          )}
        </div>
        {jobs.length > 0 && <Pagination total={total} pageSize={PAGE_SIZE} currentPage={page} />}
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
