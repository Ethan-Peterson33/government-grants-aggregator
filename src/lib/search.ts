import type { PostgrestError } from "@supabase/supabase-js";
import { agencySlugCandidates, escapeIlike } from "@/lib/agency";
import {
  FEDERAL_STATE_LABELS,
  STATEWIDE_CITY_LABELS,
  findStateInfo,
  inferGrantLocation,
  isFederalStateValue,
  normalizeStateCode,
  resolveStateQueryValue,
  stateNameCandidatesFromCode,
} from "@/lib/grant-location";
import { deriveAgencySlug } from "@/lib/slug";
import { slugify, wordsFromSlug } from "@/lib/strings";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FacetSets, FilterFacet, Grant, GrantFilters } from "@/lib/types";

const TABLE_FALLBACK_ORDER: readonly string[] = ["grants"];

type TableFeatures = {
  hasStateColumn?: boolean;
  hasCityColumn?: boolean;
  hasJurisdictionColumn?: boolean;
};

const TABLE_FEATURES: Record<string, TableFeatures> = {
  grants: { hasStateColumn: true, hasCityColumn: true, hasJurisdictionColumn: false },
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

/** ------------------------------------------------------------------
 *  MAIN SEARCH FUNCTION
 * -----------------------------------------------------------------*/
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
  const rawCategoryFilter = typeof filters.category === "string" ? filters.category.trim() : "";
  const slugCandidate = rawCategoryFilter ? slugify(rawCategoryFilter) : "";

  const rawStateFilter = typeof filters.state === "string" ? filters.state.trim() : "";
  const normalizedState = resolveStateQueryValue(rawStateFilter);
  const sanitizedState = like(normalizedState.value || filters.state);
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

  const stateCode = normalizeStateCode(
    filters.stateCode ?? normalizedState.code ?? normalizedState.value ?? undefined,
  );
  const hasApplyLink = filters.hasApplyLink === true;

  const isFederalStateFilter = normalizedState.jurisdiction === "federal";

  const jurisdiction = filters.jurisdiction ?? normalizedState.jurisdiction ?? undefined;

  /** ------------------------------
   * CATEGORY CODE RESOLUTION
   * ------------------------------*/
  let categoryCodes: string[] = [];
  const shouldFilterByCategory = rawCategoryFilter.length > 0;

  if (shouldFilterByCategory) {
    const slugFilters = Array.from(
      new Set(
        [slugCandidate, rawCategoryFilter.toLowerCase()]
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );

    if (slugFilters.length > 0) {
      const { data: slugMatches } = await supabase
        .from("grant_categories")
        .select("category_code")
        .in("slug", slugFilters)
        .limit(25);

      categoryCodes = (slugMatches ?? [])
        .map((entry) => entry?.category_code)
        .filter((code): code is string => typeof code === "string" && code.trim().length > 0);
    }

    if (categoryCodes.length === 0) {
      const pattern = `%${escapeIlike(rawCategoryFilter)}%`;
      const { data } = await supabase
        .from("grant_categories")
        .select("category_code")
        .ilike("category_label", pattern);

      categoryCodes = (data ?? [])
        .map((c) => c?.category_code)
        .filter((code): code is string => typeof code === "string" && code.trim().length > 0);
    }
  }

  console.log("➡️ Final grant query filters", {
    sanitizedQuery,
    categoryFilter: rawCategoryFilter,
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
    categoryCodes,
  });

  /** ------------------------------------------------------------------
   *  EXECUTION LOOP (only one table today)
   * -----------------------------------------------------------------*/
  for (const table of TABLE_FALLBACK_ORDER) {
    const { hasStateColumn = false, hasCityColumn = false } = TABLE_FEATURES[table] ?? {};

    /** ------------------------------
     * STATE CLAUSES
     * ------------------------------*/
    const stateClauses: string[] = [];

    if (stateCode && hasStateColumn) {
      const candidates = new Set<string>([stateCode, ...stateNameCandidatesFromCode(stateCode)]);
      for (const candidate of candidates) {
        const sanitized = escapeIlike(candidate);
        stateClauses.push(`state.ilike.%${sanitized}%`);
      }
    } else if (sanitizedState && !isFederalStateFilter && hasStateColumn) {
      stateClauses.push(`state.ilike.%${sanitizedState}%`);
    }

    /** ------------------------------
     * BUILD BASE QUERY (q created FIRST!)
     * ------------------------------*/
    let q = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order("scraped_at", { ascending: false })
      .range(from, to);

    /** ------------------------------------------------------------------
     *  NOW we can safely define applyStateClauses()
     * -----------------------------------------------------------------*/
    const applyStateClauses = () => {
      if (stateClauses.length === 0) return;
      console.log("🌎 State filter:", { table, stateCode, clauses: stateClauses });
      q = q.or(stateClauses.join(","));
    };

    /** ------------------------------
     * KEYWORD SEARCH
     * ------------------------------*/
    if (sanitizedQuery) {
      const queryOrClauses = ["title", "summary", "description"].map(
        (field) => `${field}.ilike.%${sanitizedQuery}%`
      );
      q = q.or(queryOrClauses.join(","));
    }

    /** ------------------------------
     * CATEGORY FILTER
     * ------------------------------*/
    if (shouldFilterByCategory) {
      if (categoryCodes.length > 0) {
        q = q.in("category_code", categoryCodes);
      } else {
        q = q.eq("category_code", "__none__"); // forces no results
      }
    }

    /** ------------------------------
     * CITY FILTER
     * ------------------------------*/
    if (sanitizedCity && hasCityColumn) {
      q = q.ilike("city", `%${sanitizedCity}%`);
    }

    /** ------------------------------
     * AGENCY FILTERS
     * ------------------------------*/
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
        const frag = escapeIlike(slugCandidates.nameFragment);
        agencyClauses.push(`agency_name.ilike.%${frag}%`);
        agencyClauses.push(`agency.ilike.%${frag}%`);
      }
    }

    if (agencyClauses.length > 0) {
      q = q.or(agencyClauses.join(","));
    }

    /** ------------------------------
     * APPLY LINK FILTER
     * ------------------------------*/
    if (hasApplyLink) {
      q = q.not("apply_link", "is", null);
    }

    /** ------------------------------------------------------------------
     * JURISDICTION FILTERS (CLEAN + NON-DUPLICATE)
     * -----------------------------------------------------------------*/

    /** ---------- FEDERAL ----------*/
    if (jurisdiction === "federal") {
      const orClauses: string[] = [
        "state.is.null",
        "state.eq.''",
        "type.eq.federal",
        "type.ilike.federal",
        "base_type.eq.federal",
        "base_type.ilike.federal",
      ];

      for (const label of FEDERAL_STATE_LABELS) {
        orClauses.push(`state.ilike.%${escapeIlike(label)}%`);
      }

      q = q.or(orClauses.join(","));
    }

  
/** ---------- SIMPLE STATE FILTER (include ALL grants in that state) ---------- */
else if (jurisdiction === "state" && hasStateColumn) {
  if (stateClauses.length === 0) {
    // No valid state filter → nothing to apply
    continue;
  }

  console.log("🗺️ Applying simple state filter (include ALL grants with this state)", {
    table,
    clauses: stateClauses,
  });

  // Just match the state. No city filters at all.
  q = q.or(stateClauses.join(","));
}



    /** ---------- LOCAL ----------*/
    else if (jurisdiction === "local" && hasCityColumn) {
      applyStateClauses();
      q = q.not("city", "is", null).not("city", "eq", "");
      for (const label of STATEWIDE_CITY_LABELS) {
        q = q.not("city", "ilike", `%${escapeIlike(label)}%`);
      }
    }

    /** ---------- NO JURISDICTION FILTER ----------*/
    else {
      applyStateClauses();
    }

    console.log("🧩 Query snapshot:", {
      jurisdiction,
      queryObject: q,
    });

    /** ------------------------------------------------------------------
     * EXECUTE SUPABASE QUERY
     * -----------------------------------------------------------------*/
    const { data, error, count } = (await q) as unknown as {
      data: Grant[] | null;
      error: PostgrestError | null;
      count: number | null;
    };

    if (error) {
      console.error("❌ Query failed:", error);
      break;
    }

    /** Transform results (slug fallback) */
    const grants = (data ?? []).map((grant) => {
      const agencyName = grant.agency_name ?? grant.agency ?? null;
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
      };
    });

    const total = count ?? grants.length;

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

