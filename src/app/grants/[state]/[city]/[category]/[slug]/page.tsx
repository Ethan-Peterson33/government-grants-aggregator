import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantDetail } from "@/components/grants/grant-detail";
import { GrantCard } from "@/components/grants/grant-card";
import { RelatedLinks } from "@/components/grants/related-links";
import { generateBreadcrumbJsonLd, generateGrantJsonLd } from "@/lib/seo";
import { getGrantById, searchGrants } from "@/lib/search";
import type { Grant } from "@/lib/types";
import { shortId } from "@/lib/slug";
import { sentenceCase } from "@/lib/utils";

function extractShortId(slug: string): string | null {
  const parts = slug.split("-");
  const last = parts.at(-1);
  return last ? last.toLowerCase() : null;
}

function isGrant(value: unknown): value is Grant {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<Grant>;
  return typeof record.id === "string" && typeof record.title === "string";
}

function matchesShortId(grant: Pick<Grant, "id">, slug: string): boolean {
  const segment = extractShortId(slug);
  return segment ? shortId(grant.id) === segment : false;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { state: string; city: string; category: string; slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const grantId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const grant = grantId ? await getGrantById(grantId) : null;

  if (!isGrant(grant) || !matchesShortId(grant, params.slug)) {
    return {
      title: "Grant Not Found",
      description: "The requested grant could not be located. Explore additional funding opportunities.",
    };
  }

  const stateName = sentenceCase(params.state);
  const cityName = sentenceCase(params.city);
  const categoryName = sentenceCase(params.category);
  const detailPath = `/grants/${params.state}/${params.city}/${params.category}/${params.slug}?id=${encodeURIComponent(grant.id)}`;

  return {
    title: `${grant.title} | ${categoryName} grant in ${cityName}, ${stateName}`,
    description: grant.summary ?? undefined,
    alternates: {
      canonical: detailPath,
    },
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
  const grantId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  if (!grantId) {
    notFound();
  }

  const grant = await getGrantById(grantId);

  if (!isGrant(grant) || !matchesShortId(grant, params.slug)) {
    notFound();
  }

  const stateName = sentenceCase(params.state);
  const cityName = sentenceCase(params.city);
  const categoryName = sentenceCase(params.category);
  const detailPath = `/grants/${params.state}/${params.city}/${params.category}/${params.slug}?id=${encodeURIComponent(grant.id)}`;

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: stateName, href: `/grants/${params.state}` },
    { label: cityName, href: `/grants/${params.state}/${params.city}` },
    { label: categoryName, href: `/grants/${params.state}/${params.city}/${params.category}` },
    { label: grant.title, href: detailPath },
  ];

  const [categoryRelated, stateRelated] = await Promise.all([
    grant.category && grant.state
      ? searchGrants({ state: grant.state, category: grant.category, page: 1, pageSize: 6 })
      : Promise.resolve({ grants: [] as Grant[], total: 0, page: 1, pageSize: 6, totalPages: 0 }),
    grant.state
      ? searchGrants({ state: grant.state, page: 1, pageSize: 6 })
      : Promise.resolve({ grants: [] as Grant[], total: 0, page: 1, pageSize: 6, totalPages: 0 }),
  ]);

  const moreCategory = (categoryRelated.grants ?? [])
    .filter((item) => item.id !== grant.id)
    .slice(0, 6);
  const moreState = (stateRelated.grants ?? [])
    .filter((item) => item.id !== grant.id)
    .slice(0, 6);

  const relatedLinks = [
    grant.category
      ? {
          label: `More ${grant.category} grants`,
          href: `/grants?category=${encodeURIComponent(grant.category)}`,
        }
      : null,
    grant.state
      ? {
          label: `Funding in ${grant.state}`,
          href: `/grants?state=${encodeURIComponent(grant.state)}`,
        }
      : null,
    grant.agency
      ? {
          label: `Programs from ${grant.agency}`,
          href: `/grants?agency=${encodeURIComponent(grant.agency)}`,
        }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  const grantJsonLd = generateGrantJsonLd(grant, { path: detailPath });

  return (
    <div className="container-grid space-y-10 py-10">
      <Breadcrumb items={breadcrumbItems} />
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
            generateBreadcrumbJsonLd(breadcrumbItems.map((item) => ({ name: item.label, url: item.href }))),
            grantJsonLd,
          ]),
        }}
      />
    </div>
  );
}
