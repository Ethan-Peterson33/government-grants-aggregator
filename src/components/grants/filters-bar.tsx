"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Input } from "@/components/ui/input";

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterState = {
  query: string;
  category: string;
  state: string;
  agency: string;
  hasApplyLink: boolean;
};

export type FiltersBarChangeContext = {
  reason: "submit" | "change" | "debounced";
};

type FiltersBarProps = {
  filters?: Partial<FilterState>;
  categories?: FilterOption[];
  states?: FilterOption[];
  agencies?: FilterOption[];
  isLoading?: boolean;
  lockedFilters?: Partial<FilterState>;
  showStateFilter?: boolean;
  onFiltersChange?: (next: FilterState, context: FiltersBarChangeContext) => void;
};

/** Full 50-state fallback if backend hasn’t loaded states yet */
const DEFAULT_STATE_OPTIONS: FilterOption[] = [
  { label: "Federal (nationwide)", value: "Federal (nationwide)" },
  { label: "Alabama", value: "AL" },
  { label: "Alaska", value: "AK" },
  { label: "Arizona", value: "AZ" },
  { label: "Arkansas", value: "AR" },
  { label: "California", value: "CA" },
  { label: "Colorado", value: "CO" },
  { label: "Connecticut", value: "CT" },
  { label: "Delaware", value: "DE" },
  { label: "Florida", value: "FL" },
  { label: "Georgia", value: "GA" },
  { label: "Hawaii", value: "HI" },
  { label: "Idaho", value: "ID" },
  { label: "Illinois", value: "IL" },
  { label: "Indiana", value: "IN" },
  { label: "Iowa", value: "IA" },
  { label: "Kansas", value: "KS" },
  { label: "Kentucky", value: "KY" },
  { label: "Louisiana", value: "LA" },
  { label: "Maine", value: "ME" },
  { label: "Maryland", value: "MD" },
  { label: "Massachusetts", value: "MA" },
  { label: "Michigan", value: "MI" },
  { label: "Minnesota", value: "MN" },
  { label: "Mississippi", value: "MS" },
  { label: "Missouri", value: "MO" },
  { label: "Montana", value: "MT" },
  { label: "Nebraska", value: "NE" },
  { label: "Nevada", value: "NV" },
  { label: "New Hampshire", value: "NH" },
  { label: "New Jersey", value: "NJ" },
  { label: "New Mexico", value: "NM" },
  { label: "New York", value: "NY" },
  { label: "North Carolina", value: "NC" },
  { label: "North Dakota", value: "ND" },
  { label: "Ohio", value: "OH" },
  { label: "Oklahoma", value: "OK" },
  { label: "Oregon", value: "OR" },
  { label: "Pennsylvania", value: "PA" },
  { label: "Rhode Island", value: "RI" },
  { label: "South Carolina", value: "SC" },
  { label: "South Dakota", value: "SD" },
  { label: "Tennessee", value: "TN" },
  { label: "Texas", value: "TX" },
  { label: "Utah", value: "UT" },
  { label: "Vermont", value: "VT" },
  { label: "Virginia", value: "VA" },
  { label: "Washington", value: "WA" },
  { label: "West Virginia", value: "WV" },
  { label: "Wisconsin", value: "WI" },
  { label: "Wyoming", value: "WY" },
];

const normalizeFilters = (filters?: Partial<FilterState>): FilterState => ({
  query: filters?.query ?? "",
  category: filters?.category ?? "",
  state: filters?.state ?? "",
  agency: filters?.agency ?? "",
  hasApplyLink: Boolean(filters?.hasApplyLink),
});

const areFiltersEqual = (a: FilterState, b: FilterState) =>
  a.query === b.query &&
  a.category === b.category &&
  a.state === b.state &&
  a.agency === b.agency &&
  a.hasApplyLink === b.hasApplyLink;

