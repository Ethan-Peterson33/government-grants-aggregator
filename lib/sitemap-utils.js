// lib/sitemap-utils.js
const { createServerSupabaseClient } = require("../src/lib/supabase/server");
const { grantPath, deriveAgencySlug } = require("./slug");
const { normalizeStateCode } = require("./grant-location");
const { slugify } = require("./strings");

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.grantdirectory.org";

function createEntry(path, siteUrl, extra = {}) {
  const trimmedPath = typeof path === "string" && path.startsWith("/") ? path : `/${path}`;
  const baseUrl = (siteUrl || DEFAULT_SITE_URL).replace(/\/$/, "");
  return {
    path: trimmedPath,
    url: `${baseUrl}${trimmedPath}`,
    lastModified: new Date().toISOString(),
    ...extra,
  };
}

async function fetchCategoriesWithCounts() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error("[sitemap-utils] Supabase client unavailable for category sitemap generation");
    return [];
  }

  try {
    const { data, error } = await supabase.rpc("categories_with_counts");
    if (error) {
      console.error("[sitemap-utils] Error fetching categories for sitemap", error);
      return [];
    }

    if (!Array.isArray(data)) return [];

    return data
      .filter((item) =>
        typeof item?.slug === "string" &&
        item.slug.trim().length > 0 &&
        typeof item?.category_label === "string" &&
        item.category_label.trim().length > 0 &&
        typeof item?.grant_count === "number" &&
        item.grant_count > 0
      )
      .map((item) => ({
        slug: item.slug.trim(),
        label: item.category_label.trim(),
        grantCount: item.grant_count,
      }));
  } catch (error) {
    console.error("[sitemap-utils] Exception fetching categories for sitemap", error);
    return [];
  }
}

async function fetchStatesWithGrants() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error("[sitemap-utils] Supabase client unavailable for state sitemap generation");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("grants")
      .select("state")
      .eq("active", true)
      .not("state", "is", null)
      .neq("state", "")
      .order("state", { ascending: true });

    if (error) {
      console.error("[sitemap-utils] Error fetching states for sitemap", error);
      return [];
    }

    const uniqueStates = Array.from(
      new Set(
        (data ?? [])
          .map((row) => (typeof row?.state === "string" ? row.state.trim() : ""))
          .filter((value) => value.length > 0)
      )
    );

    return uniqueStates;
  } catch (error) {
    console.error("[sitemap-utils] Exception fetching states for sitemap", error);
    return [];
  }
}

async function fetchAgencyRecords() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error("[sitemap-utils] Supabase client unavailable for agency sitemap generation");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("agencies")
      .select("agency_name, agency_code")
      .not("agency_code", "is", null);

    if (error) {
      console.error("[sitemap-utils] Error fetching agencies for sitemap", error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[sitemap-utils] Exception fetching agencies for sitemap", error);
    return [];
  }
}

async function fetchGrantsForSitemap() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error("[sitemap-utils] Supabase client unavailable for grant sitemap generation");
    return [];
  }

  const pageSize = 1000;
  const grants = [];
  let from = 0;

  try {
    while (true) {
      const { data, error } = await supabase
        .from("grants")
        .select("id, title, category, state, city")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("[sitemap-utils] Error fetching grants for sitemap", error);
        break;
      }

      if (!Array.isArray(data) || data.length === 0) {
        console.log(
          "[sitemap-utils] Finished fetching grants for sitemap",
          `total=${grants.length}`
        );
        break;
      }

      grants.push(...data);

      console.log(
        "[sitemap-utils] Retrieved grant page",
        {
          page: Math.floor(from / pageSize) + 1,
          fetched: data.length,
          total: grants.length,
        }
      );

      if (data.length < pageSize) {
        console.log(
          "[sitemap-utils] Last grant page size below pageSize",
          {
            page: Math.floor(from / pageSize) + 1,
            fetched: data.length,
            total: grants.length,
          }
        );
        break;
      }

      from += pageSize;
    }
  } catch (error) {
    console.error("[sitemap-utils] Exception fetching grants for sitemap", error);
  }

  return grants;
}

