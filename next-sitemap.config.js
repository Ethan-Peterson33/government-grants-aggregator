/** @type {import('next-sitemap').IConfig} */
const { getAllSitemapUrls } = require('./lib/sitemap-utils');

module.exports = {
  siteUrl: 'https://www.grantdirectory.org',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: ['/api/*', '/verify-domain', '/verify-domain/*'],

  transform: async (config, url) => {
    return {
      loc: url,
      changefreq: 'daily',
      priority: 0.7,
      lastmod: new Date().toISOString(),
    };
  },

  additionalPaths: async (config) => {
    console.log('[next-sitemap] additionalPaths: starting');

    const siteUrl = config?.siteUrl || module.exports.siteUrl;
    let sitemapEntries = [];

    try {
      sitemapEntries = await getAllSitemapUrls(siteUrl);
    } catch (error) {
      console.error('[next-sitemap] Error in getAllSitemapUrls:', error);
    }

    console.log('[next-sitemap] sitemap entry count:', sitemapEntries.length);

    const extraUrls = sitemapEntries.map((entry) => ({
      loc: entry.url,
      changefreq: entry.changefreq ?? 'weekly',
      priority: entry.priority ?? 0.5,
      lastmod: entry.lastModified,
    }));

    console.log('[next-sitemap] total additionalPaths:', extraUrls.length);
    console.log('[next-sitemap] sample additionalPaths:', extraUrls.slice(0, 5));

    return extraUrls;
  },
};
