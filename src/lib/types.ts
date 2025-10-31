export type Job = {
  id: string;
  source_id: string | null;
  title: string;
  apply_link: string | null;
  category: string | null;
  employment_type: string | null;
  location: string | null;
  closing_at: string | null;
  department: string | null;
  salary: string | null;
  scraped_at: string | null;
  hash: string | null;
};

export type JobWithLocation = Job & {
  state?: string | null;
  city?: string | null;
};

export type JobFilters = {
  query?: string;
  location?: string;
  category?: string;
  type?: string;
  state?: string;
  page?: number;
  pageSize?: number;
};

export type FacetSets = {
  categories: string[];
  locations: string[];
  employmentTypes: string[];
  states: string[];
};
