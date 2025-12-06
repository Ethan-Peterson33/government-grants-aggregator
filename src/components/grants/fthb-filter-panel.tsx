"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  applicantTypes: string[];
};

const parseSelections = (searchParams: URLSearchParams) => {
  const applicantTypesRaw = searchParams.get("applicant_types") ?? "";

  const applicantTypes = applicantTypesRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return { applicantTypes };
};

export function FthbFilterPanel({ applicantTypes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parsed = useMemo(
    () => parseSelections(searchParams),
    [searchParams]
  );

  const normalizedApplicantTypes = useMemo(
    () => Array.from(new Set(applicantTypes)).filter(Boolean),
    [applicantTypes]
  );

  const updateSearchParams = (nextApplicants: string[]) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextApplicants.length > 0) {
      params.set("applicant_types", nextApplicants.join(","));
    } else {
      params.delete("applicant_types");
    }

    params.delete("page");

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const toggleApplicantType = (value: string) => {
    const next = new Set(parsed.applicantTypes);
    if (next.has(value)) next.delete(value);
    else next.add(value);

    updateSearchParams(Array.from(next));
  };

  const hasSelections = parsed.applicantTypes.length > 0;

  return (
    <div className="space-y-3 rounded-lg border border-blue-100 bg-white/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            First-time homebuyer filters
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            Tailor these grants to your situation
          </h3>
          <p className="text-sm text-slate-600">
            Narrow the list by applicant type. Selections update the results
            instantly and are saved in the URL.
          </p>
        </div>

        {hasSelections && (
          <button
            type="button"
            onClick={() => updateSearchParams([])}
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Applicant type (choose any)
        </p>

        {normalizedApplicantTypes.length === 0 && (
          <p className="text-sm text-slate-600">
            No applicant-specific filters are available for this state yet.
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {normalizedApplicantTypes.map((type) => {
            const id = `fthb-applicant-${type}`;
            const checked = parsed.applicantTypes.includes(type);

            return (
              <label
                key={type}
                htmlFor={id}
                className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-blue-300"
              >
                <input
                  id={id}
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={checked}
                  onChange={() => toggleApplicantType(type)}
                />
                <span>{type}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
