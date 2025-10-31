import type { PostgrestError } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FacetSets, JobFilters, JobWithLocation } from "@/lib/types";

const preferLatestView = process.env.NEXT_PUBLIC_USE_LATEST_VIEW !== "false";
const TABLE_FALLBACK_ORDER: readonly string[] = preferLatestView
  ? ["latest_jobs", "jobs"]
  : ["jobs"];

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
  jobs: JobWithLocation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function searchJobs(filters: JobFilters = {}): Promise<SearchResult> {
  const supabase = createServerSupabaseClient();
  if (!supabase)
    return { jobs: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const like = (v?: string) =>
    typeof v === "string" && v.trim() ? escapeIlike(v.trim()) : undefined;
  const upper = (v?: string) =>
    typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined;

  const sanitizedQuery = like(filters.query);
  const sanitizedLocation = like(filters.location);
  const sanitizedCategory = like(filters.category);
  const normalizedType = upper(filters.type);
  const normalizedState = upper(filters.state);

  console.log("➡️ Final query filters", {
    sanitizedQuery,
    sanitizedLocation,
    sanitizedCategory,
    normalizedType,
    normalizedState,
  });

  for (const table of TABLE_FALLBACK_ORDER) {
    let q = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order("scraped_at", { ascending: false })
      .range(from, to);

    if (sanitizedQuery)
      q = q.or(`(title.ilike.%${sanitizedQuery}%,category.ilike.%${sanitizedQuery}%,department.ilike.%${sanitizedQuery}%,location.ilike.%${sanitizedQuery}%)`);
    if (sanitizedLocation) q = q.ilike("location", `%${sanitizedLocation}%`);
    if (sanitizedCategory) q = q.ilike("category", `%${sanitizedCategory}%`);
    if (normalizedType) q = q.ilike("employment_type", `%${normalizedType}%`);
    if (normalizedState) q = q.ilike("state", `%${normalizedState}%`);

    const { data, error, count } = (await q) as unknown as {
      data: JobWithLocation[] | null;
      error: PostgrestError | null;
      count: number | null;
    };

    if (error) {
      if (table === "latest_jobs" && isMissingRelation(error)) continue;
      console.error("❌ Query failed:", error);
      break;
    }

    const jobs = data ?? [];
    const total = count ?? jobs.length;
    return { jobs, total, page, pageSize, totalPages: total ? Math.ceil(total / pageSize) : 0 };
  }

  return { jobs: [], total: 0, page, pageSize, totalPages: 0 };
}

export async function getJobById(id: string): Promise<JobWithLocation | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  for (const t of TABLE_FALLBACK_ORDER) {
    const { data, error } = (await supabase.from(t).select("*").eq("id", id).maybeSingle()) as unknown as {
      data: JobWithLocation | null;
      error: PostgrestError | null;
    };
    if (error) {
      if (t === "latest_jobs" && isMissingRelation(error)) continue;
      console.error("❌ getJobById error:", error);
      break;
    }
    if (data) return data;
  }
  return null;
}

export async function getFacetSets(): Promise<FacetSets> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return { categories: [], locations: [], employmentTypes: [], states: [] };

  const f: FacetSets = { categories: [], locations: [], employmentTypes: [], states: [] };
const clean = (vals: (string | null)[]) =>
  [...new Set(vals.filter((v): v is string => !!v && v.trim().length > 0))].sort();

  for (const t of TABLE_FALLBACK_ORDER) {
    const [cat, loc, typ, st] = (await Promise.all([
      supabase.from(t).select("category").limit(500),
      supabase.from(t).select("location").limit(500),
      supabase.from(t).select("employment_type").limit(500),
      supabase.from(t).select("state").limit(100),
    ])) as any;

    if (cat.error || loc.error || typ.error || st.error) continue;

    f.categories = clean(cat.data.map((x: any) => x.category)).slice(0, 25);
    f.locations = clean(loc.data.map((x: any) => x.location)).slice(0, 25);
    f.employmentTypes = clean(typ.data.map((x: any) => x.employment_type)).slice(0, 10);
    f.states = clean(st.data.map((x: any) => x.state)).slice(0, 50);
    break;
  }

  return f;
}
