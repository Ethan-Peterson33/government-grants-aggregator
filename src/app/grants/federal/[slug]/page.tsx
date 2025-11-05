import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { GrantDetail } from "@/components/grants/grant-detail";
import { RelatedLinks } from "@/components/grants/related-links";
import { loadGrant } from "@/app/grants/_components/load-grant";
import { generateBreadcrumbJsonLd, generateGrantJsonLd } from "@/lib/seo";
import { searchGrants } from "@/lib/search";
import { grantPath } from "@/lib/slug";
import type { Grant } from "@/lib/types";
import { inferGrantLocation } from "@/lib/grant-location";

function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const grant = await loadGrant(params.slug, searchParams);

  if (!grant) {
    return {
      title: "Grant Not Found",
      description: "The requested grant could not be located. Browse other federal opportunities.",
    };
  }

  const canonical = grantPath(grant);

  return {
    title: `${grant.title} | Federal grant`,
    description: grant.summary ?? undefined,
    alternates: { canonical },
    openGraph: {
      title: grant.title,
      description: grant.summary ?? undefined,
      type: "article",
    },
  };
}

export default async function FederalGrantDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const grant = await loadGrant(params.slug, searchParams);

  if (!grant) {
    notFound();
  }

  const canonical = grantPath(grant);
  const currentId = getSingleParam(searchParams?.id);
  const currentPath = `/grants/federal/${params.slug}${currentId ? `?id=${encodeURIComponent(currentId)}` : ""}`;

  if (currentPath !== canonical) {
    redirect(canonical);
  }

  const location = inferGrantLocation(grant);
  if (location.jurisdiction !== "federal") {
    redirect(canonical);
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: "Federal", href: "/grants/federal" },
    { label: grant.title, href: canonical },
  ];

  const categoryRelated = grant.category
    ? await searchGrants({
        category: grant.category,
        jurisdiction: "federal",
        page: 1,
        pageSize: 6,
      })
    : { grants: [] as Grant[], total: 0, page: 1, pageSize: 6, totalPages: 0 };

  const relatedGrants = (categoryRelated.grants ?? []).filter((g) => g.id !== grant.id).slice(0, 6);

  const relatedLinks = [
    { label: "All federal grants", href: "/grants/federal" },
    grant.category
      ? {
          label: `More ${grant.category} grants`,
          href: `/grants/federal?category=${encodeURIComponent(grant.category)}`,
        }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  const grantJsonLd = generateGrantJsonLd(grant, { path: canonical });

  return (
    <div className="container-grid space-y-10 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <GrantDetail grant={grant} />

      {relatedGrants.length > 0 && (
        <section className="space-y-4">
          <header>
            <h2 className="text-2xl font-semibold text-slate-900">More federal grants like this</h2>
            <p className="text-sm text-slate-600">
              Explore additional programs from federal agencies that align with this opportunity.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedGrants.map((related) => (
              <GrantCard key={related.id} grant={related} />
            ))}
          </div>
        </section>
      )}

      <RelatedLinks links={relatedLinks} />

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
