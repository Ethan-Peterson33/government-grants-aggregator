import { buildJobPath } from "@/lib/slug";
import type { Job, JobWithLocation } from "@/lib/types";

type BreadcrumbItem = {
  name: string;
  url?: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://example.com";

export function generateJobJsonLd(job: Job, options?: { path?: string }) {
  const jobPath = options?.path ?? `${buildJobPath(job)}?id=${encodeURIComponent(job.id)}`;
  const jobUrl = `${SITE_URL}${jobPath}`;
  const jobPosting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    datePosted: job.scraped_at ?? undefined,
    validThrough: job.closing_at ?? undefined,
    employmentType: job.employment_type ?? undefined,
    hiringOrganization: job.department
      ? {
          "@type": "Organization",
          name: job.department,
        }
      : undefined,
    jobLocation: job.location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: job.location,
          },
        }
      : undefined,
    identifier: {
      "@type": "PropertyValue",
      name: job.department ?? undefined,
      value: job.id,
    },
    description: job.department
      ? `${job.title} role with ${job.department}${job.location ? ` in ${job.location}` : ""}.`
      : `${job.title}${job.location ? ` in ${job.location}` : ""}.`,
    baseSalary: job.salary
      ? {
          "@type": "MonetaryAmount",
          currency: "USD",
          value: {
            "@type": "QuantitativeValue",
            value: job.salary,
          },
        }
      : undefined,
    directApply: Boolean(job.apply_link),
    applicationContact: job.apply_link
      ? {
          "@type": "ContactPoint",
          url: job.apply_link,
        }
      : undefined,
    url: jobUrl,
  };

  Object.keys(jobPosting).forEach((key) => {
    if (jobPosting[key] === undefined) {
      delete jobPosting[key];
    }
  });

  return jobPosting;
}

export function generateItemListJsonLd(jobs: JobWithLocation[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: jobs.length,
    itemListElement: jobs.map((job, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: job.title,
      url: `${SITE_URL}${buildJobPath(job)}?id=${encodeURIComponent(job.id)}`,
    })),
  };
}

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const listItem: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
      };

      if (item.url) {
        listItem.item = `${SITE_URL}${item.url}`;
      }

      return listItem;
    }),
  };
}
