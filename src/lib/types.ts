export type Grant = {
  id: string;
  title: string;
  apply_link: string | null;

  category: string | null;
  category_code?: string | null;

  agency: string | null;
  agency_name?: string | null;
  agency_slug?: string | null;
  agency_id?: string | null;
  agency_code?: string | null;

  funding_amount: string | null;
  amount?: string | null; // ✅ alias for state/local scrapes

  eligibility: string | null;
  deadline: string | null;
  open_date?: string | null;
  close_date?: string | null;

  state: string | null;
  city: string | null;

  summary: string | null;
  description: string | null;

  type?: string | null;          
  jurisdiction?: string | null;  
  status?: string | null;        

  scraped_at: string | null;
  last_verified_at?: string | null;
  applicant_types?: string[] | null;
  // ✅ new normalized awards
  award_amount_min?: number | null;
  award_amount_max?: number | null;
  award_amount_text?: string | null;

  award_min?: number | null;
  award_max?: number | null;
  complexity?: string | null;
  required_docs?: string[] | null;
  official_source_url?: string | null;
  
  status_label?: string | null;
  deadline_type?: string | null;
  funding_mechanism?: string | null;
  geography_scope?: string | null;
 
  benefit_tags?: string[] | null;
  complexity_label?: string | null;
  verified_at?: string | null;
  last_updated_at?: string | null;
  source_domain?: string | null;

  // 👇 Add this block
  grant_categories?: {
    category_code: string;
    category_label: string;
    slug: string;
  } | null;
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
