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
import { cityNameFromSlug, resolveStateParam } from "@/lib/grant-location";
import { inferGrantLocation } from "@/lib/grant-location";
import { generateBreadcrumbJsonLd, generateGrantJsonLd } from "@/lib/seo";
import { searchGrants } from "@/lib/search";
import { grantPath } from "@/lib/slug";
import type { Grant } from "@/lib/types";

type LocalParams = { stateCode: string; citySlug: string; slug: string };

type LocalSearchParams = SearchParamsLike;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ stateCode: string; citySlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  // ✅ Unwrap async params
  const resolvedParams = await params;
  const resolvedSearch = searchParams ? await searchParams : {};

  const stateInfo = resolveStateParam(resolvedParams?.stateCode ?? "");
  const cityName = cityNameFromSlug(resolvedParams?.citySlug ?? "");
  const rawCategory =
    typeof resolvedSearch?.category === "string" ? resolvedSearch.category : undefined;
  const category = formatCategory(rawCategory);

  return {
    title: `${cityName}, ${stateInfo.name} ${category ? category + " Grants" : "Grants"}`,
    description: `Discover ${
      category ? category.toLowerCase() + " " : ""
    }grants and funding opportunities in ${cityName}, ${stateInfo.name}.`,
  };
}

export default async function LocalGrantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ stateCode: string; citySlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = searchParams ? await searchParams : {};

  // ✅ SAFETY GUARD
  if (resolvedParams.stateCode?.toLowerCase() === "category") {
    redirect(`/grants/category/${resolvedParams.citySlug}`);
  }

  const stateInfo = resolveStateParam(resolvedParams?.stateCode ?? "");
  const citySlug = resolvedParams?.citySlug ?? "";
  const cityName = cityNameFromSlug(citySlug);
  const grant = await loadGrant(slug, searchParams);

  if (!grant) {
    notFound();
  }

  const canonical = grantPath(grant);
  const resolvedSearchParams = await resolveSearchParams(searchParams, "local.page.searchParams");
  const currentId = extractSearchParam(resolvedSearchParams, "id");
  const currentSlug = slug ?? null;

  if (currentSlug) {
    const currentPath = `/grants/local/${stateInfo.code}/${citySlug}/${currentSlug}${
      currentId ? `?id=${encodeURIComponent(currentId)}` : ""
    }`;

    if (currentPath !== canonical) {
      redirect(canonical);
    }
  } else {
    console.warn("🧭 LocalGrantDetailPage missing slug; skipping canonical redirect", {
      context: "local.page",
      stateCode,
      citySlug,
    });
  }

  const location = inferGrantLocation(grant);
  if (
    location.jurisdiction !== "local" ||
    location.stateCode.toUpperCase() !== stateInfo.code.toUpperCase() ||
    location.citySlug !== citySlug
  ) {
    redirect(canonical);
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: stateInfo.name, href: `/grants/state/${stateInfo.code}` },
    { label: cityName, href: `/grants/local/${stateInfo.code}/${citySlug}` },
    { label: grant.title, href: canonical },
  ];

  const [categoryRelated, cityRelated] = await Promise.all([
    grant.category
      ? searchGrants({
          stateCode: stateInfo.code,
          state: stateInfo.name,
          city: cityName,
          category: grant.category,
          jurisdiction: "local",
          page: 1,
          pageSize: 6,
        })
      : Promise.resolve({ grants: [] as Grant[], total: 0, page: 1, pageSize: 6, totalPages: 0 }),
    searchGrants({
      stateCode: stateInfo.code,
      state: stateInfo.name,
      city: cityName,
      jurisdiction: "local",
      page: 1,
      pageSize: 6,
    }),
  ]);

  const relatedCategory = (categoryRelated.grants ?? []).filter((g) => g.id !== grant.id).slice(0, 6);
  const additionalLocal = (cityRelated.grants ?? [])
    .filter((g) => g.id !== grant.id && !relatedCategory.find((c) => c.id === g.id))
    .slice(0, 6 - relatedCategory.length);
  const relatedGrants = [...relatedCategory, ...additionalLocal];

  const relatedLinks = [
    { label: `${stateInfo.name} statewide grants`, href: `/grants/state/${stateInfo.code}` },
    { label: "Federal programs", href: "/grants/federal" },
  ];

  const grantJsonLd = generateGrantJsonLd(grant, { path: canonical });

  return (
    <div className="container-grid space-y-10 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <GrantDetail grant={grant} />

      {relatedGrants.length > 0 && (
        <section className="space-y-4">
          <header>
            <h2 className="text-2xl font-semibold text-slate-900">More opportunities in {cityName}</h2>
            <p className="text-sm text-slate-600">
              Continue exploring grants that invest in organizations throughout {cityName}, {stateInfo.code}.
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
