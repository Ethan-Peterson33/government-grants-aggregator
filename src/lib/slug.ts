import type { Grant } from "@/lib/types";

export function slug(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

// ✅ Guard against undefined/empty IDs
export function shortId(uuid: string): string {
  if (!uuid || typeof uuid !== "string") return "";
  const [firstSegment] = uuid.split("-");
  return (firstSegment || String(uuid)).toLowerCase();
}

export function grantSlug(title: string, id: string): string {
  const base = slug(title || "");
  const idSegment = shortId(id);
  return base ? `${base}-${idSegment}` : idSegment;
}

function normalizeSegment(value: string | null | undefined, fallback: string): string {
  const raw = value && value.trim().length > 0 ? value : fallback;
  const normalized = slug(raw);
  const fallbackNormalized = slug(fallback);
  return normalized || fallbackNormalized || fallback.toLowerCase();
}

// Note: id/title are typed as required, but we still guard inside grantSlug/shortId
export function grantPath(
  grant: Pick<Grant, "id" | "title" | "category" | "state"> & { city?: string | null }
): string {
  const state = normalizeSegment(grant.state, "us");
  const city = normalizeSegment(grant.city, "statewide");
  const category = normalizeSegment(grant.category, "general");
  const slugValue = grantSlug(grant.title as string, grant.id as string);

  // If we somehow still didn’t get a slugValue, fallback to just id
  const finalSlug = slugValue || (typeof grant.id === "string" ? shortId(grant.id) : "item");
  return `/grants/${state}/${city}/${category}/${finalSlug}?id=${encodeURIComponent(
    (grant.id as string) || ""
  )}`;
}

export const buildGrantPath = grantPath;
