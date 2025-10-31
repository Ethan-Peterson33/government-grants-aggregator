import type { Grant } from "@/lib/types";

export function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function shortId(uuid: string): string {
  const [firstSegment] = uuid.split("-");
  return (firstSegment ? firstSegment : uuid).toLowerCase();
}

export function grantSlug(title: string, id: string): string {
  const base = slug(title);
  const idSegment = shortId(id);
  return base ? `${base}-${idSegment}` : idSegment;
}

function normalizeSegment(value: string | null | undefined, fallback: string): string {
  const raw = value && value.trim().length > 0 ? value : fallback;
  const normalized = slug(raw);
  const fallbackNormalized = slug(fallback);
  return normalized || fallbackNormalized || fallback.toLowerCase();
}

export function grantPath(
  grant: Pick<Grant, "id" | "title" | "category" | "state"> & { city?: string | null }
): string {
  const state = normalizeSegment(grant.state, "us");
  const city = normalizeSegment(grant.city, "statewide");
  const category = normalizeSegment(grant.category, "general");
  const slugValue = grantSlug(grant.title, grant.id);

  return `/grants/${state}/${city}/${category}/${slugValue}?id=${encodeURIComponent(grant.id)}`;
}

export const buildGrantPath = grantPath;
