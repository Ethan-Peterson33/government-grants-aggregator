"use client";

import {
  useCallback,
  useMemo,
  useState,
  useEffect
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams
} from "next/navigation";

import {
  FiltersBar,
  type FilterOption,
  type FilterState,
  type FiltersBarChangeContext,
} from "@/components/grants/filters-bar";

import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";

import type { SearchResult } from "@/lib/search";
import type { Grant } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 12;

type LockedAgency = {
  label: string;
  slug: string;
  code?: string | null | undefined;
};

export type GrantsSearchClientProps = {
  initialFilters: Partial<FilterState & { page: number; pageSize: number }>;
  initialResults: SearchResult;
  categories: FilterOption[];
  states: FilterOption[];
  agencies: FilterOption[];
  lockedAgency?: LockedAgency;
};

type NormalizedFilters = FilterState;

const normalizeFilters = (filters: Partial<FilterState>): NormalizedFilters => ({
  query: filters.query?.trim() ?? "",
  category: filters.category?.trim() ?? "",
  state: filters.state?.trim() ?? "",
  agency: filters.agency?.trim() ?? "",
  hasApplyLink: Boolean(filters.hasApplyLink),
});

const areFiltersEqual = (a: NormalizedFilters, b: NormalizedFilters) =>
  a.query === b.query &&
  a.category === b.category &&
  a.state === b.state &&
  a.agency === b.agency &&
  a.hasApplyLink === b.hasApplyLink;

export const serializeFilters = (
  filters: NormalizedFilters,
  page: number,
  pageSize: number,
  options: { includeDefaults?: boolean; additionalParams?: Record<string, string | undefined> } = {}
): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.query.trim()) params.set("keyword", filters.query.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.state) params.set("state", filters.state);
  if (filters.agency) params.set("agency", filters.agency);
  if (filters.hasApplyLink) params.set("has_apply_link", "1");

  if (options.includeDefaults) {
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
  } else {
    if (page > 1) params.set("page", String(page));
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(pageSize));
  }

  if (options.additionalParams) {
    for (const [key, value] of Object.entries(options.additionalParams)) {
      if (value?.trim()) params.set(key, value.trim());
    }
  }

  return params;
};

