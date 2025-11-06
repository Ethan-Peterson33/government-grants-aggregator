import type { PostgrestError } from "@supabase/supabase-js";
import {
  FEDERAL_STATE_LABELS,
  STATEWIDE_CITY_LABELS,
  inferGrantLocation,
  normalizeStateCode,
  stateNameCandidatesFromCode,
} from "@/lib/grant-location";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FacetSets, Grant, GrantFilters } from "@/lib/types";
import { slugify } from "@/lib/strings";

const TABLE_FALLBACK_ORDER: readonly string[] = ["grants"];

function escapeIlike(value: string): string {
  return value.replace(/[%_]/g, (m) => `\\${m}`).replace(/'/g, "''");
}

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
  const sanitizedState = like(filters.state);
  const sanitizedCity = like(filters.city);
  const sanitizedAgency = like(filters.agency);
  const sanitizedAgencySlug =
    typeof filters.agencySlug === "string" && filters.agencySlug.trim().length > 0
      ? filters.agencySlug.trim().toLowerCase()
      : undefined;
  const stateCode = normalizeStateCode(filters.stateCode ?? undefined);
  const hasApplyLink = filters.hasApplyLink === true;

  const hasExplicitLocationFilter = Boolean(stateCode || sanitizedState || sanitizedCity);
  const jurisdiction = filters.jurisdiction ?? undefined;

  console.log("➡️ Final grant query filters", {
    sanitizedQuery,
    sanitizedCategory,
    sanitizedState,
    sanitizedCity,
    sanitizedAgency,
    sanitizedAgencySlug,
    stateCode,
    jurisdiction: jurisdiction ?? "all",
    hasApplyLink,
    hasExplicitLocationFilter,
    page,
    pageSize,
    range: { from, to },
  });

  for (const table of TABLE_FALLBACK_ORDER) {
    let q = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order("scraped_at", { ascending: false })
      .range(from, to);

    if (sanitizedQuery) {
      const queryOrClauses = ["title", "summary", "description"].map(
        (field) => `${field}.ilike.%${sanitizedQuery}%`
      );
      console.log("🔎 Applying keyword search across fields", {
        table,
        clauses: queryOrClauses,
      });
      q = q.or(queryOrClauses.join(","));
    }
    if (sanitizedCategory) q = q.ilike("category", `%${sanitizedCategory}%`);

    if (stateCode) {
      const candidateClauses = stateNameCandidatesFromCode(stateCode).map(
        (candidate) => `state.ilike.%${escapeIlike(candidate)}%`
      );
      const clauses = candidateClauses.length
        ? candidateClauses
        : [`state.ilike.%${escapeIlike(stateCode)}%`];
      console.log("🌎 Matching state code candidates", {
        table,
        stateCode,
        clauses,
      });
      q = q.or(clauses.join(","));
    } else if (sanitizedState) {
      console.log("🌎 Matching state fragment", {
        table,
        state: sanitizedState,
      });
      q = q.ilike("state", `%${sanitizedState}%`);
    }

    if (sanitizedCity) {
      console.log("🏙️ Matching city fragment", { table, city: sanitizedCity });
      q = q.ilike("city", `%${sanitizedCity}%`);
    }
    if (sanitizedAgency) {
      console.log("🏢 Matching agency fragment", { table, agency: sanitizedAgency });
      q = q.ilike("agency", `%${sanitizedAgency}%`);
    }
    if (sanitizedAgencySlug) {
      console.log("🏢 Matching agency slug", { table, agency_slug: sanitizedAgencySlug });
      q = q.eq("agency_slug", sanitizedAgencySlug);
    }
    if (hasApplyLink) {
      console.log("📝 Filtering to grants with application links", { table });
      q = q.not("apply_link", "is", null);
    }

    if (jurisdiction === "federal") {
      const orClauses = ["state.is.null"];
      for (const label of FEDERAL_STATE_LABELS) {
        const sanitizedLabel = escapeIlike(label);
        orClauses.push(`state.ilike.%${sanitizedLabel}%`);
      }
      console.log("🏛️ Applying federal jurisdiction filter", {
        table,
        clauses: orClauses,
      });
      q = q.or(orClauses.join(","));
    } else if (jurisdiction === "state") {
      const cityClauses = ["city.is.null"];
      for (const label of STATEWIDE_CITY_LABELS) {
        const sanitizedLabel = escapeIlike(label);
        cityClauses.push(`city.ilike.%${sanitizedLabel}%`);
      }
      console.log("🗺️ Applying state jurisdiction filter", {
        table,
        clauses: cityClauses,
      });
      q = q.or(cityClauses.join(","));
    } else if (jurisdiction === "local") {
      console.log("🏘️ Applying local jurisdiction filter", { table });
      q = q.not("city", "is", null).not("city", "eq", "");
      for (const label of STATEWIDE_CITY_LABELS) {
        q = q.not("city", "ilike", `%${escapeIlike(label)}%`);
      }
    }

    const { data, error, count } = (await q) as unknown as {
      data: Grant[] | null;
      error: PostgrestError | null;
      count: number | null;
    };

    if (error) {
      console.error("❌ Query failed:", error);
      break;
    }

    const grants = (data ?? []).map((grant) => {
      const agencyName = grant.agency_name ?? grant.agency ?? null;
      const categoryLabel = grant.category ?? grant.category_code ?? null;
      const fallbackSlug = agencyName ? slugify(agencyName) : "";
      return {
        ...grant,
        agency: agencyName,
        agency_name: agencyName,
        agency_slug: grant.agency_slug ?? (fallbackSlug ? fallbackSlug : null),
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
  if (state) {
    const grantState = toComparable(grant.state);
    if (!grantState || !grantState.includes(state)) return false;
  }

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

export async function getGrantById(id: string): Promise<Grant | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  console.log("🧾 getGrantById starting lookup", {
    id,
    supabaseClientReady: Boolean(supabase),
  });

  for (const table of TABLE_FALLBACK_ORDER) {
    console.log("📄 Querying table for grant", {
      table,
      id,
      timestamp: new Date().toISOString(),
    });
    const { data, error } = (await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle()) as unknown as {
      data: Grant | null;
      error: PostgrestError | null;
    };

    if (error) {
      console.error("❌ getGrantById error:", error);
      break;
    }
    if (data) {
      console.log("✅ getGrantById found grant", {
        table,
        id,
        keys: Object.keys(data ?? {}),
        titlePreview: data.title?.slice(0, 120) ?? null,
      });
      return data;
    }
    console.log("⚠️ getGrantById no result in table", {
      table,
      id,
      dataType: data === null ? "null" : typeof data,
    });
  }

  console.log("🚫 getGrantById grant not found", { id });
  return null;
}

export async function getGrantByShortId(short: string): Promise<Grant | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const target = short.trim().toLowerCase();
  if (!target) return null;

  // short === first UUID segment; match prefix with or without a hyphen.
  // Some grant IDs are bare UUIDs ("<short>-...") while others are custom
  // identifiers without a hyphen ("<short>"). We allow both by matching the
  // lowercase prefix regardless of what character follows it.
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
    f.states = clean(st.data.map((x: any) => x.state)).slice(0, 60);
    f.agencies = clean(ag.data.map((x: any) => x.agency)).slice(0, 50);
    break;
  }

  return f;
}
