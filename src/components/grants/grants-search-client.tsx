"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  FiltersBar,
  type FilterOption,
  type FilterState,
  type FiltersBarChangeContext,
} from "@/components/grants/filters-bar";

import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";

import { resolveStateQueryValue } from "@/lib/grant-location";
import type { SearchResult } from "@/lib/search";

const DEFAULT_PAGE_SIZE = 12;

/* -----------------------------------------
   Types
------------------------------------------ */

export type LockedAgency = {
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
  lockedFilters?: Partial<FilterState>;
  staticParams?: Record<string, string | undefined>;
  showStateFilter?: boolean;
};

type NormalizedFilters = FilterState;

/* -----------------------------------------
   Helpers
------------------------------------------ */

const normalizeFilters = (raw: Partial<FilterState>): NormalizedFilters => {
  const resolvedState = resolveStateQueryValue(raw.state);

  return {
    query: (raw.query ?? "").trim(),
    category: (raw.category ?? "").trim(),
    state: resolvedState.value || (raw.state ?? "").trim(),
    agency: (raw.agency ?? "").trim(),
    hasApplyLink: Boolean(raw.hasApplyLink),
  };
};

const applyLocked = (
  filters: NormalizedFilters,
  locked?: Partial<FilterState>
): NormalizedFilters => {
  if (!locked) return filters;

  const lockedNorm = normalizeFilters(locked);
  const out: NormalizedFilters = { ...filters };

  for (const key of Object.keys(lockedNorm) as (keyof FilterState)[]) {
    const v = lockedNorm[key];
    if (v !== undefined && v !== "") {
      (out as Record<keyof FilterState, FilterState[keyof FilterState]>)[key] = v;
    }
  }

  return out;
};

const areFiltersEqual = (a: NormalizedFilters, b: NormalizedFilters) =>
  a.query === b.query &&
  a.category === b.category &&
  a.state === b.state &&
  a.agency === b.agency &&
  a.hasApplyLink === b.hasApplyLink;

const serializeFilters = (
  filters: NormalizedFilters,
  page: number,
  pageSize: number,
  opts?: {
    additionalParams?: Record<string, string>;
    locked?: Partial<FilterState>;
  }
): URLSearchParams => {
  const p = new URLSearchParams();
  const { additionalParams, locked } = opts ?? {};

  if (filters.category) {
    p.set("category", filters.category);
  }

  if (filters.query) p.set("keyword", filters.query);
  if (filters.state) p.set("state", filters.state);
  if (filters.agency) p.set("agency", filters.agency);
  if (filters.hasApplyLink) p.set("has_apply_link", "1");

  if (page > 1) p.set("page", String(page));
  if (pageSize !== DEFAULT_PAGE_SIZE) p.set("pageSize", String(pageSize));

  if (additionalParams) {
    for (const [k, v] of Object.entries(additionalParams)) {
      if (v) p.set(k, v);
    }
  }

  return p;
};

/* -----------------------------------------
   Component
------------------------------------------ */

