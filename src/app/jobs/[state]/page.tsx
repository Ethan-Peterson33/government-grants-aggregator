import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/jobs/breadcrumb";
import { RelatedLinks } from "@/components/jobs/related-links";
import { Pagination } from "@/components/jobs/pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildJobPath } from "@/lib/slug";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber, searchJobs } from "@/lib/search";
import type { JobWithLocation } from "@/lib/types";
import { sentenceCase } from "@/lib/utils";

const PAGE_SIZE = 10;

export async function generateMetadata({ params }: { params: { state: string } }): Promise<Metadata> {
  const stateName = sentenceCase(params.state);
  return {
    title: `${stateName} Government Jobs`,
    description: `Search for public sector opportunities in ${stateName}, including state agencies and local municipalities.`,
  };
}

export default async function StateJobsPage({
  params,
  searchParams,
}: {
  params: { state: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const state = params.state;
  const page = safeNumber(searchParams?.page, 1);
  const stateName = sentenceCase(state);
  const stateFilter = state.length <= 2 ? state.toUpperCase() : stateName;
  const { jobs, total } = await searchJobs({ location: stateFilter, page, pageSize: PAGE_SIZE });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Jobs", href: "/jobs" },
    { label: stateName, href: `/jobs/${state}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(jobs);

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{stateName} government jobs</h1>
        <p className="text-slate-600">
          Explore public service roles in {stateName}. Filter by city or category to discover where your
          skills can make an immediate impact.
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
                <p>No state listings yet. Try adjusting your filters or exploring federal roles.</p>
              </CardContent>
            </Card>
          )}
        </div>
        {jobs.length > 0 && <Pagination total={total} pageSize={PAGE_SIZE} currentPage={page} />}
      </section>

      <RelatedLinks
        links={[
          { label: `Top cities hiring in ${stateName}`, href: `/jobs/${state}/top-cities` },
          { label: `State agencies hiring in ${stateName}`, href: `/jobs/${state}/agencies` },
        ]}
      />

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
