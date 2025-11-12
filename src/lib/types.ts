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
  funding_amount: string | null;
  eligibility: string | null;
  deadline: string | null;
  state: string | null;
  city: string | null;
  summary: string | null;
  description: string | null;
  scraped_at: string | null;
  opportunity_number?: string | null;
  opportunity_id?: number | null;
  agency_code?: string | null;
  open_date?: string | null;
  close_date?: string | null;

  // 👇 Add this block
  grant_categories?: {
    category_code: string;
    category_label: string;
    slug: string;
  } | null;
};



export type GrantJurisdiction = "federal" | "state" | "local";

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

export type FacetSets = {
  categories: string[];
  states: string[];
  agencies: string[];
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
