"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type CategoryStateFthbFiltersProps = {
  applicantTypeFacets: { value: string; label: string; grantCount: number }[];
  geographyScopeFacets: { value: string; label: string; grantCount: number }[];
  initialValue: {
    applicantTypes: string[];
    geographyScope?: string | null;
  };
};

export function CategoryStateFthbFilters({
  applicantTypeFacets,
  geographyScopeFacets,
  initialValue,
}: CategoryStateFthbFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState<{ applicantTypes: string[]; geographyScope: string | null }>(() => ({
    applicantTypes: initialValue.applicantTypes ?? [],
    geographyScope: initialValue.geographyScope ?? null,
  }));
  const [isPending, startTransition] = useTransition();

  const hasFacets = useMemo(
    () => applicantTypeFacets.length > 0 || geographyScopeFacets.length > 0,
    [applicantTypeFacets.length, geographyScopeFacets.length]
  );

  const updateUrl = (next: { applicantTypes: string[]; geographyScope: string | null }) => {
    const params = new URLSearchParams(searchParams?.toString());

    if (next.applicantTypes.length > 0) {
      params.set("applicant_types", next.applicantTypes.join(","));
    } else {
      params.delete("applicant_types");
    }

    if (next.geographyScope) {
      params.set("geography_scope", next.geographyScope);
    } else {
      params.delete("geography_scope");
    }

    params.delete("page");

    const query = params.toString();

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const toggleApplicantType = (type: string) => {
    const set = new Set(value.applicantTypes ?? []);
    if (set.has(type)) set.delete(type);
    else set.add(type);

    const next = { ...value, applicantTypes: Array.from(set) };
    setValue(next);
    updateUrl(next);
  };

  const changeGeographyScope = (scope: string | null) => {
    const next = { ...value, geographyScope: scope };
    setValue(next);
    updateUrl(next);
  };

  if (!hasFacets) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Narrow first-time homebuyer grants
        </h2>
        {isPending ? <span className="text-xs text-emerald-700">Updating…</span> : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600">Applicant type</p>
        <div className="flex flex-wrap gap-2">
          {applicantTypeFacets.map((facet) => {
            const active = value.applicantTypes?.includes(facet.value);
            return (
              <button
                key={facet.value}
                type="button"
                onClick={() => toggleApplicantType(facet.value)}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {facet.label}
                <span className="ml-1 text-[10px] text-slate-400">({facet.grantCount})</span>
              </button>
            );
          })}
          {applicantTypeFacets.length === 0 ? (
            <span className="text-xs text-slate-500">No applicant type filters available yet.</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600">Geography</p>
        <select
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
          value={value.geographyScope ?? ""}
          onChange={(e) => changeGeographyScope(e.target.value || null)}
        >
          <option value="">All areas in this state</option>
          {geographyScopeFacets.map((facet) => (
            <option key={facet.value} value={facet.value}>
              {facet.label} ({facet.grantCount})
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
