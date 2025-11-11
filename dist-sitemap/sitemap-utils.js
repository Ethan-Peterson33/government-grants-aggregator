"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllGrantPaths = getAllGrantPaths;
exports.getAllAgencyPaths = getAllAgencyPaths;
// lib/sitemap-utils.ts
const server_1 = require("@/lib/supabase/server");
const slug_1 = require("@/lib/slug");
async function getAllGrantPaths() {
    const supabase = (0, server_1.createServerSupabaseClient)();
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
        const path = (0, slug_1.grantPath)({
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
async function getAllAgencyPaths() {
    const supabase = (0, server_1.createServerSupabaseClient)();
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
        const slug = (0, slug_1.deriveAgencySlug)({
            slug: a.slug,
            agency_code: a.agency_code,
            agency_name: a.agency_name,
            agency: undefined
        });
        return `/agencies/${slug}`;
    });
}
