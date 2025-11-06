import { NextRequest, NextResponse } from "next/server";
import { deriveAgencySlug } from "@/lib/slug";
import { toAgency, type AgencyRow } from "@/lib/agency";
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

async function loadAgency(slug: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const { data: byCode, error: byCodeError } = await supabase
    .from("agencies")
    .select("*")
    .ilike("agency_code", slug)
    .maybeSingle();

  if (byCodeError) {
    console.error("❌ Failed to fetch agency by code", { slug, error: byCodeError });
    return null;
  }

  if (byCode) {
    return toAgency(byCode as AgencyRow, slug);
  }

  const { data: grantAgency, error: grantError } = await supabase
    .from("grants")
    .select("agency_code, agency_name, agency")
    .eq("agency_slug", slug)
    .limit(1)
    .maybeSingle();

  if (grantError) {
    console.error("❌ Failed to fetch agency fallback from grants", { slug, error: grantError });
    return null;
  }

  if (grantAgency?.agency_code) {
    const { data: fromCode, error: fromCodeError } = await supabase
      .from("agencies")
      .select("*")
      .ilike("agency_code", grantAgency.agency_code)
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

  if (grantAgency) {
    return toAgency(
      {
        id: grantAgency.agency_code ?? slug,
        agency_code: grantAgency.agency_code ?? null,
        agency_name: grantAgency.agency_name ?? grantAgency.agency ?? slug,
      },
      slug,
    );
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

  const { data: grants, error: grantsError, count } = await supabase
    .from("grants")
    .select("*", { count: "exact" })
    .eq("agency_slug", agency.slug)
    .order("title", { ascending: true })
    .range(from, to);

  if (grantsError) {
    console.error("❌ Failed to fetch grants for agency", { slug, error: grantsError });
    return NextResponse.json({ error: grantsError.message }, { status: 500 });
  }

  const normalizedGrants = (grants ?? []).map((row) => normalizeGrant(row));

  return NextResponse.json({ agency, grants: normalizedGrants, total: count ?? 0, page, pageSize });
}
