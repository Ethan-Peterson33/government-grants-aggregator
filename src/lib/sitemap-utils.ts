// lib/sitemap-utils.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { grantSlug, deriveAgencySlug, grantPath } from "@/lib/slug";
import type { Grant, Agency } from "@/lib/types";

export async function getAllGrantPaths(): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error("Supabase client unavailable for sitemap slug generation");
    return [];
  }

  const { data, error } = await supabase
    .from("grants")
    .select("id, title, category, state, city")
    .neq("id", null);

  if (error) {
    console.error("Error fetching grant slugs for sitemap:", error);
    return [];
  }

  return (data ?? []).map(grant => {
    // build the relative path using your logic
    const path = grantPath({
      id: grant.id,
      title: grant.title,
      category: grant.category,
      state: grant.state,
      city: grant.city
    });
    // grantPath returns full path with query id; we can strip query if desired
    // or keep it if your site uses it and you want it indexed.
    return path;
  });
}

export async function getAllAgencyPaths(): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error("Supabase client unavailable for sitemap slug generation");
    return [];
  }

  const { data, error } = await supabase
    .from("agency")
    .select("agency_name, agency_code, slug")
    .neq("agency_name", null);

  if (error) {
    console.error("Error fetching agency slugs for sitemap:", error);
    return [];
  }

  return (data ?? []).map(a => {
    const slug = deriveAgencySlug({
      slug: a.slug,
      agency_code: a.agency_code,
      agency_name: a.agency_name,
      agency: undefined
    });
    return `/agencies/${slug}`;
  });
}
