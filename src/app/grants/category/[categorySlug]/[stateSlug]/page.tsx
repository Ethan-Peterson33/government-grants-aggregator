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
  console.group("🧭 [Metadata Generation] Category/State Page");

  try {
    const resolvedParams = await resolveRouteParams(params, "category-state.metadata");
    console.log("➡️ Resolved Params:", resolvedParams);
    if (!resolvedParams) {
      console.warn("⚠️ No route parameters resolved.");
      console.groupEnd();
      return {};
    }

    const context = await loadContext(resolvedParams);
    console.log("📦 Loaded Context:", context);
    if (!context) {
      console.warn("⚠️ Context could not be loaded.");
      console.groupEnd();
      return {};
    }

    const { copy, categoryLabel } = buildCopy(context);
    console.log("🧩 buildCopy Result:", { copy, categoryLabel });

    const defaultTitle = `${context.state.name} ${categoryLabel} Grants | GrantDirectory.org`;
    const title = copy?.seoTitle ?? defaultTitle;

    const description =
      copy?.seoDescription ??
      `Browse ${categoryLabel.toLowerCase()} grants available in ${context.state.name}, including state and local programs.`;

    const canonical = `https://www.grantdirectory.org/grants/category/${context.category.slug}/${context.stateSlug}`;
    const ogImageUrl = `https://www.grantdirectory.org/images/${context.stateSlug}-grants.jpg`;

    // Log the final metadata for inspection
    console.log("✅ Final Metadata:", {
      title,
      description,
      canonical,
      ogImageUrl,
    });

    console.groupEnd();

    return {
      title,
      description,
      alternates: { canonical },
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
            alt: `${context.state.name} ${categoryLabel} Grants`,
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
  } catch (error) {
    console.error("❌ [Metadata Error]:", error);
    console.groupEnd();
    return {};
  }
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

     {/* HERO */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-sky-50 to-blue-50 px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        <style>{`
          @keyframes category-state-hero-fade-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .category-state-hero-fade-up {
            opacity: 0;
            transform: translateY(20px);
            animation: category-state-hero-fade-up 0.85s ease-out forwards;
          }
        `}</style>

        {/* Subtle blurred background image */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div
            className="h-full w-full bg-cover bg-center blur-sm"
            style={{
              backgroundImage:
                "url('https://images.pexels.com/photos/7579121/pexels-photo-7579121.jpeg?auto=compress&cs=tinysrgb&w=1600')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/90 via-sky-50/90 to-blue-50/95" />
        </div>

        <div className="relative z-10 space-y-6">
          <p className="category-state-hero-fade-up text-xs font-semibold uppercase tracking-wide text-blue-700 [animation-delay:0.02s]">
            {context.state.name} • {categoryLabel} programs
          </p>

          <div className="space-y-4">
            <h1 className="category-state-hero-fade-up text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl [animation-delay:0.06s]">
              {heading}
            </h1>
            <p className="category-state-hero-fade-up text-sm text-slate-700 sm:text-base lg:text-lg [animation-delay:0.12s]">
              {intro}
            </p>
          </div>

          {/* CTAs */}
          <div className="category-state-hero-fade-up flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:0.18s]">
            <a
              href="#category-state-list"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-300/70 transition hover:bg-emerald-700 hover:shadow-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              View all programs below
            </a>
            <a
              href={`/grants/category/${context.category.slug}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:bg-slate-900 hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Browse all {categoryLabel.toLowerCase()} grants
            </a>
          </div>

          {/* Meta / trust line */}
          <p className="category-state-hero-fade-up text-xs font-medium uppercase tracking-wide text-slate-600 sm:text-sm [animation-delay:0.24s]">
            {grants.length > 0
              ? `${grants.length.toLocaleString()} active program${
                  grants.length === 1 ? "" : "s"
                } in ${context.state.name}`
              : `No active programs found yet in ${context.state.name} — new grants added weekly.`}
          </p>
        </div>
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
