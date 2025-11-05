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

// Note: id/title are typed as required, but we still guard inside grantSlug/shortId
export function grantPath(
  grant: Pick<Grant, "id" | "title" | "category" | "state"> & { city?: string | null }
): string {
  const slugValue = grantSlug(grant.title as string, grant.id as string);

  // If we somehow still didn’t get a slugValue, fallback to just id
  const finalSlug = slugValue || (typeof grant.id === "string" ? shortId(grant.id) : "item");
  const location = inferGrantLocation(grant);

  if (location.jurisdiction === "federal") {
    return `/grants/federal/${finalSlug}`;
  }

  if (location.jurisdiction === "state") {
    return `/grants/state/${location.stateCode.toUpperCase()}/${finalSlug}`;
  }

  return `/grants/local/${location.stateCode.toUpperCase()}/${location.citySlug}/${finalSlug}`;
}

export const buildGrantPath = grantPath;
