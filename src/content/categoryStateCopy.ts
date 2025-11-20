// src/content/categoryStateCopy.ts
export type CategoryStateCopy = {
  heading?: string;
  intro?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export const categoryStateCopy: Record<string, Record<string, CategoryStateCopy>> = {
  education: {
    virginia: {
      heading: "Virginia Education Grants & Scholarship Programs",
      intro:
        "Explore education grants, scholarships, and funding opportunities for Virginia students, schools, and educators.",
      seoTitle: "Virginia Education Grants & Scholarships | GrantDirectory.org",
      seoDescription:
        "Find education grants and funding in Virginia, including scholarships for students and programs supporting schools, teachers, and community learning initiatives.",
    },
  },
  "science-technology": {
    virginia: {
      heading: "Virginia Science & Technology Research Grants",
      intro:
        "Discover science and innovation funding in Virginia, including technology development and STEM research programs.",
      seoTitle: "Virginia Science & Technology Grants | GrantDirectory.org",
      seoDescription:
        "Browse science and technology grants available to Virginia researchers, startups, and educational organizations driving innovation in STEM.",
    },
  },
  housing: {
    virginia: {
      heading: "Virginia Housing & First-Time Homebuyer Grants",
      intro:
        "Explore Virginia housing programs, including down payment assistance, affordable housing, and home improvement grants.",
      seoTitle: "Virginia Housing & Homebuyer Assistance Grants | GrantDirectory.org",
      seoDescription:
        "Find housing grants and first-time homebuyer assistance programs in Virginia, from statewide initiatives to local city housing support.",
    },
    texas: {
      heading: "Texas Housing Grants & Assistance Programs",
      intro:
        "Find housing and homebuyer assistance programs in Texas, from statewide initiatives to local city programs.",
      seoTitle: "Texas Housing Grants & First-Time Homebuyer Programs | GrantDirectory.org",
      seoDescription:
        "Explore housing and first-time homebuyer programs in Texas, including down payment assistance, closing cost aid, and affordable housing initiatives.",
    },
    california: {
      heading: "California Housing & First-Time Homebuyer Grants",
      intro:
        "Explore housing and down payment assistance programs available to California residents, including state-backed and local first-time homebuyer grants.",
      seoTitle: "California Housing & First-Time Homebuyer Grants | GrantDirectory.org",
      seoDescription:
        "Browse housing and first-time homebuyer grants in California by category, including down payment assistance, closing cost help, and other state and local programs.",
    },
    florida: {
      heading: "Florida Housing & Homebuyer Assistance Programs",
      intro:
        "Learn about Florida housing grants, including first-time homebuyer aid, affordable housing development, and home repair assistance.",
      seoTitle: "Florida Housing & First-Time Homebuyer Grants | GrantDirectory.org",
      seoDescription:
        "Browse Florida housing programs and homebuyer assistance opportunities, including down payment support and city-level affordable housing initiatives.",
    },
  },
  "small-business": {
    virginia: {
      heading: "Virginia Small Business Grants & Funding Opportunities",
      intro:
        "Access Virginia small business grants, loans, and funding programs to help local entrepreneurs start, grow, and innovate.",
      seoTitle: "Virginia Small Business Grants | GrantDirectory.org",
      seoDescription:
        "Find small business and startup funding in Virginia, including state and local programs for entrepreneurs, innovation, and economic development.",
    },
    texas: {
      heading: "Texas Small Business Grants & Startup Funding",
      intro:
        "Discover small business funding and grant programs across Texas for entrepreneurs, local businesses, and nonprofits.",
      seoTitle: "Texas Small Business Grants & Funding Programs | GrantDirectory.org",
      seoDescription:
        "Browse Texas small business grants and startup funding opportunities, including programs for women-owned and minority-owned businesses.",
    },
  },
  nonprofit: {
    "united-states": {
      heading: "Nonprofit Grants & Funding Opportunities Nationwide",
      intro:
        "Explore national nonprofit funding and grant programs that support charitable, educational, and community-focused organizations across the U.S.",
      seoTitle: "National Nonprofit Grants & Funding | GrantDirectory.org",
      seoDescription:
        "Find nonprofit grants across the United States, supporting community initiatives, education, social services, and charitable programs.",
    },
  },
  "first-time-homeowner": {
    florida: {
      heading: "Florida First-Time Homebuyer & Down Payment Assistance",
      intro:
        "Explore Florida first-time homebuyer programs offering grants, loans, and down payment assistance for eligible residents.",
      seoTitle: "Florida First-Time Homebuyer Grants & Down Payment Assistance | GrantDirectory.org",
      seoDescription:
        "Find Florida first-time homebuyer programs and down payment assistance options for new homeowners, including state and local housing initiatives.",
    },
    california: {
      heading: "California First-Time Homebuyer & Housing Assistance",
      intro:
        "Learn about California first-time homebuyer grants and affordable housing programs for individuals and families.",
      seoTitle: "California First-Time Homebuyer Programs & Grants | GrantDirectory.org",
      seoDescription:
        "Browse first-time homebuyer grants and housing assistance programs in California, including down payment and closing cost support.",
    },
  },
};