export function GrantsSearchClient({
  initialFilters,
  initialResults,
  categories,
  states,
  agencies,
  lockedAgency,
  lockedFilters,
  staticParams,
  showStateFilter = true,
}: GrantsSearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = useMemo(
    () =>
      staticParams?.categorySlug
        ? `/grants/category/${staticParams.categorySlug}`
        : pathname || "/grants",
    [pathname, staticParams?.categorySlug]
  );

  /* -----------------------------------------
     LOCKED FILTER VALUES
  ------------------------------------------ */
  const lockedFilterValues = useMemo(() => {
    const merged = { ...(lockedFilters ?? {}) };
    if (lockedAgency) merged.agency = lockedAgency.label;
    return Object.keys(merged).length ? merged : undefined;
  }, [lockedAgency, lockedFilters]);

  const mergeLocked = useCallback(
    (filters: NormalizedFilters) =>
      lockedFilterValues ? applyLocked(filters, lockedFilterValues) : filters,
    [lockedFilterValues]
  );

  /* -----------------------------------------
     URL → PARSED FILTERS
  ------------------------------------------ */
  const parseUrl = useCallback(
    (sp: URLSearchParams) => {
      const raw = normalizeFilters({
        query: sp.get("keyword") ?? sp.get("query") ?? "",
        category: sp.get("category") ?? "",
        state: sp.get("state") ?? "",
        agency: sp.get("agency") ?? "",
        hasApplyLink: sp.get("has_apply_link") === "1",
      });

      return {
        filters: mergeLocked(raw),
        page: Number(sp.get("page")) || 1,
        pageSize: Number(sp.get("pageSize")) || DEFAULT_PAGE_SIZE,
      };
    },
    [mergeLocked]
  );

  const initialUrlState = useMemo(
    () => parseUrl(searchParams),
    [parseUrl, searchParams]
  );

  /* -----------------------------------------
     INITIAL FILTERS + STATE
  ------------------------------------------ */
  const startingFilters = applyLocked(
    normalizeFilters({
      ...initialFilters,
      ...initialUrlState.filters,
    }),
    lockedFilterValues
  );

  const startingPage =
    initialUrlState.page ??
    initialFilters.page ??
    initialResults.page ??
    1;

  const startingPageSize =
    initialUrlState.pageSize ??
    initialFilters.pageSize ??
    initialResults.pageSize ??
    DEFAULT_PAGE_SIZE;

  const [filters, setFilters] = useState<NormalizedFilters>(startingFilters);
  const [results, setResults] = useState(initialResults.grants);
  const [total, setTotal] = useState(initialResults.total);
  const [page, setPage] = useState(startingPage);
  const [pageSize, setPageSize] = useState(startingPageSize);
  const [totalPages, setTotalPages] = useState(initialResults.totalPages ?? 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -----------------------------------------
     STATIC PARAMS
  ------------------------------------------ */
  const additionalParams = useMemo(() => {
    const extra: Record<string, string> = {};

    if (lockedAgency) {
      extra.agency_slug = lockedAgency.slug;
      if (lockedAgency.code) extra.agency_code = lockedAgency.code;
    }

    if (staticParams) {
      for (const [k, v] of Object.entries(staticParams)) {
        if (v) extra[k] = v;
      }
    }

    return Object.keys(extra).length ? extra : undefined;
  }, [lockedAgency, staticParams]);

  /* -----------------------------------------
     UPDATE URL
  ------------------------------------------ */
  const updateUrl = useCallback(
    (f: NormalizedFilters, page: number, size: number) => {
      const sp = serializeFilters(f, page, size, {
        additionalParams,
        locked: lockedFilterValues,
      });

      router.replace(sp.toString() ? `${basePath}?${sp}` : basePath, {
        scroll: false,
      });
    },
    [basePath, router, additionalParams, lockedFilterValues]
  );

  /* -----------------------------------------
     PERFORM SEARCH
  ------------------------------------------ */
  const performSearch = useCallback(
    async (
      nextFilters: NormalizedFilters,
      nextPage: number,
      nextPageSize?: number,
      opts?: { skipUrl?: boolean }
    ) => {
      const size = nextPageSize ?? pageSize;
      const effective = mergeLocked(nextFilters);

      if (!opts?.skipUrl) updateUrl(effective, nextPage, size);

      setFilters(effective);
      setIsLoading(true);
      setError(null);

      try {
        const sp = serializeFilters(effective, nextPage, size, {
          additionalParams,
          locked: lockedFilterValues,
        });

        const res = await fetch(`/api/grants/search?${sp}`);
        if (!res.ok) throw new Error("Search failed");

        const data: SearchResult = await res.json();

        setResults(data.grants);
        setTotal(data.total);
        setPage(data.page);
        setPageSize(data.pageSize);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error(err);
        setResults([]);
        setError("Unable to load grants. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      additionalParams,
      mergeLocked,
      pageSize,
      updateUrl,
      lockedFilterValues,
    ]
  );

  /* -----------------------------------------
     URL CHANGES → RELOAD STATE
  ------------------------------------------ */
  useEffect(() => {
    const parsed = parseUrl(searchParams);

    const filtersChanged = !areFiltersEqual(parsed.filters, filters);
    const pageChanged =
      parsed.page !== page || parsed.pageSize !== pageSize;

    if (filtersChanged || pageChanged) {
      performSearch(parsed.filters, parsed.page, parsed.pageSize, {
        skipUrl: true,
      });
    }
  }, [filters, page, pageSize, parseUrl, performSearch, searchParams]);

  const effectiveFilters = useMemo(
    () => mergeLocked(filters),
    [filters, mergeLocked]
  );

  const createPageHref = useCallback(
    (targetPage: number) => {
      const params = new URLSearchParams();

      params.set("page", String(targetPage));

      if (effectiveFilters.query) params.set("keyword", effectiveFilters.query);
      if (effectiveFilters.state) params.set("state", effectiveFilters.state);
      if (effectiveFilters.agency) params.set("agency", effectiveFilters.agency);
      if (effectiveFilters.hasApplyLink) params.set("has_apply_link", "1");
      if (effectiveFilters.category) params.set("category", effectiveFilters.category);

      const queryString = params.toString();
      return queryString ? `${basePath}?${queryString}` : basePath;
    },
    [basePath, effectiveFilters]
  );

  /* -----------------------------------------
     FILTERBAR CHANGE
  ------------------------------------------ */
  const handleFiltersChange = useCallback(
    (next: FilterState, ctx: FiltersBarChangeContext) => {
      const normalized = mergeLocked(normalizeFilters(next));

      const isEmpty =
        !normalized.query &&
        !normalized.category &&
        !normalized.state &&
        !normalized.agency &&
        !normalized.hasApplyLink;

      if (isEmpty && lockedFilterValues) {
        const reset = applyLocked(normalizeFilters({}), lockedFilterValues);
        performSearch(reset, 1, pageSize);
        return;
      }

      if (areFiltersEqual(normalized, filters) && page === 1) return;

      performSearch(normalized, 1, pageSize);
    },
    [filters, page, pageSize, mergeLocked, lockedFilterValues]
  );

  /* -----------------------------------------
     PAGINATION CHANGE
  ------------------------------------------ */
  const handlePageChange = useCallback(
    (p: number) => {
      if (p !== page) {
        performSearch(filters, p, pageSize);
      }
    },
    [filters, page, pageSize]
  );

  const hasResults = results.length > 0;
  const showPagination = hasResults && totalPages > 1;

  const jurisdictionParam = searchParams.get("jurisdiction")?.toLowerCase();
  const effectiveShowStateFilter =
    showStateFilter &&
    jurisdictionParam !== "private" &&
    staticParams?.jurisdiction !== "private";

  return (
    <div className="space-y-6">
      <FiltersBar
        filters={filters}
        categories={categories}
        states={states}
        agencies={agencies}
        isLoading={isLoading}
        lockedFilters={lockedFilterValues}
        showStateFilter={effectiveShowStateFilter}
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
              <svg
                className="h-6 w-6 animate-spin text-blue-600"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="opacity-25"
                />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  className="opacity-75"
                />
              </svg>
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          )}

          {!isLoading &&
            !error &&
            hasResults &&
            results.map((g) => <GrantCard key={g.id} grant={g} />)}

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
          getHref={createPageHref}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
