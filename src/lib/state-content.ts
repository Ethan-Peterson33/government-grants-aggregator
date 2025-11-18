// src/lib/state-content.ts

/**
 * Static SEO content for each state.
 * Add as many states as you want. Keys should match the stateCode.
 */

export const stateGrantContent: Record<
  string,
  {
    heading?: string;
    intro?: string;
    body?: string;
  }
> = {
  CA: {
    heading: "California Grants & Funding Overview",
    intro:
      "California offers one of the largest and most diverse statewide grant ecosystems in the country. Funding is available for small businesses, nonprofits, sustainability initiatives, healthcare, housing, and community development.",
    body:
      "Public agencies, small business owners, and community organizations can benefit from numerous programs supporting wildfire recovery, clean energy, water infrastructure, and workforce development. California also provides recurring funding for education, housing assistance, and environmental conservation. Applicants should review program requirements carefully as many grants target specific counties or under-resourced communities."
  },
VA: {
  heading: "Virginia Grants & Funding Opportunities",
  intro:
    "Virginia offers a robust grant ecosystem serving small businesses, nonprofits, local governments, and community-based initiatives. From rural economic development and infrastructure to arts, housing, and resilience programs, the Commonwealth supports a diverse range of funding pathways.",
  body:
    "Organizations and individuals in Virginia have access to funding streams through many state agencies, including the Office of the Secretary of the Commonwealth which publishes a comprehensive statewide grants directory. Priority areas include community development, affordable housing, small business growth, infrastructure improvement, arts & culture, and environmental resilience. Applicants are encouraged to explore individual agency programs—such as those in agriculture, historic resources, emergency management—and to monitor deadlines and eligibility requirements, as many opportunities align with regional or thematic allocations."
},
  NY: {
    heading: "New York Statewide Funding Opportunities",
    intro:
      "New York provides extensive grants supporting economic development, arts and culture, infrastructure modernization, and small business innovation.",
    body:
      "Initiatives such as the Regional Economic Development Councils (REDC) and the Consolidated Funding Application (CFA) streamline statewide funding. Many New York grants prioritize downtown revitalization, environmental resilience, and community health improvements."
  },

  TX: {
    heading: "Texas Grant Programs and Resources",
    intro:
      "Texas supports a wide range of grant opportunities focused on business growth, rural development, healthcare access, and disaster preparedness.",
    body:
      "Funding is available through state agencies, including community development block grants, small business assistance, broadband expansion, and agricultural support programs. Texas also invests heavily in hurricane mitigation and critical infrastructure."
  },

  // Add more states here...

};
