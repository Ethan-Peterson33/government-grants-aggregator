"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Input } from "@/components/ui/input";

/* -------------------------------------------
   Types
------------------------------------------- */

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
  reason: "submit" | "change" | "debounced" | "reset";
};

type FiltersBarProps = {
  filters?: Partial<FilterState>;
  categories?: FilterOption[];
  states?: FilterOption[];
  agencies?: FilterOption[];
  isLoading?: boolean;

  lockedFilters?: Partial<FilterState>;
  showStateFilter?: boolean;

  onFiltersChange?: (next: FilterState, ctx: FiltersBarChangeContext) => void;
};

/* -------------------------------------------
   Helpers
------------------------------------------- */

const normalizeFilters = (filters?: Partial<FilterState>): FilterState => ({
  query: filters?.query ?? "",
  category: filters?.category ?? "",
  state: filters?.state ?? "",
  agency: filters?.agency ?? "",
  hasApplyLink: Boolean(filters?.hasApplyLink ?? false),
});

const areFiltersEqual = (a: FilterState, b: FilterState) =>
  a.query === b.query &&
  a.category === b.category &&
  a.state === b.state &&
  a.agency === b.agency &&
  a.hasApplyLink === b.hasApplyLink;

const computeLockedValues = (locked?: Partial<FilterState>) => {
  if (!locked) return { map: undefined, keys: new Set<keyof FilterState>() };

  // 💡 MUST ALLOW undefined because Partial<T> produces it
  const map: { [key in keyof FilterState]?: string | boolean } = {};
  const keys = new Set<keyof FilterState>();

  for (const key of Object.keys(locked) as (keyof FilterState)[]) {
    const val = locked[key];
    if (val !== undefined) {
      keys.add(key);
      map[key] = val; // ✅ Now always valid
    }
  }

  return { map, keys };
};

/* -------------------------------------------
   Component
------------------------------------------- */

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

  const locked = useMemo(() => computeLockedValues(lockedFilters), [lockedFilters]);

  /* Normalize + apply locked values */
  const normalizedFilters = useMemo(() => {
    const f = normalizeFilters(filters);

    if (locked.map) {
      for (const key of locked.keys) {
        const v = locked.map[key];
        if (v !== undefined) {
          (f as Record<keyof FilterState, FilterState[keyof FilterState]>)[key] = v;
        }
      }
    }
    return f;
  }, [filters, locked]);

  const [filterState, setFilterState] = useState<FilterState>(normalizedFilters);

  /* Sync external changes */
  useEffect(() => {
    setFilterState((prev) =>
      areFiltersEqual(prev, normalizedFilters) ? prev : normalizedFilters
    );
  }, [normalizedFilters]);

  /* Cleanup */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /* -------------------------------------------
     NOTIFY (with locked overrides)
  ------------------------------------------- */
  const notify = (
    next: FilterState,
    reason: FiltersBarChangeContext["reason"]
  ) => {
    if (locked.map) {
      for (const key of locked.keys) {
        const v = locked.map[key];
        if (v !== undefined) {
          (next as Record<keyof FilterState, FilterState[keyof FilterState]>)[key] = v;
        }
      }
    }
    onFiltersChange?.(next, { reason });
  };

  /* -------------------------------------------
     Handlers
  ------------------------------------------- */

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilterState((prev) => {
      const next = { ...prev, query: value };

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        notify(next, "debounced");
      }, 700);

      return next;
    });
  };

  const handleSelectChange =
    (key: keyof FilterState) => (e: ChangeEvent<HTMLSelectElement>) => {
      if (locked.keys.has(key)) return;

      const value = e.target.value;

      setFilterState((prev) => {
        const next = { ...prev, [key]: value };
        notify(next, "change");
        return next;
      });
    };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (locked.keys.has("hasApplyLink")) return;

    const checked = e.target.checked;

    setFilterState((prev) => {
      const next = { ...prev, hasApplyLink: checked };
      notify(next, "change");
      return next;
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = normalizeFilters(filterState);

    if (locked.map) {
      for (const key of locked.keys) {
        const v = locked.map[key];
        if (v !== undefined) {
          (next as Record<keyof FilterState, FilterState[keyof FilterState]>)[key] = v;
        }
      }
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    notify(next, "submit");
  };

  const handleReset = () => {
    const next = normalizeFilters({});

    if (locked.map) {
      for (const key of locked.keys) {
        const v = locked.map[key];
        if (v !== undefined) {
          (next as Record<keyof FilterState, FilterState[keyof FilterState]>)[key] = v;
        }
      }
    }

    setFilterState(next);
    notify(next, "reset");
  };

  /* -------------------------------------------
     Render
  ------------------------------------------- */

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="filters-form"
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {/* Keyword */}
      <div className="w-full space-y-1 sm:flex-1 sm:max-w-md">
        <label
          htmlFor="search"
          className="text-xs font-semibold uppercase text-slate-500"
        >
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
      {!!categories.length && (
        <div className="w-full space-y-1 sm:w-48">
          <label className="text-xs font-semibold uppercase text-slate-500">
            Category
          </label>
          <select
            value={filterState.category}
            onChange={handleSelectChange("category")}
            disabled={isLoading || locked.keys.has("category")}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* State */}
      {showStateFilter && (
        <div className="w-full space-y-1 sm:w-48">
          <label className="text-xs font-semibold uppercase text-slate-500">
            State
          </label>
          <select
            value={filterState.state}
            onChange={handleSelectChange("state")}
            disabled={isLoading || locked.keys.has("state")}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Agency */}
      {!!agencies.length && (
        <div className="w-full space-y-1 sm:w-56">
          <label className="text-xs font-semibold uppercase text-slate-500">
            Agency
          </label>
          <select
            value={filterState.agency}
            onChange={handleSelectChange("agency")}
            disabled={isLoading || locked.keys.has("agency")}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">All agencies</option>
            {agencies.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Apply Link */}
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

      {/* Reset */}
      <button
        type="button"
        onClick={handleReset}
        className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
      >
        Reset
      </button>
    </form>
  );
}
