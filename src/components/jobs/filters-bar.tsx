"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export type FilterOption = {
  label: string;
  value: string;
};

type FiltersBarProps = {
  filters?: {
    query?: string;
    category?: string;
    location?: string;
    type?: string;
    state?: string;
  };
  categories?: FilterOption[];
  locations?: FilterOption[];
  employmentTypes?: FilterOption[];
  states?: FilterOption[];
};

type FilterState = {
  query: string;
  category: string;
  location: string;
  type: string;
  state: string;
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

export function FiltersBar({
  filters,
  categories = [],
  locations = [],
  employmentTypes = [],
  states = [],
}: FiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const stateOptions = useMemo(
    () => (states.length > 0 ? states : DEFAULT_STATE_OPTIONS),
    [states]
  );

  const [filterState, setFilterState] = useState<FilterState>(() => ({
    query: filters?.query ?? "",
    category: filters?.category ?? "",
    location: filters?.location ?? "",
    type: filters?.type ?? "",
    state: filters?.state ?? "",
  }));

  const applyFilters = useCallback(
    (updates: Partial<FilterState>) => {
      setFilterState((previous) => {
        const nextState: FilterState = { ...previous, ...updates };
        const params = new URLSearchParams(searchParams.toString());
        const mapping: Record<keyof FilterState, string> = {
          query: "q",
          category: "category",
          location: "location",
          type: "type",
          state: "state",
        };

        (Object.keys(mapping) as (keyof FilterState)[]).forEach((key) => {
          const paramKey = mapping[key];
          const rawValue = nextState[key];
          const trimmedValue = rawValue.trim();

          if (trimmedValue) {
            params.set(paramKey, trimmedValue);
          } else {
            params.delete(paramKey);
          }
        });

        params.delete("page");

        const previousSearch = searchParams.toString();
        const nextSearch = params.toString();

        if (previousSearch !== nextSearch) {
          startTransition(() => {
            const url = nextSearch ? `${pathname}?${nextSearch}` : pathname;
            router.push(url, { scroll: false });
          });
        }

        return nextState;
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  useEffect(() => {
    const nextState: FilterState = {
      query: searchParams.get("q") ?? "",
      category: searchParams.get("category") ?? "",
      location: searchParams.get("location") ?? "",
      type: searchParams.get("type") ?? "",
      state: searchParams.get("state") ?? "",
    };

    setFilterState((current) => {
      const isSame =
        current.query === nextState.query &&
        current.category === nextState.category &&
        current.location === nextState.location &&
        current.type === nextState.type &&
        current.state === nextState.state;

      return isSame ? current : nextState;
    });

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [searchParams]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilterState((current) => ({ ...current, query: value }));

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      applyFilters({ query: value });
    }, 400);
  };

  const handleSelectChange = (key: keyof FilterState) =>
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      applyFilters({ [key]: event.target.value } as Partial<FilterState>);
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    applyFilters({ query: filterState.query });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex-1 space-y-1">
        <label htmlFor="search" className="text-xs font-semibold uppercase text-slate-500">
          Keyword
        </label>
        <Input
          id="search"
          value={filterState.query}
          onChange={handleQueryChange}
          placeholder="Search job titles or agencies"
          disabled={isPending}
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
            disabled={isPending}
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
      {locations.length > 0 && (
        <div className="w-full space-y-1 sm:w-48">
          <label htmlFor="location" className="text-xs font-semibold uppercase text-slate-500">
            Location
          </label>
          <select
            id="location"
            value={filterState.location}
            onChange={handleSelectChange("location")}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            disabled={isPending}
          >
            <option value="">All locations</option>
            {locations.map((option) => (
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
          disabled={isPending}
        >
          <option value="">All states</option>
          {stateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {employmentTypes.length > 0 && (
        <div className="w-full space-y-1 sm:w-48">
          <label htmlFor="employmentType" className="text-xs font-semibold uppercase text-slate-500">
            Employment type
          </label>
          <select
            id="employmentType"
            value={filterState.type}
            onChange={handleSelectChange("type")}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            disabled={isPending}
          >
            <option value="">All types</option>
            {employmentTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </form>
  );
}
