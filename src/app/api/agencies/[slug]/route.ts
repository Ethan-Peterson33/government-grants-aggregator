import { NextRequest, NextResponse } from "next/server";
import { deriveAgencySlug } from "@/lib/slug";
import {
  agencyGrantFilterClauses,
  agencySlugCandidates,
  escapeIlike,
  toAgency,
  type AgencyRow,
} from "@/lib/agency";
import type { Agency } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type GrantRow = Record<string, any>;

function normalizeGrant(row: GrantRow) {
  const agencyName = row.agency_name ?? row.agency ?? null;
  const slug =
    row.agency_slug ??
    deriveAgencySlug({ agency_code: row.agency_code ?? undefined, agency_name: agencyName ?? undefined });
  return {
    ...row,
    agency: agencyName,
    agency_name: agencyName,
    agency_slug: slug || null,
    category: row.category ?? row.category_code ?? null,
    category_code: row.category_code ?? null,
  };
}

async function loadAgencyGrantsQuery(
  supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>,
  agency: Agency,
  from: number,
  to: number,
) {
  let query = supabase
    .from("grants")
    .select("*", { count: "exact" })
    .order("title", { ascending: true })
    .range(from, to);

  const clauses = agencyGrantFilterClauses(agency);
  if (clauses.length > 0) {
    query = query.or(clauses.join(","));
  }

  return (await query) as unknown as {
    data: GrantRow[] | null;
    error: { message: string } | null;
    count: number | null;
  };
}

async function loadAgency(slug: string) {
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
      console.error("❌ Failed to fetch agency by code", { slug, error });
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
      console.error("❌ Failed to fetch agency by name", { slug, error });
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
      console.error("❌ Failed to fetch agency fallback from grants (code)", {
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
          console.error("❌ Failed to fetch agency using grant code", {
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
      console.error("❌ Failed to fetch agency fallback from grants (name)", {
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
          console.error("❌ Failed to fetch agency using grant code", {
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "12", 10) || 12));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { slug } = await context.params;

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase client unavailable" }, { status: 500 });
  }

  const agency = await loadAgency(slug);
  if (!agency) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: grants, error: grantsError, count } = await loadAgencyGrantsQuery(
    supabase,
    agency,
    from,
    to,
  );

  if (grantsError) {
    console.error("❌ Failed to fetch grants for agency", { slug, error: grantsError });
    return NextResponse.json({ error: grantsError.message }, { status: 500 });
  }

  const normalizedGrants = (grants ?? []).map((row) => normalizeGrant(row));

  return NextResponse.json({ agency, grants: normalizedGrants, total: count ?? 0, page, pageSize });
}
