import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/jobs/breadcrumb";
import { RelatedLinks } from "@/components/jobs/related-links";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateBreadcrumbJsonLd, generateJobJsonLd } from "@/lib/seo";
import { getJobById } from "@/lib/search";
import type { JobWithLocation } from "@/lib/types";
import { sentenceCase } from "@/lib/utils";

function extractShortId(slug: string): string | null {
  const parts = slug.split("-");
  const last = parts.at(-1);
  if (!last) return null;
  return last.toLowerCase();
}

function isJob(value: unknown): value is JobWithLocation {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<JobWithLocation>;
  return typeof record.id === "string" && typeof record.title === "string";
}

function matchesShortId(job: Pick<JobWithLocation, "id">, slug: string): boolean {
  const idSegment = extractShortId(slug);
  if (!idSegment) return false;
  return job.id.replace(/[^a-z0-9]/gi, "").toLowerCase().startsWith(idSegment);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { state: string; city: string; category: string; slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const jobId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const job = jobId ? await getJobById(jobId) : null;

  if (!isJob(job) || !matchesShortId(job, params.slug)) {
    return {
      title: "Government Job Not Found",
      description: "The requested job could not be located. Explore similar opportunities in your area.",
    };
  }

  const detailPath = `/jobs/${params.state}/${params.city}/${params.category}/${params.slug}?id=${encodeURIComponent(job.id)}`;
  const locationSummary = job.location ? ` – ${job.location}` : "";
  return {
    title: `${job.title}${locationSummary}`,
    description: job.department ? `${job.title} with ${job.department}${locationSummary}.` : job.title,
    alternates: {
      canonical: detailPath,
    },
    openGraph: {
      title: job.title,
      description: job.department ?? undefined,
      type: "article",
    },
  };
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: { state: string; city: string; category: string; slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const jobId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  if (!jobId) {
    notFound();
  }

  const job = await getJobById(jobId);

  if (!isJob(job) || !matchesShortId(job, params.slug)) {
    notFound();
  }

  const stateName = sentenceCase(params.state);
  const cityName = sentenceCase(params.city);
  const categoryName = sentenceCase(params.category);

  const detailPath = `/jobs/${params.state}/${params.city}/${params.category}/${params.slug}?id=${encodeURIComponent(job.id)}`;

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Jobs", href: "/jobs" },
    { label: stateName, href: `/jobs/${params.state}` },
    { label: cityName, href: `/jobs/${params.state}/${params.city}` },
    { label: categoryName, href: `/jobs/${params.state}/${params.city}/${params.category}` },
    { label: job.title, href: detailPath },
  ];

  const jobPostingJsonLd = generateJobJsonLd(job, { path: detailPath });

  const relatedLinks = [
    { label: `More roles in ${cityName}`, href: `/jobs/${params.state}/${params.city}` },
    { label: `${categoryName} jobs in ${cityName}`, href: `/jobs/${params.state}/${params.city}/${params.category}` },
    job.department
      ? {
          label: `Openings at ${job.department}`,
          href: `/jobs?department=${encodeURIComponent(job.department)}`,
        }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  return (
    <div className="container-grid space-y-8 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl text-slate-900">{job.title}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 text-base text-slate-700">
            {job.department && <span className="font-medium">{job.department}</span>}
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
        <CardContent className="space-y-6">
          <div className="space-y-3 text-slate-700">
            {job.salary && <p className="font-medium text-slate-900">Salary range: {job.salary}</p>}
            {job.closing_at && (
              <p>Applications close {new Date(job.closing_at).toLocaleDateString(undefined, { dateStyle: "medium" })}.</p>
            )}
            {job.scraped_at && (
              <p className="text-sm text-slate-500">Last updated {new Date(job.scraped_at).toLocaleDateString(undefined, { dateStyle: "medium" })}.</p>
            )}
          </div>
          {job.apply_link ? (
            <Link
              href={job.apply_link}
              className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
            >
              Apply now
            </Link>
          ) : (
            <span className="inline-flex w-full items-center justify-center rounded-md border border-slate-200 px-6 py-2 text-sm text-slate-600 sm:w-auto">
              Application link unavailable
            </span>
          )}
        </CardContent>
      </Card>

      <RelatedLinks links={relatedLinks} />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateBreadcrumbJsonLd(breadcrumbItems.map((item) => ({ name: item.label, url: item.href }))),
            jobPostingJsonLd,
          ]),
        }}
      />
    </div>
  );
}
