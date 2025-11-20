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
      "A complete first-time homebuyer workbook with checklists, timelines, grant guidance, and fillable worksheets to help you go from renter to homeowner.",
    longDescription:
      "The Starter Pack is a guided, fillable PDF workbook that keeps you organized from credit prep to closing. Use the checklists, trackers, and timelines to discover grants, compare loan programs, and stay on top of every document you need to become a confident first-time homebuyer.",
    category: "homebuyer",
    supportedCategorySlugs: ["first-time-homeowner", "first-time-homebuyer", "homebuyer"],
    tags: ["Digital PDF", "First-Time Homebuyers"],
    lemonSqueezyUrl: "https://example.lemon.group/buy/homebuyer-starter-pack",
  },
];

export function findDigitalProductByCategorySlug(slug?: string | null) {
  if (!slug) return undefined;

  const normalized = slugify(slug);

  if (!normalized) return undefined;

  return digitalProducts.find((product) => {
    const productSlug = slugify(product.category);
    const extraSlugs = product.supportedCategorySlugs?.map((item) => slugify(item)) ?? [];

    return productSlug === normalized || extraSlugs.includes(normalized);
  });
}
