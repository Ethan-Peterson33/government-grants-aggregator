import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function escapeIlike(value: string): string {
  return value.replace(/[%_]/g, (m) => `\\${m}`).replace(/'/g, "''");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ agencies: [], total: 0, page, pageSize });
  }

  let query = supabase
    .from("agencies")
    .select("*", { count: "exact" })
    .order("agency_name", { ascending: true })
    .range(from, to);

  if (q) {
    const sanitized = escapeIlike(q);
    const clauses = [
      `slug.ilike.%${sanitized}%`,
      `agency_name.ilike.%${sanitized}%`,
      `agency_code.ilike.%${sanitized}%`,
    ];
    query = query.or(clauses.join(","));
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("❌ Failed to fetch agencies", { error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ agencies: data ?? [], total: count ?? 0, page, pageSize });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, agency_name, agency_code, description, website, contacts } = body ?? {};

  if (!slug || !agency_name) {
    return NextResponse.json({ error: "slug and agency_name required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase client unavailable" }, { status: 500 });
  }

  const payload = {
    slug,
    agency_name,
    agency_code: agency_code ?? null,
    description: description ?? null,
    website: website ?? null,
    contacts: contacts ?? null,
  };

  const { data, error } = await supabase
    .from("agencies")
    .upsert(payload, { onConflict: "slug" })
    .select()
    .limit(1);

  if (error) {
    console.error("❌ Failed to upsert agency", { slug, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [agency] = data ?? [];
  return NextResponse.json(agency ?? payload);
}
