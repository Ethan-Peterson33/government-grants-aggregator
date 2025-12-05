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
  grants: { hasStateColumn: true, hasCityColumn: true, hasJurisdictionColumn: true },
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

  // ⭐ IMPORTANT: Pre-escaped once, safely
  const sanitizedAgency = typeof filters.agency === "string"
    ? escapeIlike(filters.agency)
    : undefined;

  const sanitizedAgencySlug =
    typeof filters.agencySlug === "string" && filters.agencySlug.trim().length > 0
      ? filters.agencySlug.trim().toLowerCase()
      : undefined;

  const sanitizedAgencyCode =
    typeof filters.agencyCode === "string" && filters.agencyCode.trim().length > 0
      ? filters.agencyCode.trim()
      : undefined;

  const stateCode = normalizeStateCode(
    filters.stateCode ?? normalizedState.code ?? normalizedState.value ?? undefined
  );

  const hasApplyLink = filters.hasApplyLink === true;
  const jurisdiction = filters.jurisdiction ?? normalizedState.jurisdiction ?? undefined;
  const isFederalStateFilter = normalizedState.jurisdiction === "federal";

  /** CATEGORY LOOKUP **/
  let categoryCodes: string[] = [];
  const shouldFilterByCategory = rawCategoryFilter.length > 0;

  if (shouldFilterByCategory) {
    const slugFilters = Array.from(
      new Set([
        slugCandidate,
        rawCategoryFilter.toLowerCase(),
        slugCandidate.replace(/-grants?$/, ""),
      ])
    );

    const { data: slugMatches } = await supabase
      .from("grant_categories")
      .select("category_code")
      .in("slug", slugFilters);

    categoryCodes = (slugMatches ?? [])
      .map((x) => x?.category_code)
      .filter((x): x is string => typeof x === "string" && x.length > 0);

    if (categoryCodes.length === 0) {
      const pattern = `%${escapeIlike(rawCategoryFilter)}%`;
      const { data } = await supabase
        .from("grant_categories")
        .select("category_code")
        .ilike("category_label", pattern);

      categoryCodes = (data ?? [])
        .map((x) => x?.category_code)
        .filter((x): x is string => typeof x === "string" && x.length > 0);
    }
  }

  console.log("➡️ Final grant query filters", {
    sanitizedQuery,
    sanitizedAgency,
    sanitizedAgencySlug,
    sanitizedAgencyCode,
    sanitizedState,
    sanitizedCity,
    categoryCodes,
    jurisdiction: jurisdiction ?? "all",
    hasApplyLink,
    page,
    pageSize,
  });

  /** ----------------------------------------------
   * EXECUTION LOOP (only "grants" today)
   * ---------------------------------------------*/
  for (const table of TABLE_FALLBACK_ORDER) {
    const { hasStateColumn = true, hasCityColumn = true } = TABLE_FEATURES[table];

    /** -------------------- Base Query -------------------- */
    let q = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order("scraped_at", { ascending: false })
      .range(from, to);

    /** -------------------- Keyword Search -------------------- */
    if (sanitizedQuery) {
      const clauses = [
        `title.ilike.%${sanitizedQuery}%`,
        `summary.ilike.%${sanitizedQuery}%`,
        `description.ilike.%${sanitizedQuery}%`,
      ];
      q = q.or(clauses.join(","));
    }

    /** -------------------- Category Filter -------------------- */
    if (shouldFilterByCategory) {
      q = categoryCodes.length > 0
        ? q.in("category_code", categoryCodes)
        : q.eq("category_code", "__none__"); // no results fallback
    }

    /** -------------------- City Filter -------------------- */
    if (sanitizedCity && hasCityColumn && jurisdiction !== "private") {
      q = q.ilike("city", `%${sanitizedCity}%`);
    }

    /** ======================================================
     *              ⭐⭐⭐ AGENCY FILTERS ⭐⭐⭐
     * ======================================================*/

    // 1. Filters from text name
    if (sanitizedAgency) {
      const esc = escapeIlike(sanitizedAgency);
      q = q.or(`agency.ilike.%${esc}%,agency_name.ilike.%${esc}%`);
    }

    // 2. Filters from numeric/code/slug-like code
    if (sanitizedAgencyCode) {
      const { codeCandidates } = agencySlugCandidates(sanitizedAgencyCode);
      for (const code of codeCandidates) {
        const esc = escapeIlike(code);
        q = q.or(`agency_code.ilike.%${esc}%`);
      }
    }

    // 3. Filters from agency slug → codes + name fragments
    if (sanitizedAgencySlug) {
      const { codeCandidates, nameFragment } =
        agencySlugCandidates(sanitizedAgencySlug);

      for (const code of codeCandidates) {
        const esc = escapeIlike(code);
        q = q.or(`agency_code.ilike.%${esc}%`);
      }

      if (nameFragment) {
        const esc = escapeIlike(nameFragment);
        q = q.or(`agency_name.ilike.%${esc}%,agency.ilike.%${esc}%`);
      }
    }

    /** -------------------- Apply Link Filter -------------------- */
    if (hasApplyLink) {
      q = q.not("apply_link", "is", null);
    }

    /** -------------------- Jurisdiction Filters -------------------- */
    const stateClauses: string[] = [];

    if (stateCode && hasStateColumn) {
      for (const candidate of [stateCode, ...stateNameCandidatesFromCode(stateCode)]) {
        stateClauses.push(`state.ilike.%${escapeIlike(candidate)}%`);
      }
    } else if (sanitizedState && !isFederalStateFilter && hasStateColumn) {
      stateClauses.push(`state.ilike.%${sanitizedState}%`);
    }

    const applyStateClauses = () => {
      if (stateClauses.length > 0) {
        q = q.or(stateClauses.join(","));
      }
    };

    if (jurisdiction === "federal") {
      const fed = [
        "state.is.null",
        "state.eq.''",
        "type.eq.federal",
        "type.ilike.federal",
      ];
      for (const lbl of FEDERAL_STATE_LABELS) {
        fed.push(`state.ilike.%${escapeIlike(lbl)}%`);
      }
      q = q.or(fed.join(","));
    } else if (jurisdiction === "state") {
      if (stateClauses.length > 0) {
        q = q.or(stateClauses.join(","));
      }
    } else if (jurisdiction === "local") {
      applyStateClauses();
      q = q.not("city", "is", null).not("city", "eq", "");
    } else if (jurisdiction === "private") {
      q = q.eq("jurisdiction", "private");
    } else {
      applyStateClauses();
    }

    /** -------------------- Execute Query -------------------- */
    const { data, count, error } = (await q) as {
      data: Grant[] | null;
      count: number | null;
      error: PostgrestError | null;
    };

    if (error) {
      console.error("❌ Query failed:", error);
      break;
    }

    const grants = (data ?? []).map((grant) => {
      const agencyName = grant.agency_name ?? grant.agency ?? null;
      const fallbackSlug = deriveAgencySlug({
        slug: grant.agency_slug ?? undefined,
        agency_code: grant.agency_code ?? undefined,
        agency_name: agencyName,
      });
      return {
        ...grant,
        agency: agencyName,
        agency_name: agencyName,
        agency_slug: fallbackSlug || null,
      };
    });

    return {
      grants,
      total: count ?? grants.length,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
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

  // Normalize jurisdiction (new fields only!)
  const normalizedJurisdiction = (grant.jurisdiction || grant.type || "").toLowerCase().trim();

  const location = inferGrantLocation(grant);
  const filterStateCode = normalizeStateCode(filters.stateCode ?? undefined);

  // Private filter: must match exactly
  if (filters.jurisdiction === "private") {
    if (normalizedJurisdiction !== "private" && location.jurisdiction !== "private") return false;
  }

  // State code filter
  if (filterStateCode) {
    // Exclude federal/private
    if (location.jurisdiction === "federal" || location.jurisdiction === "private") return false;
    if (location.stateCode.toUpperCase() !== filterStateCode) return false;
  }

  // Direct jurisdiction filter
  if (filters.jurisdiction && location.jurisdiction !== filters.jurisdiction) return false;

  // State filter
  const state = toComparable(filters.state);
  if (state && !textIncludes(grant.state, state)) return false;

  // City filter
  const cityFilter = toComparable(filters.city);
  if (cityFilter && !textIncludes(grant.city, cityFilter)) return false;

  // Agency filter
  const agency = toComparable(filters.agency);
  if (agency && !textIncludes(grant.agency, agency)) return false;

  // Apply-link filter
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
  const cleaned = rawId.trim();
  return UUID_PATTERN.test(cleaned) ? cleaned : null;
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
