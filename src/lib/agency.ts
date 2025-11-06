import type { SupabaseClient } from "@supabase/supabase-js";
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

const SCOPE_DEFAULT = "agency.lookup";

type SupabaseTableClient = SupabaseClient<any, any, any>;

type FindAgencyOptions = {
  logScope?: string;
};

function log(scope: string, level: "info" | "warn" | "error", message: string, payload?: unknown) {
  const entry = { scope, message, payload };
  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.log(entry);
  }
}

function slugWordsPattern(slug: string): string {
  const tokens = slug
    .split(/[-\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => escapeIlike(token));
  if (tokens.length === 0) return "";
  return `%${tokens.join("%")}%`;
}

function withPercent(value: string): string {
  const sanitized = escapeIlike(value);
  return `%${sanitized}%`;
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

async function findAgencyViaTable(
  supabase: SupabaseTableClient,
  table: "agencies" | "grants",
  orClauses: string[],
  scope: string,
  debugLabel: string,
): Promise<AgencyRow | null> {
  if (!orClauses.length) return null;

  log(scope, "info", `Querying ${table} using ${debugLabel}`, {
    table,
    clauseCount: orClauses.length,
  });

  const query = supabase
    .from(table)
    .select(table === "agencies" ? "*" : "agency_code, agency_name, agency, agency_id")
    .or(orClauses.join(","))
    .order(table === "agencies" ? "updated_at" : "scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = (await query) as unknown as {
    data:
      | AgencyRow
      | {
          agency_code?: string | null;
          agency_name?: string | null;
          agency?: string | null;
          agency_id?: string | null;
        }
      | null;
    error: { message: string } | null;
  };

  if (error) {
    log(scope, "error", `Query against ${table} failed`, { error, debugLabel });
    return null;
  }

  if (!data) {
    log(scope, "info", `No match found in ${table}`, { debugLabel });
    return null;
  }

  if (table === "agencies") {
    return data as AgencyRow;
  }

  const grantRow = data as {
    agency_code?: string | null;
    agency_name?: string | null;
    agency?: string | null;
    agency_id?: string | null;
  };
  return {
    id: grantRow.agency_id ?? grantRow.agency_code ?? undefined,
    agency_code: grantRow.agency_code ?? null,
    agency_name: grantRow.agency_name ?? grantRow.agency ?? null,
  } as AgencyRow;
}

async function findAgencyByName(
  supabase: SupabaseTableClient,
  slug: string,
  scope: string,
): Promise<AgencyRow | null> {
  const candidates = agencySlugCandidates(slug);
  const patterns = new Set<string>();
  if (candidates.nameFragment) {
    patterns.add(withPercent(candidates.nameFragment));
  }
  const slugPattern = slugWordsPattern(slug);
  if (slugPattern) {
    patterns.add(slugPattern);
  }
  if (patterns.size === 0) return null;

  const orClauses = Array.from(patterns).flatMap((pattern) => [
    `agency_name.ilike.${pattern}`,
    `agency.ilike.${pattern}`,
  ]);

  log(scope, "info", "Attempting name-based agency lookup", {
    slug,
    patternCount: patterns.size,
  });

  const fromAgencies = await findAgencyViaTable(supabase, "agencies", orClauses, scope, "name-match-agencies");
  if (fromAgencies) {
    log(scope, "info", "Matched agency via agencies table name", {
      slug,
      agency_code: fromAgencies.agency_code ?? null,
    });
    return fromAgencies;
  }

  const fromGrants = await findAgencyViaTable(supabase, "grants", orClauses, scope, "name-match-grants");
  if (fromGrants) {
    log(scope, "info", "Matched agency via grants table name", {
      slug,
      agency_code: fromGrants.agency_code ?? null,
    });
    return fromGrants;
  }

  return null;
}

async function findAgencyByCode(
  supabase: SupabaseTableClient,
  slug: string,
  scope: string,
): Promise<AgencyRow | null> {
  const candidates = agencySlugCandidates(slug);
  if (candidates.codeCandidates.length === 0) return null;

  const clauses = new Set<string>();
  for (const code of candidates.codeCandidates) {
    if (!code) continue;
    const sanitized = escapeIlike(code);
    clauses.add(`agency_code.ilike.${sanitized}`);
    clauses.add(`agency_code.ilike.%${sanitized}%`);
  }

  const clauseArray = Array.from(clauses);
  log(scope, "info", "Attempting code-based agency lookup", {
    slug,
    clauseCount: clauseArray.length,
  });
  const fromAgencies = await findAgencyViaTable(supabase, "agencies", clauseArray, scope, "code-match-agencies");
  if (fromAgencies) {
    log(scope, "info", "Matched agency via agencies table code", {
      slug,
      agency_code: fromAgencies.agency_code ?? null,
    });
    return fromAgencies;
  }

  const fromGrants = await findAgencyViaTable(supabase, "grants", clauseArray, scope, "code-match-grants");
  if (fromGrants) {
    log(scope, "info", "Matched agency via grants table code", {
      slug,
      agency_code: fromGrants.agency_code ?? null,
    });
    return fromGrants;
  }

  return null;
}

async function findAgencyByDerivedSlug(
  supabase: SupabaseTableClient,
  slug: string,
  scope: string,
): Promise<AgencyRow | null> {
  log(scope, "info", "Attempting derived slug agency lookup", { slug });
  const { data, error } = (await supabase
    .from("agencies")
    .select("*")
    .limit(5000)) as unknown as {
    data: AgencyRow[] | null;
    error: { message: string } | null;
  };

  if (error) {
    log(scope, "error", "Failed to fetch agencies while deriving slug", { error });
    return null;
  }

  const rows = data ?? [];
  for (const row of rows) {
    const directCandidate = deriveAgencySlug({
      slug: row.slug ?? undefined,
      agency_code: row.agency_code ?? undefined,
      agency_name: row.agency_name ?? row.name ?? undefined,
    });
    if (directCandidate && directCandidate === slug) {
      log(scope, "info", "Derived slug matched agency row", {
        slug,
        agency_code: row.agency_code ?? null,
      });
      return row;
    }

    const nameCandidate = deriveAgencySlug({ slug: row.agency_name ?? undefined });
    if (nameCandidate && nameCandidate === slug) {
      log(scope, "info", "Derived slug matched agency name", {
        slug,
        agency_code: row.agency_code ?? null,
      });
      return row;
    }
  }

  log(scope, "warn", "Derived slug lookup did not match any agencies", {
    slug,
    inspected: rows.length,
  });
  return null;
}

export async function findAgencyBySlug(
  supabase: SupabaseTableClient | undefined,
  slug: string,
  options: FindAgencyOptions = {},
): Promise<Agency | null> {
  const scope = options.logScope ?? SCOPE_DEFAULT;

  if (!supabase) {
    log(scope, "warn", "Supabase client unavailable for lookup", { slug });
    return null;
  }

  const normalizedSlug = typeof slug === "string" ? slug.trim().toLowerCase() : "";
  if (!normalizedSlug) {
    log(scope, "warn", "Cannot lookup agency without slug", { slug });
    return null;
  }

  log(scope, "info", "Starting agency lookup", { slug: normalizedSlug });

  const byCode = await findAgencyByCode(supabase, normalizedSlug, scope);
  if (byCode) {
    const normalized = toAgency(byCode, normalizedSlug);
    if (normalized) {
      log(scope, "info", "Agency lookup succeeded via code", {
        slug: normalized.slug,
        agency_code: normalized.agency_code,
      });
      return normalized;
    }
  }

  const byName = await findAgencyByName(supabase, normalizedSlug, scope);
  if (byName) {
    const normalized = toAgency(byName, normalizedSlug);
    if (normalized) {
      log(scope, "info", "Agency lookup succeeded via name", {
        slug: normalized.slug,
        agency_code: normalized.agency_code,
      });
      return normalized;
    }
  }

  const byDerivedSlug = await findAgencyByDerivedSlug(supabase, normalizedSlug, scope);
  if (byDerivedSlug) {
    const normalized = toAgency(byDerivedSlug, normalizedSlug);
    if (normalized) {
      log(scope, "info", "Agency lookup succeeded via derived slug", {
        slug: normalized.slug,
        agency_code: normalized.agency_code,
      });
      return normalized;
    }
  }

  log(scope, "warn", "Agency lookup failed for slug", { slug: normalizedSlug });
  return null;
}

function coalesceSlug(
  row: AgencyRow,
  fallbackSlug?: string
): string {
  if (fallbackSlug) {
    const fromFallback = deriveAgencySlug({ slug: fallbackSlug });
    if (fromFallback) return fromFallback;
  }

  const fromName = deriveAgencySlug({
    slug: row.slug,
    agency_name: row.agency_name ?? row.name ?? undefined,
  });
  if (fromName) return fromName;

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
