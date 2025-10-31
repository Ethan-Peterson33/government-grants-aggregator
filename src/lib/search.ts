import type { PostgrestError } from "@supabase/supabase-js";
import { shortId } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FacetSets, Grant, GrantFilters } from "@/lib/types";

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
  const hasApplyLink = filters.hasApplyLink === true;

  console.log("➡️ Final grant query filters", {
    sanitizedQuery,
    sanitizedCategory,
    sanitizedState,
    sanitizedCity,
    sanitizedAgency,
    hasApplyLink,
  });

  for (const table of TABLE_FALLBACK_ORDER) {
    let q = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order("scraped_at", { ascending: false })
      .range(from, to);

    if (sanitizedQuery)
      q = q.or(
        `(title.ilike.%${sanitizedQuery}%,summary.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%)`
      );
    if (sanitizedCategory) q = q.ilike("category", `%${sanitizedCategory}%`);
    if (sanitizedState) q = q.ilike("state", `%${sanitizedState}%`);
    if (sanitizedCity) q = q.ilike("city", `%${sanitizedCity}%`);
    if (sanitizedAgency) q = q.ilike("agency", `%${sanitizedAgency}%`);
    if (hasApplyLink) q = q.not("apply_link", "is", null);

    const { data, error, count } = (await q) as unknown as {
      data: Grant[] | null;
      error: PostgrestError | null;
      count: number | null;
    };

    if (error) {
      console.error("❌ Query failed:", error);
      break;
    }

    const grants = data ?? [];
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

export async function getGrantById(id: string): Promise<Grant | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  for (const table of TABLE_FALLBACK_ORDER) {
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
    if (data) return data;
  }

  return null;
}

export async function getGrantByShortId(short: string): Promise<Grant | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const target = short.trim().toLowerCase();
  if (!target) return null;

  for (const table of TABLE_FALLBACK_ORDER) {
    const { data, error } = (await supabase
      .from(table)
      .select("*")
      .order("scraped_at", { ascending: false })
      .limit(100)) as unknown as {
      data: Grant[] | null;
      error: PostgrestError | null;
    };

    if (error) {
      console.error("❌ getGrantByShortId error:", error);
      continue;
    }

    const grants = data ?? [];
    const match = grants.find((grant) => shortId(grant.id) === target);
    if (match) return match;
  }

  return null;
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
