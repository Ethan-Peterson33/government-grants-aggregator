// lib/sitemap-utils.js
const { createServerSupabaseClient } = require("../src/lib/supabase/server");
const { grantPath, deriveAgencySlug } = require("./slug");
const {
  normalizeStateCode,
  isFederalStateValue,
  findStateInfo,
  FEDERAL_STATE_LABELS,
} = require("./grant-location");
const { slugify, wordsFromSlug } = require("./strings");

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.grantdirectory.org";
const PRIVATE_JURISDICTION = "private";
const FEDERAL_JURISDICTION = "federal";
const PRIVATE_MATCHER_CLAUSE = [
  "type.eq.private",
  "type.ilike.%private%",
  "base_type.eq.private",
  "base_type.ilike.%private%",
].join(",");

function escapeIlike(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[%_]/g, (match) => `\\${match}`).replace(/'/g, "''");
}

function buildFederalMatcherClause() {
  const clauses = [
    "state.is.null",
    "state.eq.''",
    "type.eq.federal",
    "type.ilike.%federal%",
    "base_type.eq.federal",
    "base_type.ilike.%federal%",
  ];

  for (const label of FEDERAL_STATE_LABELS) {
    const sanitized = escapeIlike(label);
    if (!sanitized) continue;
    clauses.push(`state.ilike.%${sanitized}%`);
  }

  return clauses.join(",");
}

const FEDERAL_MATCHER_CLAUSE = buildFederalMatcherClause();

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

function buildStateFilterCandidates(stateValue) {
  const candidates = new Set();
  const raw = typeof stateValue === "string" ? stateValue.trim() : "";
  if (!raw) return [];

  const stateInfo = findStateInfo(raw);
  const normalizedCode = normalizeStateCode(raw) || stateInfo?.code || null;

  const addCandidate = (value) => {
    if (!value || typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    candidates.add(trimmed);
    candidates.add(trimmed.toUpperCase());
    candidates.add(trimmed.toLowerCase());
  };

  addCandidate(raw);
  if (normalizedCode) addCandidate(normalizedCode);
  if (stateInfo?.name) addCandidate(stateInfo.name);

  return Array.from(candidates).filter(Boolean);
}

function toStateFacet(stateValue) {
  const raw = typeof stateValue === "string" ? stateValue.trim() : "";
  if (!raw) return null;
  if (isFederalStateValue(raw)) return null;

  const stateInfo = findStateInfo(raw);
  const slugCandidate = slugify(raw);
  const label = stateInfo?.name ?? wordsFromSlug(slugCandidate || raw) ?? raw;
  if (!label || isFederalStateValue(label)) return null;

  const codeCandidate = stateInfo?.code ?? normalizeStateCode(raw);
  if (!codeCandidate) return null;

  return {
    code: codeCandidate.toUpperCase(),
    label,
    grantCount: 1,
  };
}

function aggregateStateFacetsFromSource(sourceEntries) {
  const stateAccumulator = new Map();

  for (const entry of sourceEntries ?? []) {
    const rawState =
      typeof entry === "string"
        ? entry
        : typeof entry?.state === "string"
        ? entry.state
        : null;
    if (!rawState) continue;

    const facet = toStateFacet(rawState);
    if (!facet) continue;

    const existing = stateAccumulator.get(facet.code);
    if (existing) {
      existing.grantCount += 1;
    } else {
      stateAccumulator.set(facet.code, { ...facet });
    }
  }

  return Array.from(stateAccumulator.values())
    .filter((state) => state.grantCount > 0)
    .sort((a, b) => a.code.localeCompare(b.code));
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
      .or("active.is.null,active.eq.true")
      .not("state", "is", null)
      .neq("state", "")
      .order("state", { ascending: true });

    if (error) {
      console.error("[sitemap-utils] Error fetching states for sitemap", error);
      return [];
    }
    return aggregateStateFacetsFromSource(data ?? []);
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
      .from("grants")
      .select("agency_code, agency_name, agency")
      .or("active.is.null,active.eq.true");

    if (error) {
      console.error("[sitemap-utils] Error fetching agencies for sitemap", error);
      return [];
    }

    if (!Array.isArray(data)) return [];

    const agencies = new Map();

    for (const row of data) {
      const slug = deriveAgencySlug({
        agency_code: row?.agency_code,
        agency_name: row?.agency_name,
        agency: row?.agency,
      });
      if (!slug) continue;

      if (!agencies.has(slug)) {
        agencies.set(slug, {
          slug,
          agency_code: typeof row?.agency_code === "string" ? row.agency_code : null,
          agency_name:
            typeof row?.agency_name === "string"
              ? row.agency_name
              : typeof row?.agency === "string"
              ? row.agency
              : null,
          agency: typeof row?.agency === "string" ? row.agency : null,
        });
      }
    }

    return Array.from(agencies.values());
  } catch (error) {
    console.error("[sitemap-utils] Exception fetching agencies for sitemap", error);
    return [];
  }
}

