export type CategoryContentBlock = {
  heading: string;
  intro: string;
  body: string;
};

export const CATEGORY_CONTENT: Record<string, CategoryContentBlock> = {
  "small-business": {
    heading: "Small Business Grants Overview",
    intro:
      "Small business grants support entrepreneurs, startups, and established companies seeking growth, innovation, or support during economic challenges.",
    body:
      "Funding may be offered through federal agencies like the SBA, state economic development offices, local municipalities, and private corporate programs. Grants often focus on innovation, job creation, rural development, exporting, and underserved business communities. Eligibility and deadlines vary widely, so business owners should review each program carefully."
  },

  "arts-culture": {
    heading: "Arts & Culture Grants Overview",
    intro:
      "Arts and cultural funding helps support artists, museums, arts organizations, festivals, and creative community development.",
    body:
      "Programs may include operational support, project grants, touring assistance, community arts initiatives, and cultural preservation funding. Applicants can find grants from federal organizations such as the National Endowment for the Arts, state arts councils, local city programs, and private foundations committed to creative placemaking and cultural enrichment."
  }, 

  // Add as many categories as you want...
  // use the slug as the key.
};
