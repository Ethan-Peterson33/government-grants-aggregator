import type { PostgrestError } from "@supabase/supabase-js";
import { agencySlugCandidates, escapeIlike } from "@/lib/agency";
import {
  FEDERAL_STATE_LABELS,
  STATEWIDE_CITY_LABELS,
  findStateInfo,
  inferGrantLocation,
  isFederalStateValue,
  normalizeStateCode,
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
  const rawCategoryFilter =
    typeof filters.category === "string" ? filters.category.trim() : "";
  const slugCandidate = rawCategoryFilter ? slugify(rawCategoryFilter) : "";

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

  const stateCode = normalizeStateCode(filters.stateCode ?? filters.state ?? undefined);
  const hasApplyLink = filters.hasApplyLink === true;

  const stateLower = rawStateFilter.toLowerCase();
  const isFederalStateFilter =
    stateLower === "federal" ||
    stateLower === "federal (nationwide)" ||
    stateLower === "nationwide";

  let jurisdiction = filters.jurisdiction ?? undefined;
  if (!jurisdiction && isFederalStateFilter) {
    jurisdiction = "federal";
  }

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
      const { data: slugMatches, error: slugError } = await supabase
        .from("grant_categories")
        .select("category_code")
        .in("slug", slugFilters)
        .limit(25);

      if (slugError) {
        console.error("❌ Category slug lookup failed:", slugError);
      } else {
        categoryCodes = (slugMatches ?? [])
          .map((entry) => entry?.category_code)
          .filter((code): code is string => typeof code === "string" && code.trim().length > 0);
      }
    }

    if (categoryCodes.length === 0) {
      const pattern = `%${escapeIlike(rawCategoryFilter)}%`;
      console.log("🏷️ Falling back to label match for category filter:", pattern);
      const { data: matchingCategories, error: catErr } = await supabase
        .from("grant_categories")
        .select("category_code")
        .ilike("category_label", pattern);

      if (catErr) {
        console.error("❌ Category label lookup failed:", catErr);
      } else {
        categoryCodes = (matchingCategories ?? [])
          .map((c) => c?.category_code)
          .filter((code): code is string => typeof code === "string" && code.trim().length > 0);
      }
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

  for (const table of TABLE_FALLBACK_ORDER) {
    const { hasStateColumn = false, hasCityColumn = false } = TABLE_FEATURES[table] ?? {};

    // 🧩 Base query
    let q = supabase
      .from(table)
      .select("*", { count: "exact" })
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

    /** Category filter */
    if (shouldFilterByCategory) {
      if (categoryCodes.length > 0) {
        console.log("📊 Applying category codes filter", categoryCodes);
        q = q.in("category_code", categoryCodes);
      } else {
        console.log("🚫 No matching category codes found for", rawCategoryFilter);
        q = q.eq("category_code", "__none__");
      }
    }

    /** State filter */
    if (stateCode && hasStateColumn) {
      const candidates = new Set<string>([stateCode, ...stateNameCandidatesFromCode(stateCode)]);
      const clauses = Array.from(candidates).map((candidate) => {
        const sanitized = escapeIlike(candidate);
        return `state.ilike.%${sanitized}%`;
      });

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

    /** Agency filters */
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
    if (jurisdiction === "federal") {
      const orClauses: string[] = [];

      if (hasStateColumn) {
        orClauses.push("state.is.null", "state.eq.''");
        for (const label of FEDERAL_STATE_LABELS) {
          const sanitizedLabel = escapeIlike(label);
          orClauses.push(`state.ilike.%${sanitizedLabel}%`);
        }
      }

      if (TABLE_FEATURES[table]?.hasJurisdictionColumn) {
        orClauses.push("jurisdiction.eq.federal", "jurisdiction.ilike.federal");
      }

      if (orClauses.length > 0) {
        console.log("🏛️ Applying federal jurisdiction filter", { table, clauses: orClauses });
        q = q.or(orClauses.join(","));
      }
    } else if (jurisdiction === "state" && hasCityColumn) {
      if (TABLE_FEATURES[table]?.hasJurisdictionColumn) {
        q = q.eq("jurisdiction", "state");
      }

      const statewideCityClauses = ["city.is.null", "city.eq.''"];
      for (const label of STATEWIDE_CITY_LABELS) {
        statewideCityClauses.push(`city.ilike.%${escapeIlike(label)}%`);
      }

      console.log("🗺️ Applying state jurisdiction filter (statewide + unspecified cities)", {
        table,
        clauses: statewideCityClauses,
      });
      q = q.or(statewideCityClauses.join(","));
    } else if (jurisdiction === "local" && hasCityColumn) {
      if (TABLE_FEATURES[table]?.hasJurisdictionColumn) {
        q = q.eq("jurisdiction", "local");
      }

      console.log("🏘️ Applying local jurisdiction filter", { table });
      q = q.not("city", "is", null).not("city", "eq", "");
      for (const label of STATEWIDE_CITY_LABELS) {
        q = q.not("city", "ilike", `%${escapeIlike(label)}%`);
      }
    }

    console.log("🧩 Supabase query composition snapshot:", {
      categoryFilter: rawCategoryFilter,
      sanitizedState,
      sanitizedAgency,
      sanitizedCity,
      jurisdiction,
      page,
      range: { from, to },
      queryObject: q,
    });

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

/** Local filtering helpers (unchanged) */
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
/** Faceted data for filters */
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

    const federalClauses = ["state.is.null", "state.eq.''"];
    for (const label of FEDERAL_STATE_LABELS) {
      federalClauses.push(`state.ilike.%${escapeIlike(label)}%`);
    }

    const { count } = await supabase
      .from("grants")
      .select("id", { count: "exact", head: true })
      .or(federalClauses.join(","));

    const federalFacet: FilterFacet = {
      label: "Federal (nationwide)",
      value: "Federal (nationwide)",
      grantCount: count ?? 0,
    };

    return [federalFacet, ...existing];
  };

  try {
    const [cat, st, ag] = await Promise.all([
      supabase.rpc("categories_with_counts"),
      supabase.from("grants").select("state"),
      supabase.from("grants").select("agency"),
    ]);

    const { data: categoryData, error: categoryError } = cat as unknown as {
      data: { slug: string | null; category_label: string | null; grant_count: number | null }[] | null;
      error: PostgrestError | null;
    };

    if (categoryError) {
      console.warn("⚠️ categories_with_counts RPC failed", categoryError);
    } else if (Array.isArray(categoryData)) {
      f.categories = categoryData
        .filter(
          (item): item is { slug: string; category_label: string; grant_count: number } =>
            typeof item?.slug === "string" &&
            item.slug.trim().length > 0 &&
            typeof item?.category_label === "string" &&
            item.category_label.trim().length > 0 &&
            typeof item?.grant_count === "number" &&
            item?.grant_count > 0,
        )
        .map((item) => ({
          slug: item.slug.trim(),
          label: item.category_label.trim(),
          grantCount: item.grant_count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
        .slice(0, 100);
    }

    const { data: stateData, error: stateError } = st as unknown as {
      data: { state: string | null }[] | null;
      error: PostgrestError | null;
    };

    const { data: agencyData, error: agencyError } = ag as unknown as {
      data: { agency: string | null }[] | null;
      error: PostgrestError | null;
    };

    if (stateError || agencyError) {
      console.error("❌ facet query failed", stateError || agencyError);
      return f;
    }

    const stateAccumulator = new Map<string, FilterFacet>();
    if (Array.isArray(stateData)) {
      for (const entry of stateData) {
        if (typeof entry?.state !== "string") continue;
        const facet = toStateFacet(entry.state, 1);
        if (!facet) continue;
        const existing = stateAccumulator.get(facet.value);
        if (existing) {
          existing.grantCount += 1;
        } else {
          stateAccumulator.set(facet.value, { ...facet });
        }
      }
    }

    const agencyAccumulator = new Map<string, FilterFacet>();
    if (Array.isArray(agencyData)) {
      for (const entry of agencyData) {
        const label = typeof entry?.agency === "string" ? entry.agency.trim() : "";
        if (!label) continue;
        const value = label;
        const existing = agencyAccumulator.get(value);
        if (existing) {
          existing.grantCount += 1;
        } else {
          agencyAccumulator.set(value, { label, value, grantCount: 1 });
        }
      }
    }

    const dedupedStates = Array.from(stateAccumulator.values());
    const sortedStates = dedupedStates.sort((a, b) => a.label.localeCompare(b.label));
    const dedupedAgencies = Array.from(agencyAccumulator.values());
    const sortedAgencies = dedupedAgencies
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
      .slice(0, 150);

    const withFederal = await ensureFederalFacet(sortedStates);
    f.states = withFederal.sort((a, b) => a.label.localeCompare(b.label));
    f.agencies = sortedAgencies;
  } catch (err) {
    console.error("❌ Error loading facets:", err);
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

/** Get a single grant by ID, with UUID safety and short-ID fallback */
export async function getGrantById(id: string): Promise<Grant | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  // Normalize UUID vs short IDs
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
    console.warn("⚠️ Invalid UUID format passed to getGrantById:", id);
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
    console.error("❌ getGrantById error:", error);
    // Fallback for non-UUID IDs
    if (error.code === "22P02" || error.message?.includes("invalid input syntax for type uuid")) {
      return await getGrantByShortId(id.split("-")[0]);
    }
    return null;
  }

  return data ?? null;
}

/** Fallback: Get grant by short ID prefix */
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
