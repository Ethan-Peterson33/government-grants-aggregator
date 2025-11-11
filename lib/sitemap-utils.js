// lib/sitemap-utils.js
const { createServerSupabaseClient } = require('./server');
const { grantPath } = require('./slug');

async function getAllGrantPaths() {
  console.log('[sitemap-utils] getAllGrantPaths: starting');

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error('[sitemap-utils] Supabase client unavailable for sitemap grant generation');
    return [];
  }

  let data, error;
  try {
    const result = await supabase
      .from('grants')
      .select('id, title, category, state, apply_link')
      .not('apply_link', 'is', null)       // ✅ require apply_link to be present
      .neq('apply_link', '');              // ✅ skip empty strings just in case;

    data = result.data;
    error = result.error;
  } catch (e) {
    console.error('[sitemap-utils] Exception querying grants:', e);
    return [];
  }

  if (error) {
    console.error('[sitemap-utils] Error fetching grant rows:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.warn('[sitemap-utils] No grant rows returned for sitemap');
    return [];
  }

  console.log(`[sitemap-utils] Fetched ${data.length} grants for sitemap, sample:`, {
    first: data[0],
  });

  const paths = [];
  for (const grant of data) {
    try {
      const loc = grantPath({
        id: grant.id,
        title: grant.title || '',
        category: grant.category || null,
        state: grant.state || null,
        city: null, // no city column in your current schema
      });

      if (loc && typeof loc === 'string') {
        paths.push(loc);
      } else {
        console.warn('[sitemap-utils] grantPath returned invalid loc', {
          id: grant.id,
          title: grant.title,
          loc,
        });
      }
    } catch (e) {
      console.error('[sitemap-utils] Error generating grant path', {
        id: grant.id,
        title: grant.title,
        error: e,
      });
    }
  }

  console.log(`[sitemap-utils] Generated ${paths.length} grant paths for sitemap`);
  console.log('[sitemap-utils] Sample paths:', paths.slice(0, 5));

  return paths;
}

async function getAllAgencyPaths() {
  console.log('[sitemap-utils] getAllAgencyPaths: starting');

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error('[sitemap-utils] Supabase client unavailable for sitemap agency generation');
    return [];
  }

  let data, error;
  try {
    const result = await supabase
      .from('agencies') // make sure this matches your actual table name
      .select('agency_code')
      .not('agency_code', 'is', null);

    data = result.data;
    error = result.error;
  } catch (e) {
    console.error('[sitemap-utils] Exception querying agencies:', e);
    return [];
  }

  if (error) {
    console.error('[sitemap-utils] Error fetching agency rows:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.warn('[sitemap-utils] No agency rows returned for sitemap');
    return [];
  }

  console.log(`[sitemap-utils] Fetched ${data.length} agencies for sitemap, sample:`, {
    first: data[0],
  });

  const paths = [];
  for (const a of data) {
    if (!a.agency_code) continue;
    const slug = encodeURIComponent(a.agency_code);
    const loc = `/agencies/${slug}`;
    paths.push(loc);
  }

  console.log(`[sitemap-utils] Generated ${paths.length} agency paths for sitemap`);
  console.log('[sitemap-utils] Sample agency paths:', paths.slice(0, 5));

  return paths;
}

module.exports = {
  getAllGrantPaths,
  getAllAgencyPaths,
};
