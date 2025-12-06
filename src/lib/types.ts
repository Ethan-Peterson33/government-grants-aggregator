export type Grant = {
  id: string;

  // --- Core identity ---
  title: string;
  official_title?: string | null;

  // --- Source & URLs ---
  apply_link: string | null;
  official_source_url?: string | null;
  source_domain?: string | null;

  // --- Classification ---
  category: string | null;
  category_code?: string | null;
  grant_categories?: {
    category_code: string;
    category_label: string;
    slug: string;
  } | null;

  type?: string | null;                // old field, keep for compatibility
  funding_mechanism?: string | null;   // Grant | Forgivable loan | Tax credit | Rebate | Technical assistance...

  // --- Agency ---
  agency: string | null;
  agency_name?: string | null;
  agency_slug?: string | null;
  agency_id?: string | null;
  agency_code?: string | null;

  // --- Location ---
  state: string | null;
  city: string | null;
  geography_scope?: string | null;     // Statewide | County | City | Multi-county | Nationwide
  eligible_geographies_text?: string | null;
  jurisdiction?: string | null; 

  // --- Money ---
  award_min?: number | null;
  award_max?: number | null;
  award_amount_max?: number | null;
  award_amount_min?: number | null;

  award_amount_text?: string | null;   // human-friendly display
  funding_amount?: string | null;      // legacy raw scrape text
  amount?: string | null;              // legacy

  // --- Status ---
  status_label?: string | null;        // Open | Rolling | Closed | Upcoming
  deadline_type?: string | null;       // Fixed | Rolling | Quarterly | Until funds exhausted
  deadline: string | null;
  open_date?: string | null;
  close_date?: string | null;

  // --- Descriptive content ---
  summary: string | null;
  description: string | null;
  eligibility: string | null;
  benefit_tags?: string[] | null;

  // --- Applicant classification ---
  applicant_types?: string[] | null;   // Individual | Small business | Nonprofit | Tribal government | etc.

  // --- Complexity / Verification ---
  complexity_label?: string | null;    // Easy | Moderate | Complex
  complexity?: string | null;          // legacy fallback
  required_docs?: string[] | null;

  confidence_score?: number | null;
  confidence_notes?: string | null;

  // --- Dates (trust + update tracking) ---
  scraped_at: string | null;           // original scrape timestamp
  verified_at?: string | null;         // human verified
  last_verified_at?: string | null;    // legacy from before verified_at
  last_updated_at?: string | null;     // program change or rewrite date

  // --- Misc legacy ---
  opportunity_number?: string | null;
};



export type GrantJurisdiction = "federal" | "state" | "local" | "private";

export type GrantFilters = {
  query?: string;
  category?: string;
  state?: string;
  stateCode?: string;
  city?: string;
  agency?: string;
  agencySlug?: string;
  agencyCode?: string;
  hasApplyLink?: boolean;
  jurisdiction?: GrantJurisdiction;
  applicantTypes?: string[];
  geographyScope?: string | null;
  page?: number;
  pageSize?: number;
};

export type CategoryFacet = {
  slug: string;
  label: string;
  grantCount: number;
};

export type FilterFacet = {
  label: string;
  value: string;
  grantCount: number;
};

export type FacetSets = {
  categories: CategoryFacet[];
  states: FilterFacet[];
  agencies: FilterFacet[];
};

export type Agency = {
  id: string;
  slug: string | null; 
  agency_name: string;
  agency_code: string | null;
  description: string | null;
  website: string | null;
  contacts: unknown;
  created_at: string | null;
  updated_at: string | null;
};
