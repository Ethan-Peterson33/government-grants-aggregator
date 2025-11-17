import { inferGrantLocation } from "@/lib/grant-location";
import type { Grant } from "@/lib/types";
import { slugify } from "@/lib/strings";

export const slug = slugify;

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

function withIdQuery(path: string, id: string | null | undefined): string {
  if (!id || typeof id !== "string") return path;

  const trimmed = id.trim();
  if (!trimmed) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}id=${encodeURIComponent(trimmed)}`;
}

// Note: id/title are typed as required, but we still guard inside grantSlug/shortId
export function grantPath(
  grant: Pick<Grant, "id" | "title" | "category" | "state"> & { city?: string | null }
): string {
  const slugValue = grantSlug(grant.title as string, grant.id as string);

  // If we somehow still didn’t get a slugValue, fallback to just id
  const finalSlug = slugValue || (typeof grant.id === "string" ? shortId(grant.id) : "item");
  const location = inferGrantLocation(grant);
  const grantId = typeof grant.id === "string" ? grant.id : "";

  if (location.jurisdiction === "federal") {
    return withIdQuery(`/grants/federal/${finalSlug}`, grantId);
  }

  if (location.jurisdiction === "private") {
    return withIdQuery(`/grants/private/${finalSlug}`, grantId);
  }

  if (location.jurisdiction === "state") {
    return withIdQuery(
      `/grants/state/${location.stateCode.toUpperCase()}/${finalSlug}`,
      grantId
    );
  }

  return withIdQuery(
    `/grants/local/${location.stateCode.toUpperCase()}/${location.citySlug}/${finalSlug}`,
    grantId
  );
}

export const buildGrantPath = grantPath;

type MaybeString = string | null | undefined;

function normalizeCandidate(value: MaybeString): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed;
}

export function deriveAgencySlug(
  candidates: {
    slug?: MaybeString;
    agency_code?: MaybeString;
    agency_name?: MaybeString;
    agency?: MaybeString;
  } = {}
): string {
  const ordered = [
    normalizeCandidate(candidates.slug),
    normalizeCandidate(candidates.agency_code),
    normalizeCandidate(candidates.agency_name),
    normalizeCandidate(candidates.agency),
  ];

  for (const value of ordered) {
    if (value) {
      return slugify(value);
    }
  }

  return "";
}
