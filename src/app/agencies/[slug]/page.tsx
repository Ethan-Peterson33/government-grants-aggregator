import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { deriveAgencySlug } from "@/lib/slug";
import {
  agencyGrantFilterClauses,
  agencySlugCandidates,
  escapeIlike,
  toAgency,
  type AgencyRow,
} from "@/lib/agency";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber } from "@/lib/search";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Agency, Grant } from "@/lib/types";

type GrantRow = Record<string, any>;

function normalizeGrant(row: GrantRow): Grant {
  const agencyName = row.agency_name ?? row.agency ?? null;
  const categoryLabel = row.category ?? row.category_code ?? null;
  const slug =
    row.agency_slug ??
    deriveAgencySlug({ agency_code: row.agency_code ?? undefined, agency_name: agencyName ?? undefined });
  return {
    ...row,
    agency: agencyName,
    agency_name: agencyName,
    agency_slug: slug || null,
    category: categoryLabel,
    category_code: row.category_code ?? null,
  } as Grant;
}

async function loadAgency(slug: string): Promise<Agency | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const candidates = agencySlugCandidates(slug);

  if (candidates.codeCandidates.length > 0) {
    const codeClauses = candidates.codeCandidates.map(
      (code) => `agency_code.ilike.${escapeIlike(code)}`,
    );
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .or(codeClauses.join(","))
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("❌ Failed to load agency by code", { slug, error });
    } else if (data) {
      return toAgency(data as AgencyRow, slug);
    }
  }

  if (candidates.nameFragment) {
    const pattern = `%${escapeIlike(candidates.nameFragment)}%`;
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .ilike("agency_name", pattern)
      .order("agency_name", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("❌ Failed to load agency by name", { slug, error });
    } else if (data) {
      return toAgency(data as AgencyRow, slug);
    }
  }

  for (const code of candidates.codeCandidates) {
    const { data: grantAgency, error: grantError } = await supabase
      .from("grants")
      .select("agency_code, agency_name, agency")
      .ilike("agency_code", escapeIlike(code))
      .limit(1)
      .maybeSingle();

    if (grantError) {
      console.error("❌ Failed to load fallback agency from grants (code)", {
        slug,
        code,
        error: grantError,
      });
      continue;
    }

    if (grantAgency) {
      if (grantAgency.agency_code) {
        const { data: fromCode, error: fromCodeError } = await supabase
          .from("agencies")
          .select("*")
          .ilike("agency_code", escapeIlike(grantAgency.agency_code))
          .limit(1)
          .maybeSingle();

        if (fromCodeError) {
          console.error("❌ Failed to load agency using grant code", {
            slug,
            agency_code: grantAgency.agency_code,
            error: fromCodeError,
          });
        } else if (fromCode) {
          return toAgency(fromCode as AgencyRow, slug);
        }
      }

      return toAgency(
        {
          id: grantAgency.agency_code ?? slug,
          agency_code: grantAgency.agency_code ?? null,
          agency_name: grantAgency.agency_name ?? grantAgency.agency ?? slug,
        },
        slug,
      );
    }
  }

  if (candidates.nameFragment) {
    const pattern = `%${escapeIlike(candidates.nameFragment)}%`;
    const { data: grantAgency, error: grantError } = await supabase
      .from("grants")
      .select("agency_code, agency_name, agency")
      .or(`agency_name.ilike.${pattern},agency.ilike.${pattern}`)
      .limit(1)
      .maybeSingle();

    if (grantError) {
      console.error("❌ Failed to load fallback agency from grants (name)", {
        slug,
        error: grantError,
      });
    } else if (grantAgency) {
      if (grantAgency.agency_code) {
        const { data: fromCode, error: fromCodeError } = await supabase
          .from("agencies")
          .select("*")
          .ilike("agency_code", escapeIlike(grantAgency.agency_code))
          .limit(1)
          .maybeSingle();

        if (fromCodeError) {
          console.error("❌ Failed to load agency using grant code", {
            slug,
            agency_code: grantAgency.agency_code,
            error: fromCodeError,
          });
        } else if (fromCode) {
          return toAgency(fromCode as AgencyRow, slug);
        }
      }

      return toAgency(
        {
          id: grantAgency.agency_code ?? slug,
          agency_code: grantAgency.agency_code ?? null,
          agency_name: grantAgency.agency_name ?? grantAgency.agency ?? slug,
        },
        slug,
      );
    }
  }

  return null;
}

async function loadAgencyGrants(agency: Agency, page: number, pageSize: number) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return { grants: [] as Grant[], total: 0 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("grants")
    .select("*", { count: "exact" })
    .order("title", { ascending: true })
    .range(from, to);

  const clauses = agencyGrantFilterClauses(agency);
  if (clauses.length > 0) {
    query = query.or(clauses.join(","));
  }

  const { data, error, count } = (await query) as unknown as {
    data: GrantRow[] | null;
    error: { message: string } | null;
    count: number | null;
  };

  if (error) {
    console.error("❌ Failed to load grants for agency", { slug: agency.slug, error });
    return { grants: [] as Grant[], total: 0 };
  }

  const grants = (data ?? []).map((row) => normalizeGrant(row));
  return { grants, total: count ?? grants.length };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const agency = await loadAgency(params.slug);
  if (!agency) {
    return { title: "Agency Not Found" };
  }
  return {
    title: `${agency.agency_name} Grants`,
    description: agency.description ?? `Explore grants from ${agency.agency_name}.`,
  };
}

export default async function AgencyPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = safeNumber(searchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(searchParams?.pageSize, 12));

  const agency = await loadAgency(params.slug);
  if (!agency) {
    notFound();
  }

  const { grants, total } = await loadAgencyGrants(agency, page, pageSize);
  const sortedGrants = [...grants].sort((a, b) =>
    (a.title ?? "").localeCompare(b.title ?? "", undefined, { sensitivity: "base" })
  );

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: agency.agency_name, href: `/agencies/${agency.slug}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(sortedGrants);

  const getHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (targetPage > 1) params.set("page", String(targetPage));
    if (pageSize !== 12) params.set("pageSize", String(pageSize));
    const query = params.toString();
    return query ? `/agencies/${agency.slug}?${query}` : `/agencies/${agency.slug}`;
  };

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{agency.agency_name}</h1>
        {agency.description && <p className="text-slate-700">{agency.description}</p>}
        {agency.website && (
          <p className="text-sm">
            Website:{" "}
            <a
              className="text-blue-600 underline"
              href={agency.website}
              target="_blank"
              rel="noreferrer"
            >
              {agency.website}
            </a>
          </p>
        )}
      </header>

      <section className="space-y-4">
        <div className="space-y-4">
          {sortedGrants.length ? (
            sortedGrants.map((grant) => <GrantCard key={grant.id} grant={grant} />)
          ) : (
            <div className="rounded-md border border-slate-200 p-8 text-center text-slate-600">
              No grants published yet for this agency.
            </div>
          )}
        </div>
        {sortedGrants.length > 0 && (
          <Pagination total={total} pageSize={pageSize} currentPage={page} getHref={getHref} />
        )}
      </section>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateBreadcrumbJsonLd(
              breadcrumbItems.map((item) => ({ name: item.label, url: item.href })),
            ),
            itemListJsonLd,
          ]),
        }}
      />
    </div>
  );
}
