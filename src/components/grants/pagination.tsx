// src/components/grants/pagination.tsx

"use client";

import Link from "next/link";
import React, { useMemo } from "react";

interface PaginationProps {
  total: number;
  pageSize: number;
  currentPage: number;
  isLoading?: boolean;
  basePath?: string;
  rawCategory?: string;
  staticParams?: Record<string, string | undefined>;
  onPageChange?: (page: number) => void;
  getHref?: (page: number) => string;
}

const DEFAULT_PAGE_SIZE = 12;

const buttonClasses = (isActive: boolean) =>
  `px-3 py-1 border rounded ${
    isActive
      ? "bg-slate-900 text-white"
      : "bg-white text-slate-900 hover:bg-slate-100"
  }`;

const getPageItems = (
  totalPages: number,
  currentPage: number,
): Array<number | "ellipsis"> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const includedPages = new Set<number>();

  // Always include the first two and last two pages
  includedPages.add(1);
  includedPages.add(2);
  includedPages.add(totalPages - 1);
  includedPages.add(totalPages);

  // Include the current page and its immediate neighbors
  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 0 && page <= totalPages) {
      includedPages.add(page);
    }
  }

  const sortedPages = Array.from(includedPages).sort((a, b) => a - b);

  const pageItems: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sortedPages.length; i += 1) {
    const page = sortedPages[i];
    const prevPage = sortedPages[i - 1];

    if (i > 0 && page - prevPage > 1) {
      pageItems.push("ellipsis");
    }

    pageItems.push(page);
  }

  return pageItems;
};

const Pagination: React.FC<PaginationProps> = (props) => {
  const {
    total,
    pageSize,
    currentPage,
    isLoading,
    onPageChange,
    basePath,
    rawCategory,
    staticParams,
    getHref,
  } = props;
  const safePageSize = pageSize > 0 ? pageSize : 1;
  const totalPages = Math.ceil(total / safePageSize);

  const buildHref = useMemo(() => {
    if (typeof getHref === "function") return getHref;

    if (basePath) {
      return (page: number) => {
        const params = new URLSearchParams();
        if (staticParams) {
          Object.entries(staticParams).forEach(([key, value]) => {
            if (typeof value === "string" && value.length > 0) {
              params.set(key, value);
            }
          });
        }
        if (page > 1) {
          params.set("page", String(page));
        }
        if (pageSize !== DEFAULT_PAGE_SIZE) {
          params.set("pageSize", String(pageSize));
        }
        if (rawCategory) {
          params.set("category", rawCategory);
        }
        const query = params.toString();
        return query ? `${basePath}?${query}` : basePath;
      };
    }

    return undefined;
  }, [basePath, getHref, pageSize, rawCategory, staticParams]);

  if (totalPages <= 1) {
    return null;
  }

  const pageItems = getPageItems(totalPages, currentPage);

  return (
    <nav aria-label="Pagination" className="mt-6 flex justify-center space-x-2">
      {pageItems.map((item, index) => {
        if (item === "ellipsis") {
          return (
            <span key={`ellipsis-${index}`} className="px-3 py-1 text-slate-500">
              …
            </span>
          );
        }

        const pageNum = item;
        const isActive = pageNum === currentPage;

        if (buildHref) {
          const href = buildHref(pageNum);

          const handleLinkClick = onPageChange
            ? (event: React.MouseEvent) => {
                event.preventDefault();
                if (!isActive && !isLoading) {
                  onPageChange(pageNum);
                }
              }
            : undefined;

          return (
            <Link
              key={pageNum}
              href={href}
              onClick={handleLinkClick}
              className={buttonClasses(isActive)}
              aria-current={isActive ? "page" : undefined}
            >
              {pageNum}
            </Link>
          );
        }

        return (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange?.(pageNum)}
            disabled={isActive || isLoading}
            className={buttonClasses(isActive)}
          >
            {pageNum}
          </button>
        );
      })}
    </nav>
  );
};

export { Pagination };
