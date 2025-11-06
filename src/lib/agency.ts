import { deriveAgencySlug } from "@/lib/slug";
import type { Agency } from "@/lib/types";

export type AgencyRow = {
  id: string;
  slug?: string | null;
  agency_name?: string | null;
  name?: string | null;
  agency_code?: string | null;
  description?: string | null;
  website?: string | null;
  contacts?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

function coalesceSlug(
  row: AgencyRow,
  fallbackSlug?: string
): string {
  const fromRow = deriveAgencySlug({
    slug: row.slug,
    agency_code: row.agency_code,
    agency_name: row.agency_name ?? row.name ?? undefined,
  });
  if (fromRow) return fromRow;

  if (fallbackSlug) {
    const fromFallback = deriveAgencySlug({ slug: fallbackSlug });
    if (fromFallback) return fromFallback;
  }

  if (row.agency_code) {
    const fromCode = deriveAgencySlug({ slug: row.agency_code });
    if (fromCode) return fromCode;
  }

  const fromId = deriveAgencySlug({ slug: row.id });
  return fromId || (row.id ?? "");
}

export function toAgency(
  row: AgencyRow | null | undefined,
  fallbackSlug?: string
): Agency | null {
  if (!row) return null;
  const agencyName = row.agency_name ?? row.name ?? null;
  const normalizedName = agencyName?.trim();
  const slug = coalesceSlug(row, fallbackSlug);

  return {
    id: row.id,
    slug,
    agency_name: normalizedName && normalizedName.length > 0 ? normalizedName : slug,
    agency_code: row.agency_code ?? null,
    description: row.description ?? null,
    website: row.website ?? null,
    contacts: row.contacts ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  } satisfies Agency;
}
