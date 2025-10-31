import type { JobWithLocation } from "@/lib/types";

export function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function shortId(id: string): string {
  return id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
}

export function buildJobPath(job: JobWithLocation): string {
  const segments: string[] = ["jobs"];

  if (job.state) {
    segments.push(slug(job.state));
  }

  if (job.city) {
    segments.push(slug(job.city));
  }

  if (job.category) {
    segments.push(slug(job.category));
  }

  const jobSlug = `${slug(job.title)}-${shortId(job.id)}`;
  segments.push(jobSlug);

  return `/${segments.join("/")}`;
}
