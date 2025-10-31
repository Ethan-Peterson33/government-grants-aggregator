import { grantPath } from "@/lib/slug";
import type { Grant } from "@/lib/types";

type BreadcrumbItem = {
  name: string;
  url?: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://example.com";

export function generateGrantJsonLd(grant: Grant, options?: { path?: string }) {
  const path = options?.path ?? grantPath(grant);
  const grantUrl = `${SITE_URL}${path}`;
  const plainDescription = grant.description
    ? grant.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || undefined
    : undefined;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Grant",
    name: grant.title,
    description: grant.summary ?? plainDescription,
    url: grantUrl,
    applicationStartDate: grant.open_date ?? undefined,
    applicationDeadline: grant.deadline ?? grant.close_date ?? undefined,
    sponsor: grant.agency
      ? {
          "@type": "Organization",
          name: grant.agency,
        }
      : undefined,
    applicantLocationRequirements: grant.state ?? undefined,
    fundingScheme: grant.category ?? undefined,
    offers: grant.funding_amount
      ? {
          "@type": "Offer",
          description: grant.funding_amount,
        }
      : undefined,
    mainEntityOfPage: grantUrl,
  };

  Object.keys(jsonLd).forEach((key) => {
    if (jsonLd[key] === undefined) {
      delete jsonLd[key];
    }
  });

  return jsonLd;
}

export function generateItemListJsonLd(grants: Grant[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: grants.length,
    itemListElement: grants.map((grant, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: grant.title,
      url: `${SITE_URL}${grantPath(grant)}`,
    })),
  };
}

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const listItem: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
      };

      if (item.url) {
        listItem.item = `${SITE_URL}${item.url}`;
      }

      return listItem;
    }),
  };
}
