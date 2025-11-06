// src/components/grants/pagination.tsx

"use client";

import Link from "next/link";
import React from "react";

interface PaginationBaseProps {
  total: number;
  pageSize: number;
  currentPage: number;
  isLoading?: boolean;
}

type PaginationLinkProps = PaginationBaseProps & {
  basePath: string;
  rawCategory?: string;
  onPageChange?: never;
};

type PaginationCallbackProps = PaginationBaseProps & {
  onPageChange: (page: number) => void;
  basePath?: never;
  rawCategory?: never;
};

type PaginationProps = PaginationLinkProps | PaginationCallbackProps;

const DEFAULT_PAGE_SIZE = 12;

const buttonClasses = (isActive: boolean) =>
  `px-3 py-1 border rounded ${
    isActive
      ? "bg-slate-900 text-white"
      : "bg-white text-slate-900 hover:bg-slate-100"
  }`;

const Pagination: React.FC<PaginationProps> = (props) => {
  const { total, pageSize, currentPage, isLoading } = props;
  const safePageSize = pageSize > 0 ? pageSize : 1;
  const totalPages = Math.ceil(total / safePageSize);

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  if ("onPageChange" in props) {
    const { onPageChange } = props;
    return (
      <nav aria-label="Pagination" className="mt-6 flex justify-center space-x-2">
        {pageNumbers.map((pageNum) => {
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              disabled={isActive || isLoading}
              className={buttonClasses(isActive)}
            >
              {pageNum}
            </button>
          );
        })}
      </nav>
    );
  }

  const { basePath, rawCategory } = props;

  const buildHref = (page: number) => {
    const params = new URLSearchParams();
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

  return (
    <nav aria-label="Pagination" className="mt-6 flex justify-center space-x-2">
      {pageNumbers.map((pageNum) => {
        const href = buildHref(pageNum);
        const isActive = pageNum === currentPage;
        return (
          <Link
            key={pageNum}
            href={href}
            className={buttonClasses(isActive)}
            aria-current={isActive ? "page" : undefined}
          >
            {pageNum}
          </Link>
        );
      })}
    </nav>
  );
};

export { Pagination };
