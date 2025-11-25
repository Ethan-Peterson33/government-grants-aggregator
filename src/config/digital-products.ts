import { slugify } from "@/lib/strings";

export type DigitalProduct = {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription?: string;
  tags: string[];
  category: string;
  supportedCategorySlugs?: string[];
  lemonSqueezyUrl: string;
};

export const digitalProducts: DigitalProduct[] = [
  {
    slug: "first-time-homebuyer-starter-pack",
    name: "First-Time Homebuyer Starter Pack (2025 Edition)",
    shortDescription:
      "A complete first-time homebuyer toolkit: 9 checklists, timelines, grant guidance, worksheets + editable Excel/Google Sheet budget & affordability calculator.",
    longDescription:
      "The Starter Pack is a guided, fillable PDF workbook *and* editable Google Sheet that keeps you organized from credit prep to closing. Use the checklists, trackers, timelines, and budget tools to discover grants, compare loan programs, and confidently buy your first home.",
    category: "homebuyer",
    supportedCategorySlugs: ["first-time-homeowner", "first-time-homebuyer", "homebuyer"],
    tags: [
      "first-time homebuyer",
      "homebuyer starter pack",
      "home buying checklist",
      "budget template",
      "google sheet budget",
      "down payment assistance",
      "homeownership toolkit",
      "digital download",
      "PDF workbook",
      "affordability calculator"
    ],
    lemonSqueezyUrl: "https://ethanverse4852.gumroad.com/l/FTHB-Starter-Pack"
  },
];