function applyStateFilters(query) {
  if (!query) return query;
  query = query.not("state", "is", null).not("state", "eq", "");

  for (const label of FEDERAL_STATE_LABELS) {
    const sanitized = escapeIlike(label);
    if (!sanitized) continue;
    query = query.not("state", "ilike", `%${sanitized}%`);
  }

  return query;
}

function applyJurisdictionFilter(query, jurisdiction) {
  if (!query || typeof query.or !== "function") return query;
  const normalized = typeof jurisdiction === "string" ? jurisdiction.trim().toLowerCase() : "";
  if (!normalized) return query;

  if (normalized === PRIVATE_JURISDICTION) {
    return query.or(PRIVATE_MATCHER_CLAUSE);
  }

  if (normalized === FEDERAL_JURISDICTION) {
    return query.or(FEDERAL_MATCHER_CLAUSE);
  }

  return query;
}

function applyJurisdictionExclusions(query, jurisdictions = []) {
  if (!query) return query;
  const normalized = Array.isArray(jurisdictions)
    ? jurisdictions
        .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
        .filter(Boolean)
    : [];

  if (normalized.includes(PRIVATE_JURISDICTION)) {
    query = query.not("type", "ilike", "%private%").not("base_type", "ilike", "%private%");
  }

  if (normalized.includes(FEDERAL_JURISDICTION)) {
    query = query
      .not("type", "ilike", "%federal%")
      .not("base_type", "ilike", "%federal%")
      .not("state", "is", null)
      .not("state", "eq", "");

    for (const label of FEDERAL_STATE_LABELS) {
      const sanitized = escapeIlike(label);
      if (!sanitized) continue;
      query = query.not("state", "ilike", `%${sanitized}%`);
    }
  }

  return query;
}

