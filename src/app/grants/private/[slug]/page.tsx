import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { GrantDetail } from "@/components/grants/grant-detail";
import { RelatedLinks } from "@/components/grants/related-links";
import { loadGrant } from "@/app/grants/_components/load-grant";
import {
  extractSearchParam,
  resolveRouteParams,
  resolveSearchParams,
  type MaybePromise,
  type SearchParamsLike,
} from "@/app/grants/_components/route-params";
import { inferGrantLocation } from "@/lib/grant-location";
import { generateBreadcrumbJsonLd, generateGrantJsonLd } from "@/lib/seo";
import { searchGrants } from "@/lib/search";
import { grantPath } from "@/lib/slug";
import type { Grant } from "@/lib/types";

type PrivateParams = { slug: string };

type PrivateSearchParams = SearchParamsLike;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: MaybePromise<PrivateParams>;
  searchParams?: MaybePromise<PrivateSearchParams>;
}): Promise<Metadata> {
  const resolvedParams = await resolveRouteParams(params, "private.generateMetadata.params");
  const slug = typeof resolvedParams?.slug === "string" ? resolvedParams.slug : undefined;
  const grant = await loadGrant(slug, searchParams);

  if (!grant) {
    return {
      title: "Grant Not Found",
      description:
        "We couldn't locate that private funding opportunity. Explore more private and foundation grants.",
    };
  }

  const canonical = grantPath(grant);

  return {
    title: `${grant.title} | Private grant opportunity`,
    description: grant.summary ?? undefined,
    alternates: { canonical },
    openGraph: {
      title: grant.title,
      description: grant.summary ?? undefined,
      type: "article",
    },
  };
}

export default async function PrivateGrantDetailPage({
  params,
  searchParams,
}: {
  params: MaybePromise<PrivateParams>;
  searchParams?: MaybePromise<PrivateSearchParams>;
}) {
  const resolvedParams = await resolveRouteParams(params, "private.page.params");
  const slug = typeof resolvedParams?.slug === "string" ? resolvedParams.slug : undefined;
  const grant = await loadGrant(slug, searchParams);

  if (!grant) {
    notFound();
  }

  const canonical = grantPath(grant);
  const resolvedSearchParams = await resolveSearchParams(searchParams, "private.page.searchParams");
  const currentId = extractSearchParam(resolvedSearchParams, "id");
  const currentSlug = slug ?? null;

  if (currentSlug) {
    const currentPath = `/grants/private/${currentSlug}${
      currentId ? `?id=${encodeURIComponent(currentId)}` : ""
    }`;

    if (currentPath !== canonical) {
      redirect(canonical);
    }
  } else {
    console.warn("🧭 PrivateGrantDetailPage missing slug; skipping canonical redirect", {
      context: "private.page",
    });
  }

  const location = inferGrantLocation(grant);
  if (location.jurisdiction !== "private") {
    redirect(canonical);
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: "Private & foundation", href: "/grants/private" },
    { label: grant.title, href: canonical },
  ];

  const [categoryRelated, privateRecent] = await Promise.all([
    grant.category
      ? searchGrants({
          category: grant.category,
          jurisdiction: "private",
          page: 1,
          pageSize: 6,
        })
      : Promise.resolve({ grants: [] as Grant[], total: 0, page: 1, pageSize: 6, totalPages: 0 }),
    searchGrants({
      jurisdiction: "private",
      page: 1,
      pageSize: 6,
    }),
  ]);

  const relatedCategory = (categoryRelated.grants ?? []).filter((g) => g.id !== grant.id).slice(0, 6);
  const morePrivate = (privateRecent.grants ?? [])
    .filter((g) => g.id !== grant.id && !relatedCategory.find((c) => c.id === g.id))
    .slice(0, 6 - relatedCategory.length);
  const relatedGrants = [...relatedCategory, ...morePrivate];

  const relatedLinks = [
    { label: "Private & foundation search", href: "/grants/private" },
    grant.category
      ? {
          label: `More ${grant.category} grants`,
          href: `/grants/private?category=${encodeURIComponent(grant.category)}`,
        }
      : null,
  ].filter(Boolean) as { label: string; href: string }[];

  const grantJsonLd = generateGrantJsonLd(grant, { path: canonical });

  return (
    <div className="container-grid space-y-10 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <GrantDetail grant={grant} />

      {relatedGrants.length > 0 && (
        <section className="space-y-4">
          <header>
            <h2 className="text-2xl font-semibold text-slate-900">More private & foundation programs</h2>
            <p className="text-sm text-slate-600">
              Discover additional opportunities from private foundations and corporate philanthropies.
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