function toStatePathSegment(state) {
  const normalized = normalizeStateCode(state);
  if (normalized) return normalized.toUpperCase();
  const slug = slugify(state || "");
  if (slug) return slug;
  const trimmed = typeof state === "string" ? state.trim() : "";
  return trimmed;
}

async function getGrantUrls(siteUrl = DEFAULT_SITE_URL) {
  const grants = await fetchGrantsForSitemap();
  if (!grants.length) return [];

  console.log("[sitemap-utils] Building grant sitemap entries", {
    grantCount: grants.length,
  });

  return grants
    .map((grant) => {
      try {
        const path = grantPath({
          id: grant.id,
          title: grant.title || "",
          category: grant.category || null,
          state: grant.state || null,
          city: grant.city || null,
        });
        if (!path || typeof path !== "string") return null;
        return createEntry(path, siteUrl, {
          changefreq: "daily",
          priority: 0.6,
        });
      } catch (error) {
        console.error("[sitemap-utils] Error creating grant sitemap entry", {
          grantId: grant?.id,
          error,
        });
        return null;
      }
    })
    .filter((entry) => Boolean(entry));
}

async function getAgencyUrls(siteUrl = DEFAULT_SITE_URL) {
  const agencies = await fetchAgencyRecords();
  if (!agencies.length) return [];

  return agencies
    .map((agency) => {
      const slug = deriveAgencySlug({
        slug: agency?.slug,
        agency_code: agency?.agency_code,
        agency_name: agency?.agency_name,
      });
      if (!slug) return null;
      return createEntry(`/agencies/${slug}`, siteUrl, {
        changefreq: "weekly",
        priority: 0.5,
      });
    })
    .filter((entry) => Boolean(entry));
}

async function getCategoryUrls(siteUrl = DEFAULT_SITE_URL) {
  const categories = await fetchCategoriesWithCounts();
  if (!categories.length) return [];

  return categories.map((category) =>
    createEntry(`/grants/category/${encodeURIComponent(category.slug)}`, siteUrl, {
      changefreq: "daily",
      priority: 0.6,
    })
  );
}

async function getStateUrls(siteUrl = DEFAULT_SITE_URL) {
  const states = await fetchStatesWithGrants();
  if (!states.length) return [];

  return states.map((state) =>
    createEntry(`/grants/state/${encodeURIComponent(toStatePathSegment(state))}`, siteUrl, {
      changefreq: "weekly",
      priority: 0.5,
    })
  );
}

function getStaticUrls(siteUrl = DEFAULT_SITE_URL) {
  return [
    createEntry("/faq", siteUrl, { changefreq: "weekly", priority: 0.6 }),
  ];
}

async function getAllSitemapUrls(siteUrl = DEFAULT_SITE_URL) {
  const [grantUrls, agencyUrls, categoryUrls, stateUrls] = await Promise.all([
    getGrantUrls(siteUrl),
    getAgencyUrls(siteUrl),
    getCategoryUrls(siteUrl),
    getStateUrls(siteUrl),
  ]);

  console.log("[sitemap-utils] Aggregated sitemap urls", {
    staticCount: getStaticUrls(siteUrl).length,
    grantCount: grantUrls.length,
    agencyCount: agencyUrls.length,
    categoryCount: categoryUrls.length,
    stateCount: stateUrls.length,
  });

  return [
    ...getStaticUrls(siteUrl),
    ...grantUrls,
    ...agencyUrls,
    ...categoryUrls,
    ...stateUrls,
  ];
}

async function getAllGrantPaths(siteUrl = DEFAULT_SITE_URL) {
  const grantUrls = await getGrantUrls(siteUrl);
  return grantUrls.map((entry) => entry.path);
}

async function getAllAgencyPaths(siteUrl = DEFAULT_SITE_URL) {
  const agencyUrls = await getAgencyUrls(siteUrl);
  return agencyUrls.map((entry) => entry.path);
}

module.exports = {
  createEntry,
  fetchCategoriesWithCounts,
  fetchStatesWithGrants,
  getGrantUrls,
  getAgencyUrls,
  getCategoryUrls,
  getStateUrls,
  getStaticUrls,
  getAllSitemapUrls,
  getAllGrantPaths,
  getAllAgencyPaths,
};
