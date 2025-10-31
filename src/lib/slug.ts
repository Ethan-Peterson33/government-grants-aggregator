import type { Grant } from "@/lib/types";

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

export function buildGrantPath(grant: Pick<Grant, "id" | "title" | "category" | "state"> & {
  city?: string | null;
}): string {
  const segments: string[] = ["grants"];

  const category = grant.category || "general";
  const state = grant.state || "us";

  segments.push(slug(state));

  const citySegment = grant.city ? slug(grant.city) : "statewide";
  segments.push(citySegment);

  segments.push(slug(category));

  const grantSlug = `${slug(grant.title)}-${shortId(grant.id)}`;
  segments.push(grantSlug);

  return `/${segments.join("/")}`;
}
