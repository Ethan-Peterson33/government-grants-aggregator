import type { PostgrestError } from "@supabase/supabase-js";
import { validate as isUuid } from "uuid";
import { agencySlugCandidates, escapeIlike } from "@/lib/agency";
import {
  FEDERAL_STATE_LABELS,
  STATEWIDE_CITY_LABELS,
  inferGrantLocation,
  normalizeStateCode,
  stateNameCandidatesFromCode,
} from "@/lib/grant-location";
import { deriveAgencySlug } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FacetSets, Grant, GrantFilters } from "@/lib/types";

const TABLE_FALLBACK_ORDER: readonly string[] = ["grants"];

type TableFeatures = {
  hasGrantCategoryFk?: boolean;
  hasStateColumn?: boolean;
  hasCityColumn?: boolean;
};

const TABLE_FEATURES: Record<string, TableFeatures> = {
  grants: { hasGrantCategoryFk: true, hasStateColumn: true, hasCityColumn: true },
};

/** Safely parse numeric query params */
export function safeNumber(value: string | string[] | undefined, fallback: number) {
  if (Array.isArray(value)) value = value[0];
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export type SearchResult = {
  grants: Grant[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Main search function */
export async function searchGrants(filters: GrantFilters = {}): Promise<SearchResult> {
  const supabase = createServerSupabaseClient();
  if (!supabase)
    return { grants: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 50) : 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const like = (v?: string) =>
    typeof v === "string" && v.trim() ? escapeIlike(v.trim()) : undefined;

  const sanitizedQuery = like(filters.query);
  const sanitizedCategory = like(filters.category);

  // 🔹 Raw state string from filters (for “Federal (nationwide)” detection)
  const rawStateFilter = typeof filters.state === "string" ? filters.state.trim() : "";

  const sanitizedState = like(filters.state);
  const sanitizedCity = like(filters.city);
  const sanitizedAgency = like(filters.agency);
  const sanitizedAgencySlug =
    typeof filters.agencySlug === "string" && filters.agencySlug.trim().length > 0
      ? filters.agencySlug.trim().toLowerCase()
      : undefined;
  const sanitizedAgencyCode =
    typeof filters.agencyCode === "string" && filters.agencyCode.trim().length > 0
      ? filters.agencyCode.trim()
      : undefined;

  const stateCode = normalizeStateCode(filters.stateCode ?? undefined);
  const hasApplyLink = filters.hasApplyLink === true;

  // Detect when user chose the special “Federal” option in the UI
  const stateLower = rawStateFilter.toLowerCase();
  const isFederalStateFilter =
    stateLower === "federal" ||
    stateLower === "federal (nationwide)" ||
    stateLower === "nationwide";

  // If jurisdiction wasn't explicitly passed, derive it from the state filter
  let jurisdiction = filters.jurisdiction ?? undefined;
  if (!jurisdiction && isFederalStateFilter) {
    jurisdiction = "federal";
  }

  console.log("➡️ Final grant query filters", {
    sanitizedQuery,
    sanitizedCategory,
    sanitizedState,
    sanitizedCity,
    sanitizedAgency,
    sanitizedAgencySlug,
    sanitizedAgencyCode,
    stateCode,
    jurisdiction: jurisdiction ?? "all",
    hasApplyLink,
    page,
    pageSize,
    range: { from, to },
  });

  for (const table of TABLE_FALLBACK_ORDER) {
    const { hasGrantCategoryFk = false, hasStateColumn = false, hasCityColumn = false } = TABLE_FEATURES[table] ?? {};

    const selectColumns = hasGrantCategoryFk
      ? `
        *,
        grant_categories:grant_categories(
          category_code,
          category_label,
          slug
        )
        `
      : "*";

    // ✅ JOIN category table via FK
    let q = supabase
      .from(table)
      .select(selectColumns, { count: "exact" })
      .order("scraped_at", { ascending: false })
      .range(from, to);

    /** Keyword search */
    if (sanitizedQuery) {
      const queryOrClauses = ["title", "summary", "description"].map(
        (field) => `${field}.ilike.%${sanitizedQuery}%`
      );
      console.log("🔎 Applying keyword search", { table, clauses: queryOrClauses });
      q = q.or(queryOrClauses.join(","));
    }

    /** Category filter (join-based) */
    if (sanitizedCategory) {
      const trimmedCategory = sanitizedCategory.trim();
      const pattern = `%${trimmedCategory}%`;

      if (hasGrantCategoryFk) {
        // ✅ Match by label only — safer and avoids logic tree parse errors
        q = q.ilike("grant_categories.category_label", pattern);
      } else {
        q = q.ilike("category", pattern);
      }
    }

    /** State filter */
    if (stateCode && hasStateColumn) {
      const candidateClauses = stateNameCandidatesFromCode(stateCode).map(
        (candidate) => `state.ilike.%${escapeIlike(candidate)}%`
      );
      const clauses = candidateClauses.length
        ? candidateClauses
        : [`state.ilike.%${escapeIlike(stateCode)}%`];
      console.log("🌎 Matching state code candidates", { table, stateCode, clauses });
      q = q.or(clauses.join(","));
    } else if (sanitizedState && !isFederalStateFilter && hasStateColumn) {
      console.log("🌎 Matching state fragment", { table, state: sanitizedState });
      q = q.ilike("state", `%${sanitizedState}%`);
    }

    /** City filter */
    if (sanitizedCity && hasCityColumn) {
      console.log("🏙️ Matching city fragment", { table, city: sanitizedCity });
      q = q.ilike("city", `%${sanitizedCity}%`);
    }

    /** ✅ Combined Agency Filters */
    const agencyClauses: string[] = [];

    if (sanitizedAgency) {
      agencyClauses.push(`agency.ilike.%${escapeIlike(sanitizedAgency)}%`);
      agencyClauses.push(`agency_name.ilike.%${escapeIlike(sanitizedAgency)}%`);
    }

    if (sanitizedAgencyCode) {
      const codeCandidates = agencySlugCandidates(sanitizedAgencyCode);
      for (const code of codeCandidates.codeCandidates) {
        agencyClauses.push(`agency_code.ilike.%${escapeIlike(code)}%`);
      }
    }

    if (sanitizedAgencySlug) {
      const slugCandidates = agencySlugCandidates(sanitizedAgencySlug);
      for (const code of slugCandidates.codeCandidates) {
        agencyClauses.push(`agency_code.ilike.%${escapeIlike(code)}%`);
      }
      if (slugCandidates.nameFragment) {
        const fragment = escapeIlike(slugCandidates.nameFragment);
        agencyClauses.push(`agency_name.ilike.%${fragment}%`);
        agencyClauses.push(`agency.ilike.%${fragment}%`);
      }
    }

    if (agencyClauses.length > 0) {
      console.log("🏢 Matching all agency conditions", agencyClauses);
      q = q.or(agencyClauses.join(","), { foreignTable: undefined });
    }

    /** Has Apply Link */
    if (hasApplyLink) {
      console.log("📝 Filtering to grants with application links", { table });
      q = q.not("apply_link", "is", null);
    }

    /** Jurisdiction filters */
    if (jurisdiction === "federal" && hasStateColumn) {
      const orClauses = ["state.is.null", "state.eq."];
      for (const label of FEDERAL_STATE_LABELS) {
        const sanitizedLabel = escapeIlike(label);
        orClauses.push(`state.ilike.%${sanitizedLabel}%`);
      }
      console.log("🏛️ Applying federal jurisdiction filter", { table, clauses: orClauses });
      q = q.or(orClauses.join(","));
    } else if (jurisdiction === "state" && hasCityColumn) {
      const cityClauses = ["city.is.null"];
      for (const label of STATEWIDE_CITY_LABELS) {
        const sanitizedLabel = escapeIlike(label);
        cityClauses.push(`city.ilike.%${sanitizedLabel}%`);
      }
      console.log("🗺️ Applying state jurisdiction filter", { table, clauses: cityClauses });
      q = q.or(cityClauses.join(","));
    } else if (jurisdiction === "local" && hasCityColumn) {
      console.log("🏘️ Applying local jurisdiction filter", { table });
      q = q.not("city", "is", null).not("city", "eq", "");
      for (const label of STATEWIDE_CITY_LABELS) {
        q = q.not("city", "ilike", `%${escapeIlike(label)}%`);
      }
    }

    /** Execute Query */
    const { data, error, count } = (await q) as unknown as {
      data: Grant[] | null;
      error: PostgrestError | null;
      count: number | null;
    };

    if (error) {
      console.error("❌ Query failed:", error);
      break;
    }

    /** Transform Results */
    const grants = (data ?? []).map((grant) => {
      const agencyName = grant.agency_name ?? grant.agency ?? null;
      const categoryLabel =
        grant.grant_categories?.category_label ??
        grant.category ??
        grant.category_code ??
        null;

      const fallbackSlug = deriveAgencySlug({
        slug: grant.agency_slug ?? undefined,
        agency_code: grant.agency_code ?? undefined,
        agency_name: agencyName,
        agency: grant.agency ?? undefined,
      });

      return {
        ...grant,
        agency: agencyName,
        agency_name: agencyName,
        agency_slug: fallbackSlug || null,
        category: categoryLabel,
        category_code: grant.category_code ?? null,
      };
    });

    const total = count ?? grants.length;
    console.log("⬅️ Query result summary", {
      table,
      total,
      returned: grants.length,
      page,
      pageSize,
    });

    return {
      grants,
      total,
      page,
      pageSize,
      totalPages: total ? Math.ceil(total / pageSize) : 0,
    };
  }

  return { grants: [], total: 0, page, pageSize, totalPages: 0 };
}

/** Helper utilities */
const toComparable = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
const textIncludes = (text: string | null | undefined, keyword: string) =>
  toComparable(text).includes(keyword);

/** Local filtering (fallback) */
export function grantMatchesFilters(grant: Grant, filters: GrantFilters): boolean {
  const keyword = toComparable(filters.query);
  if (keyword) {
    const inTitle = textIncludes(grant.title, keyword);
    const inSummary = textIncludes(grant.summary, keyword);
    const inDescription = textIncludes(grant.description, keyword);
    if (!inTitle && !inSummary && !inDescription) return false;
  }

  const category = toComparable(filters.category);
  if (category && !textIncludes(grant.category, category)) return false;

  const location = inferGrantLocation(grant);
  const filterStateCode = normalizeStateCode(filters.stateCode ?? undefined);

  if (filterStateCode) {
    if (location.jurisdiction === "federal") return false;
    if (location.stateCode.toUpperCase() !== filterStateCode) return false;
  }

  if (filters.jurisdiction && location.jurisdiction !== filters.jurisdiction) return false;

  const state = toComparable(filters.state);
  if (state && !textIncludes(grant.state, state)) return false;

  const cityFilter = toComparable(filters.city);
  if (cityFilter && !textIncludes(grant.city, cityFilter)) return false;

  const agency = toComparable(filters.agency);
  if (agency && !textIncludes(grant.agency, agency)) return false;

  if (filters.hasApplyLink && !grant.apply_link) return false;

  return true;
}

/** Local filtering + pagination */
export function filterGrantsLocally(
  grants: Grant[],
  filters: GrantFilters = {},
  defaultPageSize = 20
): SearchResult {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 50) : defaultPageSize;

  const filtered = grants.filter((grant) => grantMatchesFilters(grant, filters));
  const sorted = filtered.sort((a, b) => {
    const aKey = a.scraped_at ?? "";
    const bKey = b.scraped_at ?? "";
    return aKey > bKey ? -1 : 1;
  });

  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const paginated = sorted.slice(from, to);

  return {
    grants: paginated,
    total: filtered.length,
    page,
    pageSize,
    totalPages: filtered.length > 0 ? Math.ceil(filtered.length / pageSize) : 0,
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Normalize UUID or fallback to short ID */
function normalizeGrantId(rawId: string): string | null {
  if (!rawId) return null;
  const cleaned = rawId.replace(/-\d+$/, "");
  return isUuid(cleaned) ? cleaned : null;
}

/** Get a single grant by ID, with UUID safety and short-ID fallback */
export async function getGrantById(id: string): Promise<Grant | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const normalizedId = normalizeGrantId(id);
  if (!normalizedId) {
    console.warn("⚠️ Invalid UUID format passed to getGrantById:", id);
    return null;
  }

  for (const table of TABLE_FALLBACK_ORDER) {
    const { data, error } = (await supabase
      .from(table)
      .select("*")
      .eq("id", normalizedId)
      .maybeSingle()) as unknown as {
      data: Grant | null;
      error: PostgrestError | null;
    };

    if (error) {
      console.error("❌ getGrantById error:", error);
      if (error.code === "22P02" || error.message?.includes("invalid input syntax for type uuid")) {
        console.log("🔁 Falling back to short-ID lookup");
        return await getGrantByShortId(id.split("-")[0]);
      }
      break;
    }

    if (data) return data;
  }

  return await getGrantByShortId(id.split("-")[0]);
}

/** Get grant by short ID prefix */
export async function getGrantByShortId(short: string): Promise<Grant | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const target = short.trim().toLowerCase();
  if (!target) return null;

  const { data, error } = await supabase
    .from("grants")
    .select("*")
    .ilike("id", `${target}%`)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ getGrantByShortId error:", error);
    return null;
  }
  return data ?? null;
}

/** Faceted data for filters */
export async function getFacetSets(): Promise<FacetSets> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return { categories: [], states: [], agencies: [] };

  const f: FacetSets = { categories: [], states: [], agencies: [] };
  const clean = (vals: (string | null)[]) =>
    [...new Set(vals.filter((v): v is string => !!v && v.trim().length > 0))].sort();

  for (const table of TABLE_FALLBACK_ORDER) {
    const [cat, st, ag] = (await Promise.all([
      supabase.from(table).select("category").limit(500),
      supabase.from(table).select("state").limit(200),
      supabase.from(table).select("agency").limit(500),
    ])) as any;

    if (cat.error || st.error || ag.error) {
      console.error("❌ facet query failed", cat.error || st.error || ag.error);
      continue;
    }

    f.categories = clean(cat.data.map((x: any) => x.category)).slice(0, 50);

    const dbStates = clean(st.data.map((x: any) => x.state)).slice(0, 60);

    const hasFederalAlready = dbStates.some((s) =>
      s.toLowerCase().includes("federal") || s.toLowerCase().includes("nationwide")
    );

    f.states = hasFederalAlready ? dbStates : ["Federal (nationwide)", ...dbStates];
    f.agencies = clean(ag.data.map((x: any) => x.agency)).slice(0, 50);
    break;
  }

  if (f.states.length === 0) {
    f.states = ["Federal (nationwide)"];
  }

  return f;
}
