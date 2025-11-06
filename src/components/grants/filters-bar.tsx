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
  onFiltersChange?: (next: FilterState, context: FiltersBarChangeContext) => void;
};

const DEFAULT_STATE_OPTIONS: FilterOption[] = [
  { label: "Alabama", value: "AL" },
  { label: "Alaska", value: "AK" },
  { label: "Arizona", value: "AZ" },
  { label: "California", value: "CA" },
  { label: "Colorado", value: "CO" },
  { label: "Florida", value: "FL" },
  { label: "Georgia", value: "GA" },
  { label: "Illinois", value: "IL" },
  { label: "New York", value: "NY" },
  { label: "Texas", value: "TX" },
  { label: "Washington", value: "WA" },
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

export function FiltersBar({
  filters,
  categories = [],
  states = [],
  agencies = [],
  isLoading = false,
  onFiltersChange,
}: FiltersBarProps) {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const stateOptions = useMemo(() => (states.length > 0 ? states : DEFAULT_STATE_OPTIONS), [states]);
  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters]);

  const [filterState, setFilterState] = useState<FilterState>(normalizedFilters);

  useEffect(() => {
    setFilterState((current) => (areFiltersEqual(current, normalizedFilters) ? current : normalizedFilters));
  }, [normalizedFilters]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  const notify = (next: FilterState, reason: FiltersBarChangeContext["reason"]) => {
    if (onFiltersChange) {
      onFiltersChange(next, { reason });
    }
  };

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilterState((current) => {
      const next = { ...current, query: value };
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => notify(next, "debounced"), 400);
      return next;
    });
  };

  const handleSelectChange = (key: keyof FilterState) => (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFilterState((current) => {
      const next = { ...current, [key]: value } as FilterState;
      notify(next, "change");
      return next;
    });
  };

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setFilterState((current) => {
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
      <div className="w-full space-y-1 sm:flex-1 sm:max-w-md">
        <label htmlFor="search" className="text-xs font-semibold uppercase text-slate-500">
          Keyword
        </label>
        <Input
          id="search"
          value={filterState.query}
          onChange={handleQueryChange}
          placeholder="Search grant titles, summaries, or descriptions"
          disabled={isLoading}
        />
      </div>
      {categories.length > 0 && (
        <div className="w-full space-y-1 sm:w-48">
          <label htmlFor="category" className="text-xs font-semibold uppercase text-slate-500">
            Category
          </label>
          <select
            id="category"
            value={filterState.category}
            onChange={handleSelectChange("category")}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            disabled={isLoading}
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
      <div className="w-full space-y-1 sm:w-48">
        <label htmlFor="state" className="text-xs font-semibold uppercase text-slate-500">
          State
        </label>
        <select
          id="state"
          value={filterState.state}
          onChange={handleSelectChange("state")}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          disabled={isLoading}
        >
          <option value="">All states</option>
          {stateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
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
            disabled={isLoading}
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
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={filterState.hasApplyLink}
          onChange={handleCheckboxChange}
          disabled={isLoading}
        />
        Has apply link
      </label>
    </form>
  );
}
