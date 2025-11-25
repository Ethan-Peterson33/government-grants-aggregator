import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { GrantDetail } from "@/components/grants/grant-detail";
import { RelatedLinks } from "@/components/grants/related-links";
import { loadGrant } from "@/app/grants/_components/load-grant";
import { AffiliateOfferCard } from "@/components/affiliate-offer-card";
import {
  extractSearchParam,
  resolveRouteParams,
  resolveSearchParams,
  type MaybePromise,
  type SearchParamsLike,
} from "@/app/grants/_components/route-params";
import { resolveStateParam, inferGrantLocation } from "@/lib/grant-location";
import { generateBreadcrumbJsonLd, generateGrantJsonLd } from "@/lib/seo";
import { searchGrants } from "@/lib/search";
import { grantPath } from "@/lib/slug";
import type { Grant } from "@/lib/types";
import { digitalProducts } from "@/config/digital-products";
import { wordsFromSlug } from "@/lib/strings";

type StateParams = { stateCode: string; slug: string };
type StateSearchParams = SearchParamsLike;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: MaybePromise<StateParams>;
  searchParams?: MaybePromise<StateSearchParams>;
}): Promise<Metadata> {
  const resolvedParams = await resolveRouteParams(params, "state.generateMetadata.params");
  const stateCode = typeof resolvedParams?.stateCode === "string" ? resolvedParams.stateCode : "";
  const slug = typeof resolvedParams?.slug === "string" ? resolvedParams.slug : undefined;
  const stateInfo = resolveStateParam(stateCode);

  const grant = await loadGrant(slug, searchParams);

  if (!grant) {
    return {
      title: "Grant Not Found",
      description: `We could not locate that program. Browse more statewide opportunities in ${stateInfo.name}.`,
    };
  }

  const canonical = grantPath(grant);

  return {
    title: `${grant.title} | ${stateInfo.name} grant`,
    description: grant.summary ?? undefined,
    alternates: { canonical },
    openGraph: {
      title: grant.title,
      description: grant.summary ?? undefined,
      type: "article",
    },
  };
}

export default async function StateGrantDetailPage({
  params,
  searchParams,
}: {
  params: MaybePromise<StateParams>;
  searchParams?: MaybePromise<StateSearchParams>;
}) {
  const resolvedParams = await resolveRouteParams(params, "state.page.params");
  const stateCode = typeof resolvedParams?.stateCode === "string" ? resolvedParams.stateCode : "";
  const slug = typeof resolvedParams?.slug === "string" ? resolvedParams.slug : undefined;

  const stateInfo = resolveStateParam(stateCode);
  const grant = await loadGrant(slug, searchParams);

  if (!grant) {
    notFound();
  }

  const canonical = grantPath(grant);
  const resolvedSearchParams = await resolveSearchParams(searchParams, "state.page.searchParams");
  const currentId = extractSearchParam(resolvedSearchParams, "id");
  const currentSlug = slug ?? null;

  if (currentSlug) {
    const currentPath = `/grants/state/${stateInfo.code}/${currentSlug}${
      currentId ? `?id=${encodeURIComponent(currentId)}` : ""
    }`;

    if (currentPath !== canonical) {
      redirect(canonical);
    }
  } else {
    console.warn("🧭 StateGrantDetailPage missing slug; skipping canonical redirect", {
      context: "state.page",
      stateCode,
    });
  }

  const location = inferGrantLocation(grant);
  if (location.jurisdiction !== "state" || location.stateCode.toUpperCase() !== stateInfo.code.toUpperCase()) {
    redirect(canonical);
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: stateInfo.name, href: `/grants/state/${stateInfo.code}` },
    { label: grant.title, href: canonical },
  ];

  const [categoryRelated, statewideRelated] = await Promise.all([
    grant.category
      ? searchGrants({
          stateCode: stateInfo.code,
          state: stateInfo.name,
          category: grant.category,
          jurisdiction: "state",
          page: 1,
          pageSize: 6,
        })
      : Promise.resolve({ grants: [] as Grant[], total: 0, page: 1, pageSize: 6, totalPages: 0 }),
    searchGrants({
      stateCode: stateInfo.code,
      state: stateInfo.name,
      jurisdiction: "state",
      page: 1,
      pageSize: 6,
    }),
  ]);

  const relatedCategory = (categoryRelated.grants ?? []).filter((g) => g.id !== grant.id).slice(0, 6);
  const additionalStatewide = (statewideRelated.grants ?? [])
    .filter((g) => g.id !== grant.id && !relatedCategory.find((c) => c.id === g.id))
    .slice(0, 6 - relatedCategory.length);
  const relatedGrants = [...relatedCategory, ...additionalStatewide];

  const categorySlug = grant.grant_categories?.slug ?? grant.category ?? undefined;
  const categoryLabel =
    grant.grant_categories?.category_label ?? (categorySlug ? wordsFromSlug(categorySlug) : null);

  const relatedLinks = [
    { label: "Federal grants", href: "/grants/federal" },
    {
      label: `Search all ${stateInfo.code} funding`,
      href: `/grants?state=${encodeURIComponent(stateInfo.code)}`,
    },
    ...(categorySlug
      ? [
          {
            label: `${stateInfo.name} ${categoryLabel ?? "category"} grants`,
            href: `/grants/category/${categorySlug}/${stateInfo.code}`,
          },
        ]
      : []),
  ];

  const grantJsonLd = generateGrantJsonLd(grant, { path: canonical });

  // ✅ Pick a digital product to feature (e.g., homebuyer toolkit)
  const digitalProduct = digitalProducts.find((product) => product.category === "homebuyer");

  return (
    <div className="container-grid space-y-10 py-10">
      <Breadcrumb items={breadcrumbItems} />

      <GrantDetail grant={grant} />

      {digitalProduct ? (
        <AffiliateOfferCard
          offer={{
            title: digitalProduct.name,
            description: digitalProduct.shortDescription,
            href: `/resources/${digitalProduct.slug}`,
            cta: "View digital guide",
            secondaryHref: digitalProduct.lemonSqueezyUrl,
            secondaryCta: "Buy now",
            tags: digitalProduct.tags,
            color: "blue",
            secondaryExternal: true,
          }}
        />
      ) : null}

      {relatedGrants.length > 0 && (
        <section className="space-y-4">
          <header>
            <h2 className="text-2xl font-semibold text-slate-900">More statewide programs</h2>
            <p className="text-sm text-slate-600">
              Explore additional grants available throughout {stateInfo.name} that complement this opportunity.
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
            generateBreadcrumbJsonLd(
              breadcrumbItems.map((item) => ({ name: item.label, url: item.href })),
            ),
            grantJsonLd,
          ]),
        }}
      />
    </div>
  );
}
