export type CategoryStateCopy = {
  heading?: string;
  intro?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export const categoryStateCopy: Record<string, Record<string, CategoryStateCopy>> = {
  housing: {
    california: {
      heading: "California Housing & First-Time Homebuyer Grants",
      intro:
        "Explore housing and down payment assistance programs available to California residents, including state-backed and local first-time homebuyer grants.",
      seoTitle: "California Housing & First-Time Homebuyer Grants | GrantDirectory.org",
      seoDescription:
        "Browse housing and first-time homebuyer grants in California by category, including down payment assistance, closing cost help, and other state and local programs.",
    },
    texas: {
      heading: "Texas Housing Grants & Assistance",
      intro:
        "Find housing and homebuyer assistance programs in Texas, from statewide initiatives to local city programs.",
    },
  },
};
