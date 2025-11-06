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

export function escapeIlike(value: string): string {
  return value.replace(/[%_]/g, (match) => `\\${match}`).replace(/'/g, "''");
}

export function agencySlugCandidates(slug: string) {
  const normalized = typeof slug === "string" ? slug.trim().toLowerCase() : "";
  if (!normalized) {
    return {
      slug: "",
      nameFragment: "",
      codeCandidates: [] as string[],
    };
  }

  const collapsed = normalized.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  const codeCandidates = new Set<string>();
  codeCandidates.add(normalized);

  const upper = normalized.toUpperCase();
  codeCandidates.add(upper);

  const noHyphen = normalized.replace(/-/g, "");
  if (noHyphen) {
    codeCandidates.add(noHyphen);
    codeCandidates.add(noHyphen.toUpperCase());
  }

  return {
    slug: normalized,
    nameFragment: collapsed,
    codeCandidates: Array.from(codeCandidates).filter(Boolean),
  };
}

export function agencyGrantFilterClauses(agency: Agency) {
  const clauses = new Set<string>();

  if (agency.id) {
    clauses.add(`agency_id.eq.${agency.id}`);
  }

  if (agency.agency_code) {
    for (const code of agencySlugCandidates(agency.agency_code).codeCandidates) {
      clauses.add(`agency_code.ilike.${escapeIlike(code)}`);
    }
  }

  const nameFragments = new Set<string>();
  if (agency.agency_name) {
    nameFragments.add(agency.agency_name.trim().toLowerCase());
  }

  const slugCandidates = agencySlugCandidates(agency.slug);
  if (slugCandidates.nameFragment) {
    nameFragments.add(slugCandidates.nameFragment);
  }

  if (agency.agency_code) {
    const fromCode = agencySlugCandidates(agency.agency_code).nameFragment;
    if (fromCode) {
      nameFragments.add(fromCode);
    }
  }

  for (const fragment of nameFragments) {
    const normalized = fragment.trim().toLowerCase();
    if (!normalized) continue;
    const pattern = `%${escapeIlike(normalized)}%`;
    clauses.add(`agency_name.ilike.${pattern}`);
    clauses.add(`agency.ilike.${pattern}`);
  }

  return Array.from(clauses);
}

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