const computeLockedValues = (locked?: Partial<FilterState>) => {
  if (!locked) return { map: undefined, keys: new Set<keyof FilterState>() };

  const keys = new Set(Object.keys(locked) as (keyof FilterState)[]);
  if (keys.size === 0) return { map: undefined, keys };

  const normalized = normalizeFilters(locked);
  const map: Partial<FilterState> = {};

  const writable = map as Record<keyof FilterState, FilterState[keyof FilterState]>;
  keys.forEach((key) => {
    writable[key] = normalized[key];
  });

  return { map, keys };
};

export function FiltersBar({
  filters,
  categories = [],
  states = [],
  agencies = [],
  isLoading = false,
  lockedFilters,
  showStateFilter = true,
  onFiltersChange,
}: FiltersBarProps) {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Normalize state options (ensure unique, valid)
  const stateOptions = useMemo(
    () =>
      states.length > 0
        ? states.filter(
            (s) =>
              s &&
              typeof s.value === "string" &&
              s.value.trim().length > 0
          )
        : DEFAULT_STATE_OPTIONS,
    [states]
  );

  const locked = useMemo(() => computeLockedValues(lockedFilters), [lockedFilters]);

  const normalizedFilters = useMemo(() => {
    const base = normalizeFilters(filters);
    if (locked.map) {
      for (const key of locked.keys) {
        const value = locked.map[key];
        if (typeof value === "boolean" || typeof value === "string") {
          (base as any)[key] = value;
        }
      }
    }
    return base;
  }, [filters, locked]);

  const [filterState, setFilterState] = useState<FilterState>(normalizedFilters);

  useEffect(() => {
    setFilterState((current) =>
      areFiltersEqual(current, normalizedFilters) ? current : normalizedFilters
    );
  }, [normalizedFilters]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const notify = (next: FilterState, reason: FiltersBarChangeContext["reason"]) => {
    onFiltersChange?.(next, { reason });
  };

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilterState((current) => {
      const next = { ...current, query: value };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => notify(next, "debounced"), 400);
      return next;
    });
  };

  const handleSelectChange =
    (key: keyof FilterState) => (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      setFilterState((current) => {
        if (locked.keys.has(key)) return current;
        const next = { ...current, [key]: value } as FilterState;
        notify(next, "change");
        return next;
      });
    };

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setFilterState((current) => {
      if (locked.keys.has("hasApplyLink")) return current;
      const next = { ...current, hasApplyLink: checked };
      notify(next, "change");
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    notify(filterState, "submit");
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="filters-form"
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {/* Keyword */}
      <div className="w-full space-y-1 sm:flex-1 sm:max-w-md">
        <label htmlFor="search" className="text-xs font-semibold uppercase text-slate-500">
          Keyword
        </label>
        <Input
          id="search"
          value={filterState.query}
          onChange={handleQueryChange}
          placeholder="Search for grants"
          disabled={isLoading}
        />
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div className="w-full space-y-1 sm:w-48">
          <label
            htmlFor="category"
            className="text-xs font-semibold uppercase text-slate-500"
          >
            Category
          </label>
          <select
            id="category"
            value={filterState.category}
            onChange={handleSelectChange("category")}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            disabled={isLoading || locked.keys.has("category")}
          >
            <option value="">All categories</option>
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* State */}
      {showStateFilter && (
        <div className="w-full space-y-1 sm:w-48">
          <label htmlFor="state" className="text-xs font-semibold uppercase text-slate-500">
            State
          </label>
          <select
            id="state"
            value={filterState.state}
            onChange={handleSelectChange("state")}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            disabled={isLoading || locked.keys.has("state")}
          >
            <option value="">All states</option>
            {stateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Agency */}
      {agencies.length > 0 && (
        <div className="w-full space-y-1 sm:w-56">
          <label htmlFor="agency" className="text-xs font-semibold uppercase text-slate-500">
            Agency
          </label>
          <select
            id="agency"
            value={filterState.agency}
            onChange={handleSelectChange("agency")}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            disabled={isLoading || locked.keys.has("agency")}
          >
            <option value="">All agencies</option>
            {agencies.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Has apply link */}
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={filterState.hasApplyLink}
          onChange={handleCheckboxChange}
          disabled={isLoading || locked.keys.has("hasApplyLink")}
        />
        Has apply link
      </label>
    </form>
  );
}