export function GrantsSearchClient({
  initialFilters,
  initialResults,
  categories,
  states,
  agencies,
  lockedAgency,
}: GrantsSearchClientProps) {

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** LOCKED AGENCY HANDLING */
 const lockedFilterValues = useMemo<Partial<FilterState> | undefined>(() => {
  if (!lockedAgency) return undefined;

  return {
    agency: lockedAgency.label,
  } as Partial<FilterState>;
}, [lockedAgency]);

const lockedKeys = useMemo(
  () =>
    new Set(
      (lockedFilterValues ? Object.keys(lockedFilterValues) : []) as (keyof FilterState)[]
    ),
  [lockedFilterValues]
);

const mergeLockedFilters = useCallback(
  (filters: NormalizedFilters): NormalizedFilters => {
    if (!lockedFilterValues) return filters;

    const next = { ...filters };

    for (const key of lockedKeys) {
      const value = (lockedFilterValues as Partial<FilterState>)[key];
      if (value !== undefined) {
        (next as any)[key] = value;
      }
    }

    return next;
  },
  [lockedFilterValues, lockedKeys]
);


  const startingFilters = useMemo(
    () => mergeLockedFilters(normalizeFilters({ ...initialFilters, ...(lockedFilterValues ?? {}) })),
    [initialFilters, lockedFilterValues, mergeLockedFilters]
  );

  const [appliedFilters, setAppliedFilters] = useState<NormalizedFilters>(startingFilters);
  const [results, setResults] = useState<Grant[]>(initialResults.grants);
  const [total, setTotal] = useState(initialResults.total);
  const [page, setPage] = useState(initialResults.page || initialFilters.page || 1);
  const [pageSize, setPageSize] = useState(initialResults.pageSize || initialFilters.pageSize || DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(initialResults.totalPages || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const additionalParams = useMemo(() => {
    if (!lockedAgency) return undefined;
    const extra: Record<string, string> = { agency_slug: lockedAgency.slug };
    if (lockedAgency.code) extra.agency_code = lockedAgency.code;
    return extra;
  }, [lockedAgency]);

  /** ----------------------------
   * URL UPDATE
   -----------------------------*/
  const updateUrl = useCallback(
    (filters: NormalizedFilters, nextPage: number, nextPageSize: number) => {
      const params = serializeFilters(filters, nextPage, nextPageSize, {
        includeDefaults: false,
        additionalParams,
      });
      router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
    },
    [additionalParams, pathname, router]
  );

  /** ----------------------------
   * API SEARCH
   -----------------------------*/
  const performSearch = useCallback(
    async (filters: NormalizedFilters, nextPage: number) => {
      const effectiveFilters = mergeLockedFilters(filters);
      const nextPageSize = pageSize || DEFAULT_PAGE_SIZE;

      updateUrl(effectiveFilters, nextPage, nextPageSize);

      setIsLoading(true);
      setError(null);

      try {
        const requestParams = serializeFilters(effectiveFilters, nextPage, nextPageSize, {
          includeDefaults: true,
          additionalParams,
        });

        const response = await fetch(`/api/grants/search?${requestParams.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error(`Search failed: ${response.status}`);

        const data: SearchResult = await response.json();

        setResults(data.grants);
        setTotal(data.total);
        setPage(data.page);
        setPageSize(data.pageSize);
        setTotalPages(data.totalPages);
        setAppliedFilters(effectiveFilters);

      } catch (err) {
        console.error(err);
        setResults([]);
        setError("Unable to load grants. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [additionalParams, mergeLockedFilters, pageSize, updateUrl]
  );

  /** ----------------------------
   * URL → FILTERBAR SYNC
   -----------------------------*/
  useEffect(() => {
    if (!searchParams) return;

    const urlFilters: NormalizedFilters = normalizeFilters({
      query: searchParams.get("keyword") ?? "",
      category: searchParams.get("category") ?? "",
      state: searchParams.get("state") ?? "",
      agency: searchParams.get("agency") ?? "",
      hasApplyLink: searchParams.get("has_apply_link") === "1",
    });

    const merged = mergeLockedFilters(urlFilters);

    const nextPage = Number(searchParams.get("page") ?? 1);

    if (!areFiltersEqual(merged, appliedFilters)) {
      setAppliedFilters(merged);
      void performSearch(merged, nextPage);
    }
  }, [searchParams, mergeLockedFilters, appliedFilters, performSearch]);

  /** FILTERBAR CHANGE HANDLING */
  const handleFiltersChange = useCallback(
    (next: FilterState, context: FiltersBarChangeContext) => {
      const normalized = mergeLockedFilters(normalizeFilters(next));
      const targetPage = 1;

      if (context.reason === "submit" ||
          context.reason === "change" ||
          context.reason === "debounced") {
        if (areFiltersEqual(normalized, appliedFilters) && targetPage === page) return;
        void performSearch(normalized, targetPage);
      }
    },
    [appliedFilters, mergeLockedFilters, page, performSearch]
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage === page) return;
      void performSearch(appliedFilters, nextPage);
    },
    [appliedFilters, page, performSearch]
  );

  const hasResults = results.length > 0;
  const showPagination = hasResults && totalPages > 1;

  /** ----------------------------
   * RENDER
   -----------------------------*/
  return (
    <div className="space-y-6">
      <FiltersBar
        filters={appliedFilters}
        categories={categories}
        states={states}
        agencies={agencies}
        isLoading={isLoading}
        lockedFilters={lockedFilterValues}
        onFiltersChange={handleFiltersChange}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">
          Latest opportunities ({total})
        </h2>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-10">
              <span className="sr-only">Loading…</span>
              <svg className="h-6 w-6 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          )}

          {!isLoading && !error && hasResults &&
            results.map((grant) => <GrantCard key={grant.id} grant={grant} />)
          }

          {!isLoading && !error && !hasResults && (
            <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm">
              No grants match your filters.
            </div>
          )}
        </div>
      </section>

      {showPagination && (
        <Pagination
          total={total}
          pageSize={pageSize}
          currentPage={page}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
