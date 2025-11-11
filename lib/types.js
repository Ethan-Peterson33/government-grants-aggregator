// lib/types.js

/**
 * @typedef {Object} Grant
 * @property {string} id
 * @property {string} title
 * @property {string|null} apply_link
 * @property {string|null} category
 * @property {string|null|undefined} category_code
 * @property {string|null} agency
 * @property {string|null|undefined} agency_name
 * @property {string|null|undefined} agency_slug
 * @property {string|null|undefined} agency_id
 * @property {string|null} funding_amount
 * @property {string|null} eligibility
 * @property {string|null} deadline
 * @property {string|null} state
 * @property {string|null} city
 * @property {string|null} summary
 * @property {string|null} description
 * @property {string|null} scraped_at
 * @property {string|null|undefined} opportunity_number
 * @property {number|null|undefined} opportunity_id
 * @property {string|null|undefined} agency_code
 * @property {string|null|undefined} open_date
 * @property {string|null|undefined} close_date
 */

/**
 * @typedef {"federal"|"state"|"local"} GrantJurisdiction
 */

/**
 * @typedef {Object} GrantFilters
 * @property {string} [query]
 * @property {string} [category]
 * @property {string} [state]
 * @property {string} [stateCode]
 * @property {string} [city]
 * @property {string} [agency]
 * @property {string} [agencySlug]
 * @property {string} [agencyCode]
 * @property {boolean} [hasApplyLink]
 * @property {GrantJurisdiction} [jurisdiction]
 * @property {number} [page]
 * @property {number} [pageSize]
 */

/**
 * @typedef {Object} FacetSets
 * @property {string[]} categories
 * @property {string[]} states
 * @property {string[]} agencies
 */

/**
 * @typedef {Object} Agency
 * @property {string} id
 * @property {string} slug
 * @property {string} agency_name
 * @property {string|null} agency_code
 * @property {string|null} description
 * @property {string|null} website
 * @property {unknown} contacts
 * @property {string|null} created_at
 * @property {string|null} updated_at
 */

module.exports = {
  // purely for documentation / tooling — there are no runtime values here
};
