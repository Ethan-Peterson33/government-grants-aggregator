import type { PostgrestError } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FacetSets, Grant, GrantFilters } from "@/lib/types";

const preferLatestView = process.env.NEXT_PUBLIC_USE_LATEST_VIEW !== "false";
const TABLE_FALLBACK_ORDER: readonly string[] = preferLatestView
  ? ["latest_grants", "grants"]
  : ["grants"];

function isMissingRelation(error: PostgrestError | null): boolean {
  return Boolean(error && (error.code === "42P01" || /does not exist/i.test(error.message)));
}

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

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function searchGrants(filters: GrantFilters = {}): Promise<SearchResult> {
  const supabase = createServerSupabaseClient();
  if (!supabase)
    return { grants: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE, totalPages: 0 };

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, filters.pageSize))
    : DEFAULT_PAGE_SIZE;
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

  for (const table of TABLE_FALLBACK_ORDER) {
    let q = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order("scraped_at", { ascending: false })
      .range(from, to);

    if (sanitizedQuery) {
      q = q.or(
        `title.ilike.%${sanitizedQuery}%,summary.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`
      );
    }
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
      if (table === "latest_grants" && isMissingRelation(error)) continue;
      console.error("❌ Query failed:", error);
      break;
    }

    const grants = data ?? [];
    const total = count ?? grants.length;
    return { grants, total, page, pageSize, totalPages: total ? Math.ceil(total / pageSize) : 0 };
  }

  return { grants: [], total: 0, page, pageSize, totalPages: 0 };
}

export async function getGrantById(id: string): Promise<Grant | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  for (const t of TABLE_FALLBACK_ORDER) {
    const { data, error } = (await supabase.from(t).select("*").eq("id", id).maybeSingle()) as unknown as {
      data: Grant | null;
      error: PostgrestError | null;
    };
    if (error) {
      if (t === "latest_grants" && isMissingRelation(error)) continue;
      console.error("❌ getGrantById error:", error);
      break;
    }
    if (data) return data;
  }
  return null;
}

export async function getFacetSets(): Promise<FacetSets> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return { categories: [], states: [], agencies: [] };

  const f: FacetSets = { categories: [], states: [], agencies: [] };
  const clean = (vals: (string | null)[]) =>
    [...new Set(vals.filter((v): v is string => !!v && v.trim().length > 0))].sort();

  for (const t of TABLE_FALLBACK_ORDER) {
    const [cat, st, ag] = (await Promise.all([
      supabase.from(t).select("category").limit(500),
      supabase.from(t).select("state").limit(200),
      supabase.from(t).select("agency").limit(500),
    ])) as any;

    const errors = [cat.error, st.error, ag.error].filter(Boolean) as PostgrestError[];
    if (errors.length) {
      if (t === "latest_grants" && errors.every((err) => isMissingRelation(err))) continue;
      console.error("❌ facet query failed", errors[0]);
      continue;
    }

    f.categories = clean(cat.data.map((x: any) => x.category)).slice(0, 50);
    f.states = clean(st.data.map((x: any) => x.state)).slice(0, 60);
    f.agencies = clean(ag.data.map((x: any) => x.agency)).slice(0, 50);
    break;
  }

  return f;
}
