"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FiltersBar, type FilterOption, type FilterState, type FiltersBarChangeContext } from "@/components/grants/filters-bar";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import type { SearchResult } from "@/lib/search";
import type { Grant } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 12;

export type GrantsSearchClientProps = {
  initialFilters: Partial<FilterState & { page: number; pageSize: number }>;
  initialResults: SearchResult;
  categories: FilterOption[];
  states: FilterOption[];
  agencies: FilterOption[];
};

type CanonicalOptions = {
  includeDefaults?: boolean;
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
  options: CanonicalOptions = {}
): URLSearchParams => {
  const params = new URLSearchParams();
  const keyword = filters.query.trim();
  if (keyword) params.set("keyword", keyword);
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

  return params;
};

export function GrantsSearchClient({
  initialFilters,
  initialResults,
  categories,
  states,
  agencies,
}: GrantsSearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const startingFilters = useMemo(
    () => normalizeFilters(initialFilters),
    [initialFilters]
  );

  const [appliedFilters, setAppliedFilters] = useState<NormalizedFilters>(startingFilters);
  const [results, setResults] = useState<Grant[]>(initialResults.grants);
  const [total, setTotal] = useState(initialResults.total);
  const [page, setPage] = useState(initialResults.page || initialFilters.page || 1);
  const [pageSize, setPageSize] = useState(initialResults.pageSize || initialFilters.pageSize || DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(initialResults.totalPages || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUrl = useCallback(
    (filters: NormalizedFilters, nextPage: number, nextPageSize: number) => {
      const params = serializeFilters(filters, nextPage, nextPageSize, { includeDefaults: false });
      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const performSearch = useCallback(
    async (filters: NormalizedFilters, nextPage: number) => {
      const nextPageSize = pageSize || DEFAULT_PAGE_SIZE;
      updateUrl(filters, nextPage, nextPageSize);
      setIsLoading(true);
      setError(null);

      try {
        const requestParams = serializeFilters(filters, nextPage, nextPageSize, { includeDefaults: true });
        const response = await fetch(`/api/grants/search?${requestParams.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data: SearchResult = await response.json();
        setResults(data.grants);
        setTotal(data.total);
        setPage(data.page);
        setPageSize(data.pageSize);
        setTotalPages(data.totalPages);
        setAppliedFilters(filters);
      } catch (err) {
        console.error("Grant search failed", err);
        setResults([]);
        setTotal(0);
        setTotalPages(0);
        setPage(nextPage);
        setError("We couldn't load new grants right now. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize, updateUrl]
  );

  const handleFiltersChange = useCallback(
    (next: FilterState, context: FiltersBarChangeContext) => {
      const normalized = normalizeFilters(next);
      const targetPage = 1;
      if (context.reason === "submit" || context.reason === "change" || context.reason === "debounced") {
        if (areFiltersEqual(normalized, appliedFilters) && targetPage === page) {
          return;
        }
        void performSearch(normalized, targetPage);
      }
    },
    [appliedFilters, page, performSearch]
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

  return (
    <div className="space-y-6">
      <FiltersBar
        filters={appliedFilters}
        categories={categories}
        states={states}
        agencies={agencies}
        isLoading={isLoading}
        onFiltersChange={handleFiltersChange}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Latest opportunities ({total})</h2>
        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-10" role="status">
              <span className="sr-only">Loading grants…</span>
              <svg className="h-6 w-6 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
          )}

          {!isLoading && !error && hasResults && results.map((grant: Grant) => <GrantCard key={grant.id} grant={grant} />)}

          {!isLoading && !error && !hasResults && (
            <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-600">
              <p>No grants match your filters yet. Try broadening your search or exploring another category.</p>
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
