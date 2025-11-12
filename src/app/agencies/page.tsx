// src/app/agencies/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Agency } from "@/lib/types";

export const metadata: Metadata = {
  title: "Agencies | Grant Directory",
  description: "Browse federal agencies and explore the grants they offer.",
};

export default async function AgenciesIndexPage() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.warn("Supabase client unavailable in AgenciesIndexPage");
    return (
      <div className="container-grid py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Agencies</h1>
        <p className="mt-2 text-slate-600">
          We couldn’t load the agency list right now. Please try again later.
        </p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("agencies")
    .select("id, agency_code, agency_name, description, website, updated_at")
    .order("agency_name", { ascending: true });

  if (error) {
    console.error("❌ Error loading agencies for index page:", error);
  }

  const agencies: Agency[] = (data ?? []).map((row: any) => ({
    id: row.id,
    slug: row.agency_code || row.id, // temporary slug based on agency_code
    agency_name: row.agency_name,
    agency_code: row.agency_code ?? null,
    description: row.description ?? null,
    website: row.website ?? null,
    contacts: null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }));

  return (
    <div className="container-grid space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Grant-making agencies</h1>
        <p className="text-slate-600 max-w-2xl">
          Browse federal agencies that publish funding opportunities. Select an
          agency to explore its current grants and programs.
        </p>
      </header>

      {agencies.length === 0 ? (
        <p className="text-sm text-slate-600">
          No agencies found yet. Check back soon as we continue to add more data.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agencies.map((agency) => (
            <article
              key={agency.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <h2 className="text-base font-semibold text-slate-900">
                <Link
                  href={`/agencies/${encodeURIComponent(
                    agency.agency_code || agency.slug || agency.id
                  )}`}
                  className="hover:underline"
                >
                  {agency.agency_name}
                </Link>
              </h2>

              {agency.description && (
                <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                  {agency.description}
                </p>
              )}

              {agency.website && (
                <div className="mt-3 text-xs">
                  <a
                    href={agency.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Visit site
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
