import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantDetail } from "@/components/grants/grant-detail";
import { GrantCard } from "@/components/grants/grant-card";
import { RelatedLinks } from "@/components/grants/related-links";
import { generateBreadcrumbJsonLd, generateGrantJsonLd } from "@/lib/seo";
import { getGrantById, getGrantByShortId, searchGrants } from "@/lib/search";
import type { Grant } from "@/lib/types";
import { grantPath } from "@/lib/slug";
import { sentenceCase } from "@/lib/utils";

function extractShortIdFromSlug(slug: string | undefined | null): string | null {
  if (!slug || typeof slug !== "string") return null;
  const last = slug.split("-").at(-1);
  return last ? last.toLowerCase() : null;
}

function isGrant(value: unknown): value is Grant {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<Grant>;
  return typeof record.id === "string" && typeof record.title === "string";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { state: string; city: string; category: string; slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const paramId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const slugShort = extractShortIdFromSlug(params.slug);
  let grant: Grant | null = null;

  if (paramId) {
    grant = await getGrantById(paramId);
  } else if (slugShort) {
    grant = await getGrantByShortId(slugShort);
  }

  if (!isGrant(grant)) {
    return {
      title: "Grant Not Found",
      description: "The requested grant could not be located. Explore additional funding opportunities.",
    };
  }

  // grant is guaranteed to have id/title by isGrant
  const canonical = grantPath(grant);

  const stateName = sentenceCase(params.state);
  const cityName = sentenceCase(params.city);
  const categoryName = sentenceCase(params.category);

  return {
    title: `${grant.title} | ${categoryName} grant in ${cityName}, ${stateName}`,
    description: grant.summary ?? undefined,
    alternates: { canonical },
    openGraph: {
      title: grant.title,
      description: grant.summary ?? undefined,
      type: "article",
    },
  };
}

export default async function GrantDetailPage({
  params,
  searchParams,
}: {
  params: { state: string; city: string; category: string; slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const paramId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const slugShort = extractShortIdFromSlug(params.slug);
  let grant: Grant | null = null;

  if (paramId) {
    grant = await getGrantById(paramId);
  } else if (slugShort) {
    grant = await getGrantByShortId(slugShort);
  }

  if (!isGrant(grant)) {
    notFound();
  }

  const canonical = grantPath(grant);
  const current = `/grants/${params.state}/${params.city}/${params.category}/${params.slug}${
    paramId ? `?id=${encodeURIComponent(paramId)}` : ""
  }`;

  // Canonicalize route if mismatched
  if (current !== canonical) {
    redirect(canonical);
  }

  const stateName = sentenceCase(params.state);
  const cityName = sentenceCase(params.city);
  const categoryName = sentenceCase(params.category);
  const detailPath = canonical;

  const [categoryRelated, stateRelated] = await Promise.all([
    grant.category && grant.state
      ? searchGrants({ state: grant.state, category: grant.category, page: 1, pageSize: 6 })
      : Promise.resolve({ grants: [] as Grant[], total: 0, page: 1, pageSize: 6, totalPages: 0 }),
    grant.state
      ? searchGrants({ state: grant.state, page: 1, pageSize: 6 })
      : Promise.resolve({ grants: [] as Grant[], total: 0, page: 1, pageSize: 6, totalPages: 0 }),
  ]);

  const moreCategory = (categoryRelated.grants ?? []).filter((g) => g.id !== grant.id).slice(0, 6);
  const moreState = (stateRelated.grants ?? []).filter((g) => g.id !== grant.id).slice(0, 6);

  const relatedLinks = [
    grant.category
      ? { label: `More ${grant.category} grants`, href: `/grants?category=${encodeURIComponent(grant.category)}` }
      : null,
    grant.state ? { label: `Funding in ${grant.state}`, href: `/grants?state=${encodeURIComponent(grant.state)}` } : null,
    grant.agency
      ? { label: `Programs from ${grant.agency}`, href: `/grants?agency=${encodeURIComponent(grant.agency)}` }
      : null,
  ].filter((x): x is { label: string; href: string } => Boolean(x));

  const grantJsonLd = generateGrantJsonLd(grant, { path: detailPath });

  return (
    <div className="container-grid space-y-10 py-10">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Grants", href: "/grants" },
          { label: stateName, href: `/grants/${params.state}` },
          { label: cityName, href: `/grants/${params.state}/${params.city}` },
          { label: categoryName, href: `/grants/${params.state}/${params.city}/${params.category}` },
          { label: grant.title, href: detailPath },
        ]}
      />
      <GrantDetail grant={grant} />

      {moreCategory.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">More {categoryName} grants</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {moreCategory.map((item) => (
              <GrantCard key={item.id} grant={item} />
            ))}
          </div>
        </section>
      )}

      {moreState.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Additional grants in {stateName}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {moreState.map((item) => (
              <GrantCard key={item.id} grant={item} />
            ))}
          </div>
        </section>
      )}

      {relatedLinks.length > 0 && <RelatedLinks links={relatedLinks} />}

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateBreadcrumbJsonLd([
              { name: "Home", url: "/" },
              { name: "Grants", url: "/grants" },
              { name: stateName, url: `/grants/${params.state}` },
              { name: cityName, url: `/grants/${params.state}/${params.city}` },
              { name: categoryName, url: `/grants/${params.state}/${params.city}/${params.category}` },
              { name: grant.title, url: detailPath },
            ]),
            grantJsonLd,
          ]),
        }}
      />
    </div>
  );
}