/** ------------------------------------------------------------------
 * LOCAL FILTERING HELPERS (unchanged)
 * -----------------------------------------------------------------*/
const toComparable = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
const textIncludes = (text: string | null | undefined, keyword: string) =>
  toComparable(text).includes(keyword);

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

/** ------------------------------------------------------------------
 * FACET SETS
 * -----------------------------------------------------------------*/
export async function getFacetSets(): Promise<FacetSets> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return { categories: [], states: [], agencies: [] };

  const f: FacetSets = { categories: [], states: [], agencies: [] };

  const toStateFacet = (state: string, count: number): FilterFacet | null => {
    const trimmed = state.trim();
    if (!trimmed) return null;

    const info = findStateInfo(trimmed);
    const slugLabel = wordsFromSlug(slugify(trimmed) ?? trimmed) || trimmed;
    const label = info?.name ?? slugLabel;
    const value = info?.code ?? trimmed;

    if (!label || !value) return null;
    return { label, value, grantCount: count };
  };

  const ensureFederalFacet = async (existing: FilterFacet[]): Promise<FilterFacet[]> => {
    const hasFederal = existing.some((facet) => isFederalStateValue(facet.label));
    if (hasFederal) return existing;

    const federalClauses = [
      "state.is.null",
      "state.eq.''",
      "type.eq.federal",
      "type.ilike.federal",
      "base_type.eq.federal",
      "base_type.ilike.federal",
    ];
    for (const label of FEDERAL_STATE_LABELS) {
      federalClauses.push(`state.ilike.%${escapeIlike(label)}%`);
    }

    const { count } = await supabase
      .from("grants")
      .select("id", { count: "exact", head: true })
      .or(federalClauses.join(","));

    return [
      { label: "Federal (nationwide)", value: "Federal (nationwide)", grantCount: count ?? 0 },
      ...existing,
    ];
  };

  try {
    const [cat, st, ag] = await Promise.all([
      supabase.rpc("categories_with_counts"),
      supabase.from("grants").select("state"),
      supabase.from("grants").select("agency"),
    ]);

    const { data: categoryData } = cat as unknown as {
      data: { slug: string | null; category_label: string | null; grant_count: number | null }[] | null;
    };

    if (Array.isArray(categoryData)) {
      f.categories = categoryData
        .filter(
          (item): item is {
            slug: string;
            category_label: string;
            grant_count: number;
          } =>
            typeof item?.slug === "string" &&
            item.slug.trim().length > 0 &&
            typeof item?.category_label === "string" &&
            item.category_label.trim().length > 0 &&
            typeof item?.grant_count === "number" &&
            item.grant_count > 0,
        )
        .map((item) => ({
          slug: item.slug.trim(),
          label: item.category_label.trim(),
          grantCount: item.grant_count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
        .slice(0, 100);
    }

    const { data: stateData } = st as unknown as {
      data: { state: string | null }[] | null;
    };

    const { data: agencyData } = ag as unknown as {
      data: { agency: string | null }[] | null;
    };

    /** Compute state facets */
    const stateAccumulator = new Map<string, FilterFacet>();

    if (Array.isArray(stateData)) {
      for (const entry of stateData) {
        if (typeof entry?.state !== "string") continue;
        const facet = toStateFacet(entry.state, 1);
        if (!facet) continue;

        const existing = stateAccumulator.get(facet.value);
        if (existing) existing.grantCount += 1;
        else stateAccumulator.set(facet.value, { ...facet });
      }
    }

    /** Compute agency facets */
    const agencyAccumulator = new Map<string, FilterFacet>();

    if (Array.isArray(agencyData)) {
      for (const entry of agencyData) {
        const label = typeof entry?.agency === "string" ? entry.agency.trim() : "";
        if (!label) continue;
        const existing = agencyAccumulator.get(label);
        if (existing) existing.grantCount += 1;
        else agencyAccumulator.set(label, { label, value: label, grantCount: 1 });
      }
    }

    const sortedStates = Array.from(stateAccumulator.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
    const sortedAgencies = Array.from(agencyAccumulator.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );

    f.states = await ensureFederalFacet(sortedStates);
    f.agencies = sortedAgencies.slice(0, 150);
  } catch (err) {
    console.error("❌ Facet load error:", err);
  }

  if (f.states.length === 0) {
    f.states = [
      {
        label: "Federal (nationwide)",
        value: "Federal (nationwide)",
        grantCount: 0,
      },
    ];
  }

  return f;
}

/** ------------------------------------------------------------------
 * GET GRANT BY ID
 * -----------------------------------------------------------------*/
export async function getGrantById(id: string): Promise<Grant | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const isUuid = (value: string) => UUID_PATTERN.test(value);

  const normalizeGrantId = (rawId: string): string | null => {
    if (!rawId) return null;
    const cleaned = rawId.replace(/-\d+$/, "");
    return isUuid(cleaned) ? cleaned : null;
  };

  const normalizedId = normalizeGrantId(id);
  if (!normalizedId) {
    return await getGrantByShortId(id.split("-")[0]);
  }

  const { data, error } = (await supabase
    .from("grants")
    .select("*")
    .eq("id", normalizedId)
    .maybeSingle()) as unknown as {
    data: Grant | null;
    error: PostgrestError | null;
  };

  if (error) {
    if (error.code === "22P02") {
      return await getGrantByShortId(id.split("-")[0]);
    }
    return null;
  }

  return data ?? null;
}

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

  if (error) return null;

  return data ?? null;
}
