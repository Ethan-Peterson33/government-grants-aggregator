import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { categoryStateCopy } from "@/content/categoryStateCopy";
import { resolveRouteParams } from "@/app/grants/_components/route-params";
import { resolveStateParam, stateNameCandidatesFromCode } from "@/lib/grant-location";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Grant } from "@/lib/types";
import { wordsFromSlug } from "@/lib/strings";

const PAGE_SIZE = 100;

type Params = { categorySlug: string; stateSlug: string };

type CategoryRecord = {
  category_code: string;
  category_label: string;
  slug: string;
};

type PageContext = {
  category: CategoryRecord;
  state: { code: string; name: string };
  stateSlug: string;
};

async function loadCategory(categorySlug: string): Promise<CategoryRecord | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("grant_categories")
    .select("category_code, category_label, slug")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (error) {
    console.error("[category-state] Error loading category", { categorySlug, error });
    return null;
  }

  return data ?? null;
}

function buildStateCandidates(code: string, name: string) {
  const values = new Set<string>();
  if (code) {
    values.add(code);
    values.add(code.toUpperCase());
    values.add(code.toLowerCase());
  }

  const normalizedName = wordsFromSlug(name) || name;
  if (normalizedName) {
    values.add(normalizedName);
    values.add(normalizedName.toUpperCase());
  }

  for (const candidate of stateNameCandidatesFromCode(code)) {
    values.add(candidate);
  }

  return Array.from(values).filter(Boolean);
}

async function loadContext(params: Params): Promise<PageContext | null> {
  const category = await loadCategory(params.categorySlug);
  const stateInfo = resolveStateParam(params.stateSlug);

  if (!category || !stateInfo.code) {
    return null;
  }

  return { category, state: stateInfo, stateSlug: params.stateSlug };
}

async function loadCategoryStateGrants(category: CategoryRecord, state: { code: string; name: string }) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const stateCandidates = buildStateCandidates(state.code, state.name);

  let query = supabase
    .from("grants")
    .select("*")
    .eq("category_code", category.category_code)
    .in("state", stateCandidates)
    .order("scraped_at", { ascending: false })
    .limit(PAGE_SIZE);

  query = query.or("active.is.null,active.eq.true");

  const { data, error } = await query;

  if (error) {
    console.error("[category-state] Error loading grants", { category: category.slug, state: state.code, error });
    return [];
  }

  return (data ?? []) as Grant[];
}

function buildCopy(context: PageContext) {
  const copy = categoryStateCopy[context.category.slug]?.[context.stateSlug];
  const categoryLabel = context.category.category_label || wordsFromSlug(context.category.slug) || "Category";
  const heading =
    copy?.heading ?? `${categoryLabel} grants in ${context.state.name}`;
  const intro =
    copy?.intro ?? `Browse ${categoryLabel.toLowerCase()} grants available in ${context.state.name}, including statewide and local programs.`;

  return { copy, heading, intro, categoryLabel };
}

export async function generateMetadata({ params }: { params: Params | Promise<Params> }): Promise<Metadata> {
  const resolvedParams = await resolveRouteParams(params, "category-state.metadata");
  if (!resolvedParams) return {};

  const context = await loadContext(resolvedParams);
  if (!context) return {};

  const { copy, categoryLabel } = buildCopy(context);

  const title =
    copy?.seoTitle ??
    `${categoryLabel} Grants in ${context.state.name} | GrantDirectory.org`;

  const description =
    copy?.seoDescription ??
    `Browse ${categoryLabel.toLowerCase()} grants available in ${context.state.name}, including state and local programs.`;

  const canonical = `https://www.grantdirectory.org/grants/category/${context.category.slug}/${context.stateSlug}`;

  const ogImageUrl = `https://www.grantdirectory.org/images/${context.stateSlug}-grants.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Grant Directory",
      type: "article",
      locale: "en_US",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${context.state.name} ${categoryLabel} grants`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}


export default async function CategoryStatePage({ params }: { params: Params | Promise<Params> }) {
  const resolvedParams = await resolveRouteParams(params, "category-state.page");
  if (!resolvedParams) return notFound();

  const context = await loadContext(resolvedParams);
  if (!context) return notFound();

  const { heading, intro, categoryLabel } = buildCopy(context);
  const grants = await loadCategoryStateGrants(context.category, context.state);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: categoryLabel, href: `/grants/category/${context.category.slug}` },
    { label: `${context.state.name} ${categoryLabel}`, href: `/grants/category/${context.category.slug}/${context.stateSlug}` },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumb items={breadcrumbItems} />

      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-800">{heading}</h1>
        <p className="text-slate-600">{intro}</p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {grants.length > 0
              ? `${grants.length} grant${grants.length === 1 ? "" : "s"} available`
              : "No grants found for this category and state combination yet."}
          </p>
        </div>

        {grants.length > 0 ? (
          <div className="grid gap-4">
            {grants.map((grant) => (
              <GrantCard key={grant.id} grant={grant} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-700">
            <p>
              We couldn&apos;t find any active grants for this category in {context.state.name} yet. Try exploring statewide grants or a different focus area.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
