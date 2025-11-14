/** @type {import('next-sitemap').IConfig} */
const { getAllGrantPaths, getAllAgencyPaths } = require('./lib/sitemap-utils');

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

    let grantPaths = [];
    let agencyPaths = [];

    try {
      grantPaths = await getAllGrantPaths();
    } catch (e) {
      console.error('[next-sitemap] Error in getAllGrantPaths:', e);
    }

    try {
      agencyPaths = await getAllAgencyPaths();
    } catch (e) {
      console.error('[next-sitemap] Error in getAllAgencyPaths:', e);
    }

    console.log('[next-sitemap] grantPaths count:', grantPaths.length);
    console.log('[next-sitemap] agencyPaths count:', agencyPaths.length);

    const staticPages = [
      {
        loc: '/faq',
        changefreq: 'weekly',
        priority: 0.6,
      },
    ];

    const extraUrls = [
      ...staticPages,
      ...grantPaths.map((loc) => ({
        loc,
        changefreq: 'daily',
        priority: 0.6,
      })),
      ...agencyPaths.map((loc) => ({
        loc,
        changefreq: 'weekly',
        priority: 0.5,
      })),
    ];

    console.log('[next-sitemap] total additionalPaths:', extraUrls.length);
    console.log('[next-sitemap] sample additionalPaths:', extraUrls.slice(0, 5));

    return extraUrls;
  },
};