async function fetchGrantsForSitemap(options = {}) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error("[sitemap-utils] Supabase client unavailable for grant sitemap generation");
    return [];
  }

  const pageSize = 1000;
  const grants = [];
  let from = 0;
  const jurisdiction = typeof options?.jurisdiction === "string" ? options.jurisdiction : null;
  const requireState = Boolean(options?.requireState);
  const stateFilterCandidates = buildStateFilterCandidates(options?.state);
  const excludeJurisdictions = Array.isArray(options?.excludeJurisdictions)
    ? options.excludeJurisdictions
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    : [];

  try {
    console.log("[sitemap-utils] Starting grant fetch for sitemap", {
      pageSize,
      jurisdiction: jurisdiction ?? null,
      state: stateFilterCandidates.length ? stateFilterCandidates : null,
      excludeJurisdictions,
    });

    while (true) {
      const to = from + pageSize - 1;

      console.log("[sitemap-utils] Requesting grant page", {
        from,
        to,
        jurisdiction: jurisdiction ?? null,
      });

      let query = supabase
        .from("grants")
        .select(
          `
            id,
            title,
            category,
            state,
            city,
            active,
            updated_at,
            scraped_at,
            base_type,
            type
          `,
          { count: "exact" }
        )
        .or("active.is.null,active.eq.true")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (requireState) {
        query = applyStateFilters(query);
      }

      if (jurisdiction) {
        query = applyJurisdictionFilter(query, jurisdiction);
      } else if (excludeJurisdictions.length > 0) {
        query = applyJurisdictionExclusions(query, excludeJurisdictions);
      }

      if (stateFilterCandidates.length > 0) {
        query = query.in("state", stateFilterCandidates);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("[sitemap-utils] Error fetching grants for sitemap", error);
        break;
      }

      if (!Array.isArray(data) || data.length === 0) {
        console.log(
          "[sitemap-utils] Finished fetching grants for sitemap",
          {
            total: grants.length,
            reportedCount: count ?? null,
          }
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
          reportedCount: count ?? null,
        }
      );

      if (data.length < pageSize) {
        console.log(
          "[sitemap-utils] Last grant page size below pageSize",
          {
            page: Math.floor(from / pageSize) + 1,
            fetched: data.length,
            total: grants.length,
            reportedCount: count ?? null,
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

function buildGrantEntries(grants, siteUrl = DEFAULT_SITE_URL, overrides = {}) {
  if (!Array.isArray(grants) || grants.length === 0) return [];
  const { jurisdiction: jurisdictionOverride, ...entryOverrides } = overrides;

  return grants
    .map((grant) => {
      try {
        const normalizedGrant =
          jurisdictionOverride && typeof jurisdictionOverride === "string"
            ? { ...grant, jurisdiction: jurisdictionOverride }
            : grant;
        const path = grantPath(normalizedGrant);
        if (!path || typeof path !== "string") return null;

        const lastModifiedCandidate =
          (typeof grant?.updated_at === "string" && grant.updated_at) ||
          (typeof grant?.scraped_at === "string" && grant.scraped_at) ||
          null;

        const entryOptions = {
          changefreq: "daily",
          priority: 0.6,
          ...entryOverrides,
        };

        if (!entryOptions.lastModified && lastModifiedCandidate) {
          entryOptions.lastModified = lastModifiedCandidate;
        }

        return createEntry(path, siteUrl, entryOptions);
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

async function collectGrantEntriesForSitemap(options = {}) {
  const {
    siteUrl = DEFAULT_SITE_URL,
    jurisdiction = null,
    excludeJurisdictions = [],
    entryOverrides = {},
    requireState = false,
    state = null,
  } = options;

  const grants = await fetchGrantsForSitemap({
    jurisdiction,
    excludeJurisdictions,
    requireState,
    state,
  });
  if (!grants.length) {
    console.log("[sitemap-utils] No grants found for sitemap section", {
      jurisdiction: jurisdiction ?? null,
      excludeJurisdictions,
      state,
    });
    return { grants: [], entries: [] };
  }

  const sectionLabel = jurisdiction
    ? `${jurisdiction} grant`
    : state
    ? `${state} state grant`
    : excludeJurisdictions.length > 0
    ? "state/local grant"
    : "grant";

  console.log(`[sitemap-utils] Building ${sectionLabel} sitemap entries`, {
    jurisdiction: jurisdiction ?? null,
    excludeJurisdictions,
    state,
    grantCount: grants.length,
    sample: grants.slice(0, 3).map((grant) => ({
      id: grant.id,
      title: grant.title,
      state: grant.state,
      active: grant.active,
    })),
  });

  const overrides = jurisdiction
    ? { ...entryOverrides, jurisdiction }
    : { ...entryOverrides };

  const entries = buildGrantEntries(grants, siteUrl, overrides);

  console.log(`[sitemap-utils] Sample ${sectionLabel} sitemap paths`, {
    total: entries.length,
    sample: entries.slice(0, 3).map((entry) => entry.path),
  });

  return { grants, entries };
}

async function getGrantUrls(siteUrl = DEFAULT_SITE_URL) {
  const { entries } = await collectGrantEntriesForSitemap({
    siteUrl,
    excludeJurisdictions: [PRIVATE_JURISDICTION],
    requireState: true,
  });
  return entries;
}

async function getPrivateGrantUrls(siteUrl = DEFAULT_SITE_URL) {
  const { entries } = await collectGrantEntriesForSitemap({
    siteUrl,
    jurisdiction: PRIVATE_JURISDICTION,
    entryOverrides: {
      changefreq: "weekly",
      priority: 0.55,
    },
  });
  return entries;
}

async function getFederalGrantUrls(siteUrl = DEFAULT_SITE_URL) {
  const { entries } = await collectGrantEntriesForSitemap({
    siteUrl,
    jurisdiction: FEDERAL_JURISDICTION,
    entryOverrides: {
      changefreq: "daily",
      priority: 0.58,
    },
  });
  return entries;
}

async function getAgencyUrls(siteUrl = DEFAULT_SITE_URL) {
  const agencies = await fetchAgencyRecords();
  if (!agencies.length) return [];

  return agencies
    .map((agency) => {
      const slug = deriveAgencySlug({
        agency_code: agency?.agency_code,
        agency_name: agency?.agency_name,
        agency: agency?.agency,
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

async function getStateUrls(siteUrl = DEFAULT_SITE_URL, options = {}) {
  const grantSource = Array.isArray(options?.grants) ? options.grants : null;
  let states = grantSource ? aggregateStateFacetsFromSource(grantSource) : [];
  if (!states.length) {
    states = await fetchStatesWithGrants();
  }
  if (!states.length) return [];

  return states.map((state) =>
    createEntry(`/grants/state/${encodeURIComponent(toStatePathSegment(state.code))}`, siteUrl, {
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
  const [
    federalGrantSection,
    privateGrantSection,
    agencyUrls,
    categoryUrls,
    states,
  ] = await Promise.all([
    collectGrantEntriesForSitemap({
      siteUrl,
      jurisdiction: FEDERAL_JURISDICTION,
      entryOverrides: { changefreq: "daily", priority: 0.58 },
    }),
    collectGrantEntriesForSitemap({
      siteUrl,
      jurisdiction: PRIVATE_JURISDICTION,
      entryOverrides: { changefreq: "weekly", priority: 0.55 },
    }),
    getAgencyUrls(siteUrl),
    getCategoryUrls(siteUrl),
    fetchStatesWithGrants(),
  ]);

  const stateGrantSections = await Promise.all(
    (states ?? []).map((state) =>
      collectGrantEntriesForSitemap({
        siteUrl,
        excludeJurisdictions: [PRIVATE_JURISDICTION],
        requireState: true,
        state: state.code,
      })
    )
  );

  const stateGrantEntries = stateGrantSections.flatMap((section) => section.entries ?? []);
  const stateUrls = await getStateUrls(siteUrl, { states });
  const staticUrls = getStaticUrls(siteUrl);

  console.log("[sitemap-utils] Aggregated sitemap urls", {
    staticCount: staticUrls.length,
    agencyCount: agencyUrls.length,
    categoryCount: categoryUrls.length,
    stateCount: stateUrls.length,
    stateGrantCount: stateGrantEntries.length,
    federalGrantCount: federalGrantSection.entries.length,
    privateGrantCount: privateGrantSection.entries.length,
  });

  return [
    ...staticUrls,
    ...agencyUrls,
    ...categoryUrls,
    ...stateUrls,
    ...stateGrantEntries,
    ...federalGrantSection.entries,
    ...privateGrantSection.entries,
  ];
}

async function getAllGrantPaths(siteUrl = DEFAULT_SITE_URL) {
  const [federalGrantSection, privateGrantSection, states] = await Promise.all([
    collectGrantEntriesForSitemap({
      siteUrl,
      jurisdiction: FEDERAL_JURISDICTION,
      entryOverrides: { changefreq: "daily", priority: 0.58 },
    }),
    collectGrantEntriesForSitemap({
      siteUrl,
      jurisdiction: PRIVATE_JURISDICTION,
      entryOverrides: { changefreq: "weekly", priority: 0.55 },
    }),
    fetchStatesWithGrants(),
  ]);

  const stateGrantSections = await Promise.all(
    (states ?? []).map((state) =>
      collectGrantEntriesForSitemap({
        siteUrl,
        excludeJurisdictions: [PRIVATE_JURISDICTION],
        requireState: true,
        state: state.code,
      })
    )
  );

  const stateGrantEntries = stateGrantSections.flatMap((section) => section.entries ?? []);

  return [...stateGrantEntries, ...federalGrantSection.entries, ...privateGrantSection.entries].map(
    (entry) => entry.path
  );
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
  getPrivateGrantUrls,
  getFederalGrantUrls,
  getAgencyUrls,
  getCategoryUrls,
  getStateUrls,
  getStaticUrls,
  getAllSitemapUrls,
  getAllGrantPaths,
  getAllAgencyPaths,
};
