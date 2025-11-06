import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (agencyError) {
    console.error("❌ Failed to fetch agency", { slug, error: agencyError });
    return NextResponse.json({ error: agencyError.message }, { status: 500 });
  }

  if (!agency) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: grants, error: grantsError, count } = await supabase
    .from("grants")
    .select("*", { count: "exact" })
    .eq("agency_slug", slug)
    .order("title", { ascending: true })
    .range(from, to);

  if (grantsError) {
    console.error("❌ Failed to fetch grants for agency", { slug, error: grantsError });
    return NextResponse.json({ error: grantsError.message }, { status: 500 });
  }

  return NextResponse.json({ agency, grants: grants ?? [], total: count ?? 0, page, pageSize });
}
