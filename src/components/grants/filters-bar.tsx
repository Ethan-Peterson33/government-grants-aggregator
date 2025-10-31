"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
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
    state?: string;
    agency?: string;
    hasApplyLink?: boolean;
  };
  categories?: FilterOption[];
  states?: FilterOption[];
  agencies?: FilterOption[];
};

type FilterState = {
  query: string;
  category: string;
  state: string;
  agency: string;
  hasApplyLink: boolean;
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

export function FiltersBar({ filters, categories = [], states = [], agencies = [] }: FiltersBarProps) {
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
    state: filters?.state ?? "",
    agency: filters?.agency ?? "",
    hasApplyLink: Boolean(filters?.hasApplyLink),
  }));

  const applyFilters = useCallback(
    (updates: Partial<FilterState>) => {
      setFilterState((previous) => {
        const nextState: FilterState = { ...previous, ...updates };
        const params = new URLSearchParams(searchParams.toString());
        const mapping: Record<keyof FilterState, string> = {
          query: "query",
          category: "category",
          state: "state",
          agency: "agency",
          hasApplyLink: "has_apply_link",
        };

        (Object.keys(mapping) as (keyof FilterState)[]).forEach((key) => {
          const paramKey = mapping[key];
          const value = nextState[key];

          if (key === "hasApplyLink") {
            if (value) {
              params.set(paramKey, "1");
            } else {
              params.delete(paramKey);
            }
            return;
          }

          const trimmedValue = typeof value === "string" ? value.trim() : "";
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
      query: searchParams.get("query") ?? "",
      category: searchParams.get("category") ?? "",
      state: searchParams.get("state") ?? "",
      agency: searchParams.get("agency") ?? "",
      hasApplyLink: searchParams.get("has_apply_link") === "1",
    };

    setFilterState((current) => {
      const isSame =
        current.query === nextState.query &&
        current.category === nextState.category &&
        current.state === nextState.state &&
        current.agency === nextState.agency &&
        current.hasApplyLink === nextState.hasApplyLink;

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

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
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
    (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      applyFilters({ [key]: value } as Partial<FilterState>);
    };

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyFilters({ hasApplyLink: event.target.checked });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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
          placeholder="Search grant titles, summaries, or descriptions"
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
            disabled={isPending}
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
          disabled={isPending}
        />
        Has apply link
      </label>
    </form>
  );
}
