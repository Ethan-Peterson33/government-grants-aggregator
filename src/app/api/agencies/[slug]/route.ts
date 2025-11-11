import { NextRequest, NextResponse } from "next/server";
import { findAgencyBySlug } from "@/lib/agency";
import { searchGrants } from "@/lib/search";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "12", 10) || 12));
  const resolvedParams = await context.params;
  console.log({ scope: "agency.api", message: "API request params", params: resolvedParams });
  const { slug: slugValue } = resolvedParams;
  const slug = typeof slugValue === "string" ? slugValue.trim() : "";
  console.log({ scope: "agency.api", message: "Computed slug value", slugValue, slug });

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error({ scope: "agency.api", message: "Supabase client unavailable", slug });
    return NextResponse.json({ error: "Supabase client unavailable" }, { status: 500 });
  }

  if (!slug) {
    console.error({ scope: "agency.api", message: "Missing slug parameter", slugValue });
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const agency = await findAgencyBySlug(supabase, slug, { logScope: "agency.api" });
  if (!agency) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await searchGrants({
    page,
    pageSize,
    agency: agency.agency_name,
    agencySlug: agency.slug ?? undefined,
    agencyCode: agency.agency_code ?? undefined,
  });

  return NextResponse.json({
    agency,
    grants: result.grants,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  });
}
